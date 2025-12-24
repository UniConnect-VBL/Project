import { supabase } from "../utils/supabase.js";
import {
  Job,
  Application,
  CreateJobRequest,
  ApplyJobRequest,
} from "@unihood/types";

export async function createJob(
  recruiterId: string,
  data: CreateJobRequest
): Promise<Job> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      recruiter_id: recruiterId,
      title: data.title,
      company_name: data.company_name,
      location: data.location,
      salary_range: data.salary_range,
      description: data.description,
      requirements: data.requirements,
      type: data.type,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  // Dispatch embedding job to worker
  const { redisClient, ensureRedis } = await import("../utils/redis.js");
  if (redisClient) {
    await ensureRedis();
    await redisClient.lPush(
      "recommendation",
      JSON.stringify({
        type: "job_embedding",
        job_id: job.id,
        content: `${data.title} ${data.description || ""} ${
          data.requirements || ""
        }`,
      })
    );
  }

  return job;
}

export async function getJobs(filters?: {
  schoolId?: string;
  search?: string;
  limit?: number;
}): Promise<Job[]> {
  if (!supabase) throw new Error("Supabase not configured");

  let query = supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  // TODO: Add AI search via embeddings if search query provided

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function applyToJob(
  applicantId: string,
  data: ApplyJobRequest
): Promise<Application> {
  if (!supabase) throw new Error("Supabase not configured");

  // Check if already applied
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", data.job_id)
    .eq("applicant_id", applicantId)
    .single();

  if (existing) {
    throw new Error("Already applied to this job");
  }

  // Create application
  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      job_id: data.job_id,
      applicant_id: applicantId,
      cv_url: data.cv_url,
      note: data.note,
      status: "applied",
    })
    .select()
    .single();

  if (error) throw error;

  // Increment application count
  await supabase.rpc("increment", {
    table_name: "jobs",
    column_name: "application_count",
    row_id: data.job_id,
    amount: 1,
  });

  return application;
}

export async function getApplicationsByJob(
  jobId: string
): Promise<Application[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getApplicationsByUser(
  userId: string
): Promise<Application[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
