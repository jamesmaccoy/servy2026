"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AuthProvider } from "@/components/auth";
import Link from "next/link";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

function InviteLandingContent({ params }: InvitePageProps) {
  const router = useRouter();
  const { token } = use(params);
  const { user, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<string>("Verifying invitation...");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (authLoading || isProcessing) return;

    if (!user) {
      // Redirect to login, setting current route as return target
      router.push(`/login?redirect=/i/${token}`);
      return;
    }

    const acceptInvite = async () => {
      setIsProcessing(true);
      setStatus("Processing invitation link...");

      try {
        let res = await fetch("/api/estimates/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            token, 
            userId: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split("@")[0] || "Guest"
          })
        });

        let result = await res.json();

        if (res.status === 404) {
          // If the token was not an estimate, try checking if it's a booking invite
          res = await fetch("/api/bookings/accept-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              token, 
              userId: user.uid,
              email: user.email,
              name: user.displayName || user.email?.split("@")[0] || "Guest"
            })
          });
          result = await res.json();

          if (!res.ok || !result.success) {
            throw new Error(result.error || "Failed to accept booking invitation.");
          }

          setStatus("✅ Booking invite accepted! Redirecting to your dashboard...");
          setTimeout(() => {
            router.push("/bookings");
          }, 1500);
          return;
        }

        if (!res.ok || !result.success) {
          throw new Error(result.error || "Failed to accept invite.");
        }

        setStatus("✅ Invite accepted! Redirecting to stay estimate...");
        setTimeout(() => {
          router.push(`/estimate/${result.estimateId}`);
        }, 1500);

      } catch (err: any) {
        setError(err.message || "An error occurred accepting this invitation.");
        setIsProcessing(false);
      }
    };

    acceptInvite();
  }, [user, authLoading, token, router, isProcessing]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 px-4 py-16 text-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md p-8 rounded-3xl border border-teal-100/10 bg-white/5 backdrop-blur-md text-center space-y-4">
        <span className="text-3xl block animate-bounce">✉</span>
        
        <h2 className="text-lg font-bold">Stay Invitation Link</h2>
        
        {error ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-400">
              ⚠️ {error}
            </div>
            <p className="text-[11px] text-zinc-400">
              This link might be invalid, expired, or you might already be registered.
            </p>
            <Link
              href="/"
              className="inline-block w-full rounded-xl bg-teal-500 py-2.5 text-xs font-bold text-white hover:bg-teal-600 transition-all"
            >
              Go to Home Page
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-teal-500 border-white/15" />
            <p className="text-xs text-zinc-300 font-medium">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage({ params }: InvitePageProps) {
  return (
    <AuthProvider>
      <InviteLandingContent params={params} />
    </AuthProvider>
  );
}
