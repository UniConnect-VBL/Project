# UniHood - Social Network for Vietnamese Students

UniHood là mạng xã hội niche kết hợp EdTech và giải trí dành riêng cho sinh viên Việt Nam, bắt đầu từ Đại học FPT và mở rộng multi-tenant toàn quốc.

## 🏗️ Kiến trúc hệ thống

### Tech Stack

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS
- **Backend API**: Express.js + TypeScript
- **Worker**: Node.js + Redis Queue + Gemini AI
- **Database**: Supabase (PostgreSQL + pgvector)
- **Cache/Queue**: Redis
- **Storage**: Cloudflare R2 (heavy files), Supabase Storage (light files)
- **AI**: Google Gemini 1.5 Flash (OCR, Moderation)

### Cấu trúc Monorepo

```
UniHood/
├── apps/
│   ├── api/          # Core API Service (Express)
│   ├── worker/       # Async Worker Service (AI jobs)
│   └── client/       # Frontend (Next.js)
├── packages/
│   ├── database/     # Database schema
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared configs
```

## 🚀 Tính năng chính

### 1. Social Feed

- Đăng post với visibility (public/school_only/friends/private)
- Lọc feed theo trường (multi-tenant)
- AI moderation tự động
- Premium: AI recommendations (pgvector)

### 2. Marketplace

- Mua/bán tài liệu/khóa học
- Escrow 3 ngày (ký quỹ an toàn)
- Dispute system (khiếu nại tranh chấp)
- Phí platform 10%

### 3. Streaming

- Live stream với YouTube embed
- Donate với phí 10%
- Realtime chat

### 4. Job Board

- Đăng job miễn phí (recruiter)
- Apply với CV upload
- AI matching (embeddings)

### 5. Events

- Tạo event và bán vé
- QR code check-in
- Phí platform 10%

### 6. Verification & Compliance

- OCR verification (Gemini) để assign school_id
- Consent logs (PDPD compliance)
- Audit logs cho admin actions
- Soft delete với partial indexes

### 7. Leaderboard

- Redis ZSET cho performance
- Trust score ranking theo trường

## 📊 Database Schema

Xem `packages/database/schema.sql` cho full schema với:

- Users, Schools, Posts, Materials, Streams, Jobs, Events, Tickets
- Transactions với escrow support
- Disputes, Consent_logs, Audit_logs
- pgvector embeddings cho AI recommendations
- Partial indexes cho soft delete

## 🔐 Security & Compliance

- **PDPD Compliance**: Consent logs cho mọi user action
- **Audit Trails**: Tất cả admin actions được log
- **Escrow System**: Bảo vệ buyer trong 3 ngày
- **Dispute Resolution**: Admin xử lý với audit log
- **Privacy Visibility**: SQL filter chặt chẽ cho posts

## 🛠️ Development

### Setup

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev:api      # API on :4000
pnpm dev:worker   # Worker service
pnpm dev:client   # Frontend on :3000
```

### Environment Variables

Xem `.env.example` files trong mỗi app folder.

### Database Migration

```bash
# Run schema.sql on Supabase
psql $DATABASE_URL < packages/database/schema.sql
```

## 📝 API Endpoints

### Auth

- `POST /auth/register` - Register với consent
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Social

- `POST /posts` - Create post
- `GET /feed` - Get feed (visibility filtered)
- `POST /likes` - Like post
- `POST /comments` - Comment

### Marketplace

- `POST /marketplace/materials` - Upload material
- `GET /marketplace` - List materials
- `POST /marketplace/purchase` - Buy (escrow)

### Disputes

- `POST /disputes` - Create dispute
- `GET /disputes` - My disputes

### Streams

- `POST /streams/create` - Create stream
- `GET /streams/live` - List live streams
- `POST /streams/donate` - Donate

### Jobs

- `POST /jobs` - Create job (recruiter)
- `GET /jobs` - List jobs
- `POST /jobs/apply` - Apply (student)

### Events

- `POST /events` - Create event
- `GET /events` - List events
- `POST /events/:id/ticket` - Buy ticket

### Admin

- `GET /admin/pending` - Pending content
- `PUT /admin/approve/:id` - Approve/reject
- `GET /admin/disputes` - Pending disputes
- `PUT /admin/resolve-dispute/:id` - Resolve dispute
- `GET /admin/audit-logs` - Audit logs

## 🔄 Worker Jobs

Worker xử lý async jobs từ Redis queue:

- `verification` - OCR verification (Gemini)
- `moderation` - Toxic content moderation (Gemini)
- `recommendation` - Generate embeddings (local/Xenova)
- `escrow_release` - Auto-release escrow after 3 days

## 📦 Deployment

- **Frontend**: Vercel (Free Tier)
- **API/Worker**: DigitalOcean VPS ($200 Credit)
- **Database**: Supabase
- **Storage**: Cloudflare R2
- **Queue**: Redis (DigitalOcean)

## 📄 License

Private project
