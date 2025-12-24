"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

/**
 * Protected Route Component
 * Wraps pages that require authentication
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({
  children,
  fallbackUrl = "/login",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Store intended destination for redirect after login
      const currentPath = window.location.pathname;
      router.push(`${fallbackUrl}?next=${encodeURIComponent(currentPath)}`);
    }
  }, [user, loading, router, fallbackUrl]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Authenticated - render children
  return <>{children}</>;
}

/**
 * HOC for protecting pages
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  fallbackUrl?: string
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute fallbackUrl={fallbackUrl}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
