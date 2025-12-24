"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface VerificationStatus {
  status: "unverified" | "pending" | "approved" | "rejected";
  student_code?: string;
  school?: { id: string; name: string; short_name?: string };
  submitted_at?: string;
  rejected_reason?: string;
}

export default function VerifyPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current verification status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login?next=/verify");
          return;
        }

        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
          }/verify/status`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setVerificationStatus(data);
        }
      } catch {
        console.error("Failed to fetch status");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [supabase, router]);

  // File validation
  const validateFile = useCallback((file: File): boolean => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setError("Chỉ chấp nhận file ảnh JPEG, PNG hoặc WEBP");
      return false;
    }
    if (file.size > maxSize) {
      setError("File quá lớn. Tối đa 5MB");
      return false;
    }
    return true;
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!validateFile(selectedFile)) return;

      setFile(selectedFile);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    },
    [validateFile]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      if (!validateFile(droppedFile)) return;

      setFile(droppedFile);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    },
    [validateFile]
  );

  // Upload and submit
  const handleSubmit = async () => {
    if (!file) {
      setError("Vui lòng chọn ảnh thẻ sinh viên");
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      // Step 1: Get presigned upload URL
      setProgress(20);
      const uploadUrlRes = await fetch(`${apiUrl}/verify/upload-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content_type: file.type }),
      });

      if (!uploadUrlRes.ok) {
        const err = await uploadUrlRes.json();
        throw new Error(err.error || "Không thể tạo link upload");
      }

      const { upload_url, file_key } = await uploadUrlRes.json();
      setProgress(40);

      // Step 2: Upload file to R2
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload ảnh thất bại");
      }
      setProgress(70);

      // Step 3: Submit verification proof
      const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN
        ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/${file_key}`
        : `${apiUrl}/files/${file_key}`; // Fallback

      const submitRes = await fetch(`${apiUrl}/verify/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: publicUrl }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.error || "Gửi xác thực thất bại");
      }

      setProgress(100);
      setVerificationStatus({ status: "pending" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/2" />
          <div className="h-64 bg-slate-700 rounded" />
        </div>
      </main>
    );
  }

  // Already verified
  if (verificationStatus?.status === "approved") {
    return (
      <main className="mx-auto max-w-lg p-6">
        <div className="rounded-2xl bg-slate-900 border border-green-500/30 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đã xác thực</h1>
          <p className="text-slate-400 mb-4">
            Tài khoản của bạn đã được xác thực thành công
          </p>
          {verificationStatus.student_code && (
            <div className="bg-slate-800 rounded-lg p-4 text-left">
              <p className="text-sm text-slate-400">MSSV</p>
              <p className="text-lg font-mono text-white">
                {verificationStatus.student_code}
              </p>
              {verificationStatus.school && (
                <>
                  <p className="text-sm text-slate-400 mt-2">Trường</p>
                  <p className="text-lg text-white">
                    {verificationStatus.school.name}
                  </p>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </main>
    );
  }

  // Pending verification
  if (verificationStatus?.status === "pending") {
    return (
      <main className="mx-auto max-w-lg p-6">
        <div className="rounded-2xl bg-slate-900 border border-yellow-500/30 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đang xác thực</h1>
          <p className="text-slate-400 mb-4">
            Hệ thống đang xử lý ảnh thẻ sinh viên của bạn. Vui lòng đợi vài
            phút...
          </p>
          <p className="text-sm text-slate-500">
            Bạn sẽ nhận được thông báo khi xác thực hoàn tất
          </p>
        </div>
      </main>
    );
  }

  // Rejected - allow retry
  const isRejected = verificationStatus?.status === "rejected";

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Xác thực sinh viên
        </h1>
        <p className="text-slate-400 mb-6">
          Upload ảnh thẻ sinh viên để xác thực tài khoản và mở khóa đầy đủ tính
          năng
        </p>

        {isRejected && verificationStatus.rejected_reason && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 font-medium">
              Xác thực không thành công
            </p>
            <p className="text-sm text-red-300 mt-1">
              {verificationStatus.rejected_reason}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Vui lòng upload lại ảnh rõ hơn
            </p>
          </div>
        )}

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            preview
              ? "border-blue-500 bg-blue-500/5"
              : "border-slate-600 hover:border-slate-500"
          }`}
        >
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="text-sm text-slate-400 hover:text-white"
              >
                Chọn ảnh khác
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-300">Kéo thả ảnh hoặc click để upload</p>
              <p className="text-sm text-slate-500">
                JPEG, PNG hoặc WEBP. Tối đa 5MB
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ position: "absolute", inset: 0 }}
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="mt-4">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-400 mt-2 text-center">
              {progress < 40
                ? "Đang tạo link upload..."
                : progress < 70
                ? "Đang upload ảnh..."
                : progress < 100
                ? "Đang gửi xác thực..."
                : "Hoàn tất!"}
            </p>
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {uploading ? "Đang xử lý..." : "Gửi xác thực"}
        </button>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Ảnh thẻ sinh viên sẽ được xóa sau 30 ngày theo chính sách bảo mật
        </p>
      </div>
    </main>
  );
}
