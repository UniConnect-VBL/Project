-- UniHood Database Schema - Full Implementation
-- Based on comprehensive blueprint with PDPD compliance

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists vector;
create extension if not exists unaccent; -- Rule 3: Vietnamese full-text search

-- Enums
create type visibility_type as enum ('public', 'school_only', 'friends', 'private');
create type user_role as enum ('student', 'teacher', 'recruiter', 'admin');
create type post_type as enum ('post', 'story', 'short');
create type material_type as enum ('document', 'course');
create type stream_status as enum ('live', 'ended');
create type transaction_type as enum ('purchase', 'donation', 'ticket_buy');
create type transaction_status as enum ('pending', 'escrow_hold', 'completed', 'failed', 'refunded');
create type dispute_status as enum ('pending', 'investigating', 'resolved_refund', 'resolved_reject');
create type ai_status_type as enum ('pending', 'approved', 'rejected');
create type application_status as enum ('applied', 'viewed', 'rejected', 'hired');
create type ticket_status as enum ('valid', 'used', 'refunded');

-- Schools table for multi-tenant support
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique,
  short_name varchar(100),
  logo_url varchar(500),
  total_trust_score integer default 0,
  created_at timestamptz default now()
);
create index if not exists schools_name_idx on schools (name);

-- Users/Profiles table (updated to match blueprint)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null,
  google_id varchar(255),
  password_hash varchar(255),
  full_name varchar(100),
  avatar_url varchar(500),
  bio text,
  role user_role default 'student' check (role in ('student', 'teacher', 'recruiter', 'admin')),
  university varchar(255),
  major varchar(255),
  school_id uuid references schools(id),
  student_code varchar(50),
  is_verified boolean default false,
  verification_status varchar(20) default 'unverified' check (verification_status in ('unverified', 'pending', 'approved', 'rejected')),
  trust_score integer default 0,
  wallet_balance decimal(15,2) default 0.00 check (wallet_balance >= 0),
  is_premium boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists idx_users_email_active on users (email) where deleted_at is null;
create unique index if not exists idx_users_google_id_active on users (google_id) where deleted_at is null;
create index if not exists idx_users_school_id on users (school_id) where deleted_at is null;
create index if not exists idx_users_role on users (role) where deleted_at is null;
create unique index if not exists idx_users_student_code_active on users (student_code) where deleted_at is null and student_code is not null;

-- Verification proofs table (PDPD compliant - delete after 30 days)
create table if not exists verification_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  image_url varchar(500) not null,
  extracted_data jsonb,
  status varchar(20) default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejected_reason text,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_verification_proofs_user_id on verification_proofs (user_id);
create index if not exists idx_verification_proofs_status on verification_proofs (status) where deleted_at is null;

-- Consent logs for PDPD compliance
create table if not exists consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  consent_type varchar(50) not null,
  version varchar(20) not null,
  consented_at timestamptz default now(),
  ip_address varchar(45),
  user_agent text,
  metadata jsonb
);
create index if not exists idx_consent_logs_user_id on consent_logs (user_id);
create index if not exists idx_consent_logs_consented_at on consent_logs (consented_at);

-- Audit logs for admin actions
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references users(id) on delete set null,
  action varchar(50) not null,
  target_id uuid,
  target_type varchar(20),
  metadata jsonb,
  ip_address varchar(45),
  created_at timestamptz default now()
);
create index if not exists idx_audit_logs_admin_id on audit_logs (admin_id);
create index if not exists idx_audit_logs_action on audit_logs (action);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at);
create index if not exists idx_audit_logs_target on audit_logs (target_id, target_type);

-- Posts table (updated with embedding, type, school_filter)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  content text,
  content_hash varchar(64), -- Rule 3: Anti-spam SHA256 hash
  type post_type default 'post' check (type in ('post', 'story', 'short')),
  school_filter varchar(255),
  privacy visibility_type default 'public' check (privacy in ('public', 'school_only', 'friends', 'private')),
  ai_status ai_status_type default 'pending' check (ai_status in ('pending', 'approved', 'rejected')),
  embedding vector(768),
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_posts_user_id on posts (user_id) where deleted_at is null;
create index if not exists idx_posts_school_filter on posts (school_filter) where deleted_at is null;
create index if not exists idx_posts_created_at on posts (created_at desc) where deleted_at is null;
create index if not exists idx_posts_ai_status on posts (ai_status) where deleted_at is null;
create index if not exists idx_posts_embedding on posts using hnsw (embedding vector_cosine_ops) where embedding is not null;

-- Post media table (separate for multiple media)
create table if not exists post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  url varchar(500) not null,
  type varchar(20) check (type in ('image', 'video')),
  "order" integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_post_media_post_id on post_media (post_id);

-- Likes table
create table if not exists likes (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
create index if not exists idx_likes_post_id on likes (post_id);

-- Comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  content text not null,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_comments_post_id on comments (post_id) where deleted_at is null;
create index if not exists idx_comments_user_id on comments (user_id) where deleted_at is null;

-- Materials table (marketplace - documents/courses)
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title varchar(255) not null,
  description text,
  content_hash varchar(64), -- Rule 3: Anti-spam SHA256 hash
  price decimal(12,2) default 0,
  type material_type check (type in ('document', 'course')),
  file_key varchar(500),
  thumbnail_url varchar(500),
  embedding vector(768),
  ai_status ai_status_type default 'pending' check (ai_status in ('pending', 'approved', 'rejected')),
  sales_count integer default 0,
  school_filter varchar(255),
  created_at timestamptz default now()
);
create index if not exists idx_materials_user_id on materials (user_id);
create index if not exists idx_materials_ai_status on materials (ai_status);
create index if not exists idx_materials_school_filter on materials (school_filter);
create index if not exists idx_materials_embedding on materials using hnsw (embedding vector_cosine_ops) where embedding is not null;

-- Streams table
create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title varchar(255) not null,
  stream_key varchar(100) unique,
  status stream_status default 'live' check (status in ('live', 'ended')),
  thumbnail_url varchar(500),
  record_url varchar(500),
  total_donations decimal(15,2) default 0,
  peak_viewers integer default 0,
  created_at timestamptz default now(),
  ended_at timestamptz
);
create index if not exists idx_streams_user_id on streams (user_id);
create index if not exists idx_streams_status on streams (status);

-- Transactions table (updated with escrow, disputes support)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references users(id),
  seller_id uuid references users(id),
  material_id uuid references materials(id),
  stream_id uuid references streams(id),
  ticket_id uuid references tickets(id),
  amount decimal(12,2) not null,
  platform_fee decimal(12,2) not null,
  net_amount decimal(12,2) not null,
  type transaction_type check (type in ('purchase', 'donation', 'ticket_buy')),
  status transaction_status default 'pending' check (status in ('pending', 'escrow_hold', 'completed', 'failed', 'refunded')),
  escrow_release_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_transactions_buyer_id on transactions (buyer_id);
create index if not exists idx_transactions_seller_id on transactions (seller_id);
create index if not exists idx_transactions_material_id on transactions (material_id);
create index if not exists idx_transactions_stream_id on transactions (stream_id);
create index if not exists idx_transactions_status on transactions (status);
create index if not exists idx_transactions_escrow_release_at on transactions (escrow_release_at) where status = 'escrow_hold';

-- Disputes table
create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id),
  reporter_id uuid references users(id),
  reason text not null,
  evidence_url varchar(500),
  status dispute_status default 'pending' check (status in ('pending', 'investigating', 'resolved_refund', 'resolved_reject')),
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_disputes_transaction_id on disputes (transaction_id);
create index if not exists idx_disputes_status on disputes (status);
create index if not exists idx_disputes_reporter_id on disputes (reporter_id);

-- Jobs table
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid references users(id),
  title varchar(255) not null,
  company_name varchar(255) not null,
  location varchar(255),
  salary_range varchar(100),
  description text,
  requirements text,
  type varchar(50),
  application_count integer default 0,
  embedding vector(768),
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_jobs_recruiter_id on jobs (recruiter_id);
create index if not exists idx_jobs_is_active on jobs (is_active) where is_active = true;
create index if not exists idx_jobs_embedding on jobs using hnsw (embedding vector_cosine_ops) where embedding is not null;

-- Applications table
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  applicant_id uuid references users(id),
  cv_url varchar(500),
  note text,
  status application_status default 'applied' check (status in ('applied', 'viewed', 'rejected', 'hired')),
  created_at timestamptz default now(),
  unique (job_id, applicant_id)
);
create index if not exists idx_applications_job_id on applications (job_id);
create index if not exists idx_applications_applicant_id on applications (applicant_id);

-- Events table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references users(id),
  title varchar(255) not null,
  description text,
  banner_url varchar(500),
  start_time timestamptz not null,
  location varchar(255),
  ticket_price decimal(12,2) default 0,
  max_capacity integer,
  sold_count integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_events_organizer_id on events (organizer_id);
create index if not exists idx_events_start_time on events (start_time);

-- Tickets table
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id),
  buyer_id uuid references users(id),
  qr_code varchar(255) unique,
  status ticket_status default 'valid' check (status in ('valid', 'used', 'refunded')),
  created_at timestamptz default now()
);
create index if not exists idx_tickets_event_id on tickets (event_id);
create index if not exists idx_tickets_buyer_id on tickets (buyer_id);

-- Relationships table (friends/following)
create table if not exists relationships (
  follower_id uuid references users(id) on delete cascade,
  following_id uuid references users(id) on delete cascade,
  status text default 'accepted',
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);
create index if not exists idx_relationships_follower_id on relationships (follower_id);
create index if not exists idx_relationships_following_id on relationships (following_id);

-- Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  type varchar(50) not null,
  title text,
  content text,
  metadata jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_id on notifications (user_id, is_read);
create index if not exists idx_notifications_created_at on notifications (created_at desc);

-- Reports table
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id),
  target_id uuid not null,
  target_type varchar(20) not null,
  reason text,
  status varchar(20) default 'pending',
  created_at timestamptz default now()
);
create index if not exists idx_reports_status on reports (status);
create index if not exists idx_reports_target on reports (target_id, target_type);

-- Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversation participants
create table if not exists conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

-- Messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_messages_conversation_id on messages (conversation_id, created_at desc) where deleted_at is null;
create index if not exists idx_messages_sender_id on messages (sender_id) where deleted_at is null;

-- Helper function to increment a column value
create or replace function increment(
  table_name text,
  column_name text,
  row_id uuid,
  amount int
) returns void as $$
declare
  sql text;
begin
  sql := format('update %I set %I = coalesce(%I, 0) + $1 where id = $2', table_name, column_name, column_name);
  execute sql using amount, row_id;
end;
$$ language plpgsql;

-- RPC function for atomic purchase with escrow
-- Rule 32: wallet_logs for double-entry bookkeeping
-- Rule 95: idempotency_key for duplicate prevention
create or replace function execute_purchase(
  p_material_id uuid,
  p_buyer_id uuid,
  p_idempotency_key varchar(100) default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material materials%rowtype;
  v_seller_id uuid;
  v_price decimal(12,2);
  v_platform_fee decimal(12,2);
  v_net_amount decimal(12,2);
  v_buyer_balance decimal(15,2);
  v_transaction_id uuid;
  v_escrow_release_at timestamptz;
  v_existing_log wallet_logs%rowtype;
begin
  -- Check idempotency key first
  if p_idempotency_key is not null then
    select * into v_existing_log
    from wallet_logs
    where idempotency_key = p_idempotency_key
    limit 1;
    
    if found then
      return jsonb_build_object(
        'success', false, 
        'error', 'DUPLICATE_REQUEST',
        'transaction_id', v_existing_log.transaction_id
      );
    end if;
  end if;

  -- 1. Lock and get material
  select * into v_material
  from materials
  where id = p_material_id
    and ai_status = 'approved'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Material not found or not approved');
  end if;

  v_seller_id := v_material.user_id;

  -- 2. Prevent self-purchase
  if v_seller_id = p_buyer_id then
    return jsonb_build_object('success', false, 'error', 'Cannot buy your own material');
  end if;

  -- Calculate amounts
  v_price := v_material.price;
  v_platform_fee := v_price * 0.10;
  v_net_amount := v_price - v_platform_fee;

  -- 3. Lock and check buyer wallet
  select wallet_balance into v_buyer_balance
  from users
  where id = p_buyer_id
  for update;

  if v_buyer_balance < v_price or v_buyer_balance is null then
    return jsonb_build_object('success', false, 'error', 'Insufficient balance');
  end if;

  -- 4. Deduct from buyer
  update users
  set wallet_balance = wallet_balance - v_price,
      updated_at = now()
  where id = p_buyer_id;

  -- 5. Create transaction with escrow
  v_transaction_id := gen_random_uuid();
  v_escrow_release_at := now() + interval '3 days';
  
  insert into transactions (
    id, buyer_id, seller_id, material_id,
    amount, platform_fee, net_amount,
    type, status, escrow_release_at
  ) values (
    v_transaction_id, p_buyer_id, v_seller_id, p_material_id,
    v_price, v_platform_fee, v_net_amount,
    'purchase', 'escrow_hold', v_escrow_release_at
  );

  -- 6. Insert wallet_log for buyer (Rule 32: Double-entry bookkeeping)
  insert into wallet_logs (
    user_id, action, amount, balance_before, balance_after,
    transaction_id, idempotency_key, metadata
  ) values (
    p_buyer_id, 'purchase', -v_price, v_buyer_balance, v_buyer_balance - v_price,
    v_transaction_id, p_idempotency_key, 
    jsonb_build_object('material_id', p_material_id, 'seller_id', v_seller_id)
  );

  -- 7. Update sales count
  update materials
  set sales_count = sales_count + 1
  where id = p_material_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount', v_price,
    'escrow_release_at', v_escrow_release_at
  );
  
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;


-- RPC function to resolve dispute
-- Rule 32: wallet_logs for double-entry bookkeeping
create or replace function resolve_dispute(
  p_dispute_id uuid,
  p_new_status dispute_status,
  p_resolved_by uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute disputes%rowtype;
  v_transaction transactions%rowtype;
  v_refund_amount decimal(12,2);
  v_current_balance decimal(15,2);
begin
  -- Get dispute
  select * into v_dispute
  from disputes
  where id = p_dispute_id
    and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Dispute not found or already resolved');
  end if;

  -- Get transaction
  select * into v_transaction
  from transactions
  where id = v_dispute.transaction_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Transaction not found');
  end if;

  -- Resolve based on status
  if p_new_status = 'resolved_refund' then
    -- Get buyer's current balance for wallet_log
    select wallet_balance into v_current_balance
    from users where id = v_transaction.buyer_id;
    
    -- Refund buyer
    v_refund_amount := v_transaction.amount;
    update users
    set wallet_balance = wallet_balance + v_refund_amount,
        updated_at = now()
    where id = v_transaction.buyer_id;

    -- Insert wallet_log for refund (Rule 32)
    insert into wallet_logs (
      user_id, action, amount, balance_before, balance_after,
      transaction_id, metadata
    ) values (
      v_transaction.buyer_id, 'refund', v_refund_amount, 
      v_current_balance, v_current_balance + v_refund_amount,
      v_transaction.id, 
      jsonb_build_object('dispute_id', p_dispute_id, 'resolved_by', p_resolved_by)
    );

    -- Update transaction
    update transactions
    set status = 'refunded'
    where id = v_transaction.id;
  else
    -- Get seller's current balance for wallet_log
    select wallet_balance into v_current_balance
    from users where id = v_transaction.seller_id;
    
    -- Release to seller
    update users
    set wallet_balance = wallet_balance + v_transaction.net_amount,
        updated_at = now()
    where id = v_transaction.seller_id;

    -- Insert wallet_log for release (Rule 32)
    insert into wallet_logs (
      user_id, action, amount, balance_before, balance_after,
      transaction_id, metadata
    ) values (
      v_transaction.seller_id, 'escrow_release', v_transaction.net_amount, 
      v_current_balance, v_current_balance + v_transaction.net_amount,
      v_transaction.id, 
      jsonb_build_object('dispute_id', p_dispute_id, 'resolved_by', p_resolved_by)
    );

    -- Update transaction
    update transactions
    set status = 'completed'
    where id = v_transaction.id;
  end if;

  -- Update dispute
  update disputes
  set status = p_new_status,
      resolved_by = p_resolved_by,
      resolved_at = now()
  where id = p_dispute_id;

  return jsonb_build_object('success', true, 'dispute_id', p_dispute_id);
  
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;


-- RPC function to release escrow (called by worker after 3 days)
-- Rule 32: wallet_logs for double-entry bookkeeping
create or replace function release_escrow(
  p_transaction_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction transactions%rowtype;
  v_dispute_count integer;
  v_seller_balance decimal(15,2);
begin
  -- Get transaction
  select * into v_transaction
  from transactions
  where id = p_transaction_id
    and status = 'escrow_hold'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Transaction not found or not in escrow');
  end if;

  -- Check if dispute exists
  select count(*) into v_dispute_count
  from disputes
  where transaction_id = p_transaction_id
    and status in ('pending', 'investigating');

  if v_dispute_count > 0 then
    return jsonb_build_object('success', false, 'error', 'Dispute pending, cannot release');
  end if;

  -- Get seller's current balance for wallet_log
  select wallet_balance into v_seller_balance
  from users where id = v_transaction.seller_id;

  -- Release to seller
  update users
  set wallet_balance = wallet_balance + v_transaction.net_amount,
      updated_at = now()
  where id = v_transaction.seller_id;

  -- Insert wallet_log for escrow release (Rule 32)
  insert into wallet_logs (
    user_id, action, amount, balance_before, balance_after,
    transaction_id, metadata
  ) values (
    v_transaction.seller_id, 'escrow_release', v_transaction.net_amount,
    v_seller_balance, v_seller_balance + v_transaction.net_amount,
    p_transaction_id, 
    jsonb_build_object('auto_release', true, 'buyer_id', v_transaction.buyer_id)
  );

  -- Update transaction
  update transactions
  set status = 'completed'
  where id = p_transaction_id;

  return jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
  
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- RPC function for atomic donation
-- Rule 32: wallet_logs for double-entry bookkeeping
create or replace function execute_donation(
  p_stream_id uuid,
  p_donor_id uuid,
  p_amount decimal(12,2),
  p_platform_fee decimal(12,2),
  p_net_amount decimal(12,2),
  p_idempotency_key varchar(100) default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stream streams%rowtype;
  v_streamer_id uuid;
  v_donor_balance decimal(15,2);
  v_streamer_balance decimal(15,2);
  v_transaction_id uuid;
  v_existing_log wallet_logs%rowtype;
begin
  -- Check idempotency key first
  if p_idempotency_key is not null then
    select * into v_existing_log
    from wallet_logs
    where idempotency_key = p_idempotency_key
    limit 1;
    
    if found then
      return jsonb_build_object(
        'success', false, 
        'error', 'DUPLICATE_REQUEST',
        'transaction_id', v_existing_log.transaction_id
      );
    end if;
  end if;

  -- Get stream
  select * into v_stream
  from streams
  where id = p_stream_id
    and status = 'live'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Stream not found or not live');
  end if;

  v_streamer_id := v_stream.user_id;

  -- Check donor balance
  select wallet_balance into v_donor_balance
  from users
  where id = p_donor_id
  for update;

  if v_donor_balance < p_amount or v_donor_balance is null then
    return jsonb_build_object('success', false, 'error', 'Insufficient balance');
  end if;

  -- Get streamer balance for wallet_log
  select wallet_balance into v_streamer_balance
  from users where id = v_streamer_id;

  -- Deduct from donor
  update users
  set wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  where id = p_donor_id;

  -- Add to streamer (net amount after fee)
  update users
  set wallet_balance = wallet_balance + p_net_amount,
      updated_at = now()
  where id = v_streamer_id;

  -- Create transaction
  v_transaction_id := gen_random_uuid();
  insert into transactions (
    id, buyer_id, seller_id, stream_id,
    amount, platform_fee, net_amount,
    type, status
  ) values (
    v_transaction_id, p_donor_id, v_streamer_id, p_stream_id,
    p_amount, p_platform_fee, p_net_amount,
    'donation', 'completed'
  );

  -- Insert wallet_log for donor (Rule 32)
  insert into wallet_logs (
    user_id, action, amount, balance_before, balance_after,
    transaction_id, idempotency_key, metadata
  ) values (
    p_donor_id, 'donation', -p_amount, v_donor_balance, v_donor_balance - p_amount,
    v_transaction_id, p_idempotency_key, 
    jsonb_build_object('stream_id', p_stream_id, 'streamer_id', v_streamer_id)
  );

  -- Insert wallet_log for streamer (Rule 32)
  insert into wallet_logs (
    user_id, action, amount, balance_before, balance_after,
    transaction_id, metadata
  ) values (
    v_streamer_id, 'donation_received', p_net_amount, 
    v_streamer_balance, v_streamer_balance + p_net_amount,
    v_transaction_id, 
    jsonb_build_object('stream_id', p_stream_id, 'donor_id', p_donor_id)
  );

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id
  );
  
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;


-- RPC function for atomic ticket purchase
-- Rule 32: wallet_logs for double-entry bookkeeping
create or replace function execute_ticket_purchase(
  p_event_id uuid,
  p_buyer_id uuid,
  p_amount decimal(12,2),
  p_platform_fee decimal(12,2),
  p_net_amount decimal(12,2),
  p_idempotency_key varchar(100) default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_organizer_id uuid;
  v_buyer_balance decimal(15,2);
  v_organizer_balance decimal(15,2);
  v_transaction_id uuid;
  v_existing_log wallet_logs%rowtype;
begin
  -- Check idempotency key first
  if p_idempotency_key is not null then
    select * into v_existing_log
    from wallet_logs
    where idempotency_key = p_idempotency_key
    limit 1;
    
    if found then
      return jsonb_build_object(
        'success', false, 
        'error', 'DUPLICATE_REQUEST',
        'transaction_id', v_existing_log.transaction_id
      );
    end if;
  end if;

  -- Get event
  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Event not found');
  end if;

  -- Check capacity
  if v_event.max_capacity is not null and v_event.sold_count >= v_event.max_capacity then
    return jsonb_build_object('success', false, 'error', 'Event is full');
  end if;

  v_organizer_id := v_event.organizer_id;

  -- Check buyer balance
  select wallet_balance into v_buyer_balance
  from users
  where id = p_buyer_id
  for update;

  if v_buyer_balance < p_amount or v_buyer_balance is null then
    return jsonb_build_object('success', false, 'error', 'Insufficient balance');
  end if;

  -- Get organizer balance for wallet_log
  select wallet_balance into v_organizer_balance
  from users where id = v_organizer_id;

  -- Deduct from buyer
  update users
  set wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  where id = p_buyer_id;

  -- Add to organizer (net amount after fee)
  update users
  set wallet_balance = wallet_balance + p_net_amount,
      updated_at = now()
  where id = v_organizer_id;

  -- Create transaction
  v_transaction_id := gen_random_uuid();
  insert into transactions (
    id, buyer_id, seller_id, ticket_id,
    amount, platform_fee, net_amount,
    type, status
  ) values (
    v_transaction_id, p_buyer_id, v_organizer_id, null,
    p_amount, p_platform_fee, p_net_amount,
    'ticket_buy', 'completed'
  );

  -- Insert wallet_log for buyer (Rule 32)
  insert into wallet_logs (
    user_id, action, amount, balance_before, balance_after,
    transaction_id, idempotency_key, metadata
  ) values (
    p_buyer_id, 'ticket_purchase', -p_amount, v_buyer_balance, v_buyer_balance - p_amount,
    v_transaction_id, p_idempotency_key, 
    jsonb_build_object('event_id', p_event_id, 'organizer_id', v_organizer_id)
  );

  -- Insert wallet_log for organizer (Rule 32)
  insert into wallet_logs (
    user_id, action, amount, balance_before, balance_after,
    transaction_id, metadata
  ) values (
    v_organizer_id, 'ticket_sale', p_net_amount, 
    v_organizer_balance, v_organizer_balance + p_net_amount,
    v_transaction_id, 
    jsonb_build_object('event_id', p_event_id, 'buyer_id', p_buyer_id)
  );

  -- Update event sold count
  update events
  set sold_count = coalesce(sold_count, 0) + 1
  where id = p_event_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id
  );
  
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;


-- ============================================================================
-- RULE 3: WALLET LOGS TABLE (Double-Entry Bookkeeping)
-- Every wallet balance mutation MUST insert a corresponding record
-- ============================================================================
create table if not exists wallet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  action varchar(50) not null, -- 'deposit', 'purchase', 'refund', 'escrow_hold', 'escrow_release', 'donation'
  amount decimal(15,2) not null,
  balance_before decimal(15,2) not null,
  balance_after decimal(15,2) not null,
  transaction_id uuid references transactions(id),
  idempotency_key varchar(100), -- For duplicate prevention
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_wallet_logs_user_id on wallet_logs (user_id);
create index if not exists idx_wallet_logs_created_at on wallet_logs (created_at);
create unique index if not exists idx_wallet_logs_idempotency on wallet_logs (idempotency_key) where idempotency_key is not null;

-- ============================================================================
-- RULE 3: CONTENT HASH INDEXES (Anti-Spam)
-- ============================================================================
create unique index if not exists idx_posts_content_hash 
  on posts (content_hash) where deleted_at is null and content_hash is not null;

create unique index if not exists idx_materials_content_hash 
  on materials (content_hash) where content_hash is not null;

-- ============================================================================
-- RULE 3: VIETNAMESE SEARCH INDEXES (unaccent + lower)
-- ============================================================================
create index if not exists idx_users_fullname_search 
  on users using gin (lower(unaccent(full_name)) gin_trgm_ops) where deleted_at is null;

create index if not exists idx_posts_content_search 
  on posts using gin (lower(unaccent(content)) gin_trgm_ops) where deleted_at is null;

create index if not exists idx_materials_title_search 
  on materials using gin (lower(unaccent(title)) gin_trgm_ops);

-- ============================================================================
-- RULE 3: RECONCILIATION FUNCTION (Nightly Audit)
-- Verifies wallet balance matches wallet_logs history
-- ============================================================================
create or replace function reconcile_wallets()
returns table(
  user_id uuid,
  current_balance decimal(15,2),
  calculated_balance decimal(15,2),
  discrepancy decimal(15,2)
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with latest_log as (
    select distinct on (wl.user_id)
      wl.user_id,
      wl.balance_after as calc_balance
    from wallet_logs wl
    order by wl.user_id, wl.created_at desc
  )
  select 
    u.id as user_id,
    u.wallet_balance as current_balance,
    coalesce(ll.calc_balance, 0.00) as calculated_balance,
    u.wallet_balance - coalesce(ll.calc_balance, 0.00) as discrepancy
  from users u
  left join latest_log ll on ll.user_id = u.id
  where u.deleted_at is null
    and u.wallet_balance != coalesce(ll.calc_balance, 0.00);
end;
$$;

-- ============================================================================
-- IDEMPOTENCY TABLE (For Marketplace & Payment)
-- ============================================================================
create table if not exists idempotency_keys (
  key varchar(100) primary key,
  user_id uuid references users(id) on delete cascade,
  endpoint varchar(255) not null,
  response_code integer,
  response_body jsonb,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);
create index if not exists idx_idempotency_expires on idempotency_keys (expires_at);

-- ============================================================================
-- RULE 61: DEAD LETTER QUEUE (DLQ) TABLE
-- Failed jobs after 5 retries MUST be moved to DLQ for manual admin inspection
-- ============================================================================
create table if not exists dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  queue_name varchar(50) not null, -- 'verification', 'moderation', 'recommendation', 'escrow_release'
  payload jsonb not null,
  error_message text,
  retry_count integer default 0,
  created_at timestamptz default now(),
  last_error_at timestamptz default now()
);
create index if not exists idx_dlq_queue_name on dead_letter_queue (queue_name);
create index if not exists idx_dlq_created_at on dead_letter_queue (created_at);

-- ============================================================================
-- RULE 94: NUKE REQUESTS TABLE (PDPD Compliance)
-- Users can request hard deletion of all their data
-- ============================================================================
create table if not exists nuke_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  reason text,
  status varchar(20) default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  processed_by uuid references users(id),
  processed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_nuke_requests_user on nuke_requests (user_id);
create index if not exists idx_nuke_requests_status on nuke_requests (status);

