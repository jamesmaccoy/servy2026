"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, AuthProvider } from "@/components/auth";

function SubscribeContent() {
  const { user, loading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubscribe = async (plan: "standard" | "pro") => {
    if (!user) {
      setStatusMessage({ type: "error", text: "Please sign in or sign up to subscribe." });
      return;
    }

    setIsRedirecting(true);
    setStatusMessage(null);

    try {
      const amountInCents = plan === "standard" ? 15000 : 29900;
      const res = await fetch("/api/subscribe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          plan,
          amountInCents
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to create checkout transaction.");
      }

      // Redirect to Yoco Checkout page
      window.location.href = result.redirectUrl;
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: err.message || "An error occurred." });
      setIsRedirecting(false);
    }
  };

  // Developer Bypass to become Pro instantly (in mock mode or development)
  const handleMockBypass = async (plan: "standard" | "pro") => {
    if (!user) return;
    setIsRedirecting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/subscribe/mock-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, plan })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setStatusMessage({ type: "success", text: `Success! Promoted to ${plan === 'standard' ? 'Standard Pro' : 'Professional Portfolio Manager'}. Reloading session...` });
        setTimeout(() => {
          window.location.href = "/admin/properties";
        }, 1500);
      } else {
        throw new Error(result.error || "Mock promotion failed");
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Bypass failed" });
      setIsRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-teal-500 border-white/10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-16 text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400 leading-tight">
            Become a Pro
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-lg mx-auto">
            Choose a plan, unlock listing capabilities, and manage high-resolution imagery.
          </p>
        </header>

        {statusMessage && (
          <div
            className={`max-w-md mx-auto mb-8 rounded-xl border p-3.5 text-center text-xs font-bold ${statusMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
          >
            {statusMessage.text}
          </div>
        )}

        {user && user.isAdmin ? (
          <div className="max-w-md mx-auto rounded-3xl border border-teal-500/20 bg-teal-500/5 p-8 text-center backdrop-blur-md">
            <span className="text-5xl block mb-4">🎉</span>
            <h2 className="text-xl font-black text-white">You are a Pro User!</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Your account has listing management and image upload and sharing. Go to the Pro Portal to create and publish stays.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/admin/properties"
                className="w-full rounded-xl bg-teal-500 py-3 text-center text-xs font-bold text-white hover:bg-teal-600 transition-all shadow-md shadow-teal-500/10"
              >
                Go to Pro Dashboard
              </Link>
              <Link
                href="/"
                className="w-full rounded-xl bg-white/5 border border-white/10 py-3 text-center text-xs font-bold text-zinc-300 hover:text-white transition-all"
              >
                Storefront Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
              {/* Standard Host */}
              <div className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md relative hover:border-white/20 transition-all">
                <div className="mb-6">
                  <span className="rounded bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                    Standard
                  </span>
                  <h3 className="text-xl font-bold text-white mt-3">Storefront Pro</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-black text-white">R 150</span>
                    <span className="text-xs text-zinc-550 ml-1">/ month</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">Perfect for individual homeowners looking to list stays.</p>
                </div>
                <div className="border-t border-white/5 pt-6 flex-grow">
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> List up to 3 properties
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> High-resolution image uploads and sharing
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> Airbnb / Google Calendar sync
                    </li>
                  </ul>
                </div>
                <div className="mt-8 border-t border-white/5 pt-6">
                  {user ? (
                    <button
                      onClick={() => handleSubscribe("standard")}
                      disabled={isRedirecting}
                      className="w-full rounded-xl bg-teal-500 py-3 text-center text-xs font-bold text-white hover:bg-teal-600 transition-all shadow-md shadow-teal-500/10 active:scale-95"
                    >
                      {isRedirecting ? "Connecting..." : "Subscribe Now"}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="block w-full rounded-xl bg-white/5 border border-white/10 py-3 text-center text-xs font-bold text-zinc-300 hover:text-white transition-all"
                    >
                      Sign In to Subscribe
                    </Link>
                  )}
                </div>
              </div>

              {/* Pro Host */}
              <div className="flex flex-col rounded-3xl border border-teal-550/40 bg-teal-500/5 p-8 backdrop-blur-md relative hover:border-teal-500/30 transition-all">
                <div className="absolute top-4 right-4 rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-[8px] font-bold text-teal-400 uppercase tracking-widest">
                  Popular
                </div>
                <div className="mb-6">
                  <span className="rounded bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold text-teal-300 uppercase tracking-wide">
                    Professional
                  </span>
                  <h3 className="text-xl font-bold text-white mt-3">Portfolio Manager</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-black text-white">R 299</span>
                    <span className="text-xs text-zinc-550 ml-1">/ month</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">Designed for rental portfolios and property managers.</p>
                </div>
                <div className="border-t border-white/5 pt-6 flex-grow">
                  <ul className="space-y-3 text-xs text-zinc-300">
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> List unlimited properties
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> High-resolution image uploads and sharing
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> Airbnb / Google Calendar sync
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-teal-400">✓</span> Exclusive package for development and payment options
                    </li>
                  </ul>
                </div>
                <div className="mt-8 border-t border-white/5 pt-6">
                  {user ? (
                    <button
                      onClick={() => handleSubscribe("pro")}
                      disabled={isRedirecting}
                      className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 text-center text-xs font-bold text-white hover:brightness-110 transition-all shadow-md shadow-teal-500/10 active:scale-95"
                    >
                      {isRedirecting ? "Connecting..." : "Subscribe Now"}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="block w-full rounded-xl bg-white/5 border border-white/10 py-3 text-center text-xs font-bold text-zinc-300 hover:text-white transition-all"
                    >
                      Sign In to Subscribe
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Local Developer Bypass block */}
            {process.env.NODE_ENV !== 'production' && user && (
              <div className="max-w-md mx-auto rounded-2xl border border-white/5 bg-white/5 p-6 text-center">
                <span className="text-xs text-zinc-500 block font-bold tracking-wider uppercase mb-3">🛠 Local Dev Control</span>
                <p className="text-[10px] text-zinc-400 leading-normal mb-4">
                  For testing, you can bypass the checkout gateway and upgrade this account instantly.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleMockBypass("standard")}
                    disabled={isRedirecting}
                    className="flex-1 rounded-xl border border-teal-500/30 bg-teal-550/10 hover:bg-teal-500/20 px-4 py-2.5 text-xs font-bold text-teal-400 hover:text-white transition-all active:scale-95"
                  >
                    Bypass as Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMockBypass("pro")}
                    disabled={isRedirecting}
                    className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all active:scale-95"
                  >
                    Bypass as Pro
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <AuthProvider>
      <SubscribeContent />
    </AuthProvider>
  );
}
