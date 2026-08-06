"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth";

interface Property {
  id: string;
  title: string;
  location?: string;
  images?: string[];
  basePricePerNight: number;
}

interface Package {
  id: string;
  propertyId: string;
  name: string;
  price: number;
  description: string;
  multiplier: number;
  baseRate: number;
  yocoId: string;
  category: string;
  isEnabled: boolean;
}

function PackageEditorContent({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPropertyId = searchParams.get("propertyId") || "";

  const isNew = id === "new";

  const [properties, setProperties] = useState<Property[]>([]);
  const [userPlan, setUserPlan] = useState<string>("standard");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields
  const [propertyId, setPropertyId] = useState("");
  const [pkgId, setPkgId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [multiplier, setMultiplier] = useState("1.0");
  const [baseRate, setBaseRate] = useState("0");
  const [yocoId, setYocoId] = useState("");
  const [category, setCategory] = useState("standard");
  const [isEnabled, setIsEnabled] = useState(true);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Load properties and user subscription status
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        // 1. Fetch properties owned by the host
        const propsRes = await fetch(`/api/posts?hostId=${user.uid}`);
        const propsResult = await propsRes.json();
        if (propsResult.success && propsResult.data) {
          setProperties(propsResult.data);
          // Set initial property selection
          if (isNew) {
            if (targetPropertyId && propsResult.data.some((p: Property) => p.id === targetPropertyId)) {
              setPropertyId(targetPropertyId);
            } else if (propsResult.data.length > 0) {
              setPropertyId(propsResult.data[0].id);
            }
          }
        }

        // 2. Fetch user profile plan
        const profileRes = await fetch(`/api/user/profile?userId=${user.uid}&email=${user.email || ""}`);
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          setUserPlan(profileResult.data.plan || "standard");
        }

        // 3. If editing, fetch package details
        if (!isNew) {
          const pkgRes = await fetch(`/api/packages/${id}`);
          const pkgResult = await pkgRes.json();
          if (pkgResult.success && pkgResult.data) {
            const pkg: Package = pkgResult.data;
            setPropertyId(pkg.propertyId);
            setPkgId(pkg.id);
            setName(pkg.name);
            setPrice(String(pkg.price));
            setDescription(pkg.description || "");
            setMultiplier(String(pkg.multiplier));
            setBaseRate(String(pkg.baseRate));
            setYocoId(pkg.yocoId || "");
            setCategory(pkg.category || "standard");
            setIsEnabled(pkg.isEnabled !== false);
          } else {
            setStatusMessage({ type: "error", text: "Package not found." });
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load package editor data:", err);
        setStatusMessage({ type: "error", text: "An error occurred while fetching details." });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, id, isNew, targetPropertyId]);

  // Auto-generate ID from name when creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (isNew) {
      setPkgId(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "_")
          .replace(/__+/g, "_")
          .trim()
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !name || !price || !pkgId) {
      setStatusMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    // Front-end check for category entitlement
    if (userPlan === "standard" && category !== "standard") {
      setStatusMessage({
        type: "error",
        text: "Category entitlement restricted: Standard plan hosts can only create packages in the 'Standard' category. Upgrade to Professional to unlock Hosted, Add-on, and Special packages.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({
          id: pkgId,
          propertyId,
          name,
          price: Number(price),
          description,
          multiplier: Number(multiplier),
          baseRate: Number(baseRate),
          yocoId: yocoId || pkgId,
          category,
          isEnabled,
        }),
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.data || resJson.error || "Failed to save package deal.");
      }

      setStatusMessage({
        type: "success",
        text: isNew ? "Package deal created successfully!" : "Package deal updated successfully!",
      });

      setTimeout(() => {
        router.push("/admin/packages");
      }, 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: "error", text: error.message || "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this package deal?")) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.uid || "",
          "x-user-email": user?.email || "",
        },
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to delete package.");
      }

      setStatusMessage({ type: "success", text: "Package deleted successfully!" });
      setTimeout(() => {
        router.push("/admin/packages");
      }, 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: "error", text: error.message || "An error occurred." });
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-teal-500 border-teal-500/20" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center shadow-sm backdrop-blur-md">
          <span className="text-4xl">🔐</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-4">Access Denied</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Administrative privileges are required to edit packages.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/packages"
              className="block w-full rounded-xl bg-teal-500 py-3 text-center text-xs font-bold text-white hover:bg-teal-600 transition-all shadow-md shadow-teal-500/10"
            >
              Back to Packages
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white font-sans selection:bg-teal-500/30 selection:text-teal-600 transition-colors duration-200">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <Link href="/admin/packages" className="text-xs text-slate-550 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-2 inline-block">
              ← Back to Packages
            </Link>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400">
              {isNew ? "Create Package Deal" : "Edit Package Deal"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Configure unique stay packages and pricing overrides</p>
          </div>
          <span className="rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
            {isNew ? "✙ New Deal" : `ID: ${pkgId}`}
          </span>
        </header>

        {userPlan === "standard" && (
          <div className="mb-6 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 flex items-start gap-3">
            <span className="text-lg">⭐</span>
            <div className="text-xs leading-relaxed text-teal-700 dark:text-teal-300">
              <strong className="block font-bold">Standard Host Subscription Plan</strong>
              You are currently on the Standard plan, which lets you create standard package deals. Upgrade to <Link href="/subscribe" className="underline font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500">Professional</Link> to unlock premium package categories (Hosted, Add-on, and Special category deals).
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span>⚙</span> Package Details Configuration
          </h2>

          {statusMessage && (
            <div
              className={`mb-6 rounded-xl border p-3.5 text-center text-xs font-bold ${
                statusMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Property Display (Read-Only) */}
            {selectedProperty ? (
              <div className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-550 uppercase tracking-wide block font-bold">Parent Property Listing</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedProperty.title}</span>
                </div>
                <span className="text-xs font-semibold text-teal-650 dark:text-teal-400">
                  Base Price: R {selectedProperty.basePricePerNight.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="text-xs text-red-500 dark:text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl p-3">
                No active property selected. Go back to <Link href="/admin/packages" className="underline font-bold">Packages Dashboard</Link> to choose a property first.
              </div>
            )}

            {/* Package Name & Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extended Shack Stay"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Document ID / Key *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. extended_shack_stay"
                  value={pkgId}
                  onChange={(e) => setPkgId(e.target.value)}
                  disabled={!isNew}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Price, Category, Yoco ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Price (ZAR) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 7500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                >
                  <option value="standard" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Standard</option>
                  <option 
                    value="hosted" 
                    disabled={userPlan === "standard"} 
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    Hosted {userPlan === "standard" ? "🔒 (Pro)" : ""}
                  </option>
                  <option 
                    value="addon" 
                    disabled={userPlan === "standard"} 
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    Add-on {userPlan === "standard" ? "🔒 (Pro)" : ""}
                  </option>
                  <option 
                    value="special" 
                    disabled={userPlan === "standard"} 
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white disabled:opacity-50"
                  >
                    Special {userPlan === "standard" ? "🔒 (Pro)" : ""}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Yoco Product ID
                </label>
                <input
                  type="text"
                  placeholder="Defaults to Key"
                  value={yocoId}
                  onChange={(e) => setYocoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Rate Multiplier & Base Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-slate-500 dark:text-zinc-400 font-semibold tracking-wide">
                  Rate Multiplier (0.1 - 3.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-550 dark:text-zinc-400 font-semibold tracking-wide">
                  Flat Base Rate (ZAR)
                </label>
                <input
                  type="number"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs text-slate-550 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Write detail on what is included, guest counts, meals, guided walks, etc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 resize-y"
              />
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3.5 rounded-xl">
              <input
                type="checkbox"
                id="isEnabled"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="isEnabled" className="text-xs font-bold text-slate-700 dark:text-zinc-300 select-none cursor-pointer">
                This package deal is active & available for guests to book
              </label>
            </div>

            {/* Form actions */}
            <div className="flex gap-4 pt-3 border-t border-slate-200 dark:border-white/5">
              <button
                type="submit"
                disabled={isSubmitting || properties.length === 0}
                className="flex-grow rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 text-center text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? isNew
                    ? "Publishing Package..."
                    : "Saving Changes..."
                  : isNew
                    ? "Publish Package Deal"
                    : "Save Package Changes"}
              </button>
              
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-center text-xs font-bold text-red-650 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PackageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-teal-500 border-teal-500/20" />
      </div>
    }>
      <PackageEditorContent id={unwrappedParams.id} />
    </Suspense>
  );
}
