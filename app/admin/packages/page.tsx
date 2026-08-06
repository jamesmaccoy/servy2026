"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectPackagesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/properties");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-teal-500 border-teal-500/20" />
    </div>
  );
}