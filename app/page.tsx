"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth";
import Link from "next/link";
import { formatDisplayDate } from "@/lib/utils";
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  HouseIcon,
  ImageOffIcon,
  LockIcon,
  PinIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  hostId?: string;
  images?: string[];
  description?: string;
  bookingType?: string;
  slots?: string[];
}

/** Renders a saved date/time in the compact 24h form used across the schedule UI. */
function formatSlotTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function HomePageContent() {
  const searchParams = useSearchParams();

  const paymentStatus = searchParams.get("payment");
  const amountPaid = searchParams.get("amount");
  const bookingId = searchParams.get("bookingId");
  const estimateId = searchParams.get("estimateId");

  const { user, loading: authLoading } = useAuth();

  // Subdomain & Host Profile States
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    
    let sub: string | null = null;
    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
      if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "www") {
        sub = parts[0];
      }
    } else if (parts.length > 2 && parts[0] !== "www") {
      sub = parts[0];
    }
    
    if (sub) {
      setSubdomain(sub);
      fetch(`/api/host/profile?subdomain=${sub}`)
        .then(res => res.json())
        .then(resJson => {
          if (resJson.success) {
            setHostProfile(resJson.data);
          }
        })
        .catch(err => console.error("Failed to fetch host profile:", err));
    }
  }, []);

  // Portal States
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);

  // Date Selection
  const [fromDate, setFromDate] = useState("2026-06-16");
  const [toDate, setToDate] = useState("2026-06-19");
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [savedDates, setSavedDates] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nights, setNights] = useState<number>(3);
  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);
  const [latestEstimate, setLatestEstimate] = useState<any | null>(null);
  const [estimatePropertyTitle, setEstimatePropertyTitle] = useState("");
  const [copiedEstimateUrl, setCopiedEstimateUrl] = useState(false);

  // Client-side payment status fallback
  useEffect(() => {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const intent = searchParams.get("intent");
    const paymentUserId = searchParams.get("userId") || (user ? user.uid : null);

    const isSubscriptionSuccess =
      paymentStatus === "success" &&
      (intent === "subscription" || (!bookingId && !estimateId && isLocalhost && user));

    if ((!bookingId && !estimateId && !isSubscriptionSuccess) || !paymentStatus || hasUpdatedStatus)
      return;

    const updateStatus = async () => {
      setHasUpdatedStatus(true);
      try {
        if (isSubscriptionSuccess && paymentUserId) {
          const res = await fetch("/api/subscribe/mock-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: paymentUserId }),
          });
          const result = await res.json();
          if (result.success) {
            const localSession = localStorage.getItem("auth:mock_session");
            if (localSession) {
              const session = JSON.parse(localSession);
              if (session.uid === paymentUserId) {
                session.isAdmin = true;
                localStorage.setItem("auth:mock_session", JSON.stringify(session));
              }
            }
            window.location.href = "/admin/properties";
          }
          return;
        }

        let statusToSet = "pending";
        if (paymentStatus === "success") {
          statusToSet = "paid";
        } else if (paymentStatus === "failed") {
          statusToSet = "failed";
        } else if (paymentStatus === "cancel") {
          statusToSet = "cancelled";
        }

        if (estimateId && statusToSet === "paid") {
          await fetch("/api/bookings/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              estimateId,
              paymentStatus: "paid",
              customerId: user?.uid,
              customerEmail: user?.email,
              customerName: user?.displayName || user?.email?.split("@")[0] || "Guest"
            }),
          });
        } else if (bookingId) {
          await fetch("/api/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, paymentStatus: statusToSet }),
          });
        }
      } catch (err) {
        console.error("Failed to sync booking/estimate status client-side fallback:", err);
      }
    };

    if (!authLoading) {
      updateStatus();
    }
  }, [bookingId, estimateId, paymentStatus, hasUpdatedStatus, user, authLoading, searchParams]);

  // Load properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const queryHostId = params.get("hostId");

        let url = "/api/posts";
        if (subdomain) {
          url = `/api/posts?subdomain=${subdomain}`;
        } else if (queryHostId) {
          url = `/api/posts?hostId=${queryHostId}`;
        }

        const res = await fetch(url);
        const result = await res.json();
        if (result.success && result.data) {
          setProperties(result.data);
        }
      } catch (err) {
        console.error("Failed to load properties:", err);
      } finally {
        setIsLoadingProps(false);
      }
    };
    if (!authLoading) {
      fetchProperties();
    }
  }, [user, authLoading, subdomain]);

  // Load saved user dates
  useEffect(() => {
    if (authLoading || !user) {
      setSavedDates(null);
      return;
    }

    const fetchSavedDates = async () => {
      try {
        const res = await fetch(`/api/user/dates?userId=${user.uid}`);
        const result = await res.json();
        if (result.success && result.data) {
          setSavedDates(result.data);
          const startStr = result.data.fromDate.split("T")[0];
          const endStr = result.data.toDate.split("T")[0];
          setFromDate(startStr);
          setToDate(endStr);

          const start = new Date(startStr);
          const end = new Date(endStr);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            setNights(diff);
          }
        }
      } catch (err) {
        console.error("Failed to fetch saved user dates:", err);
      }
    };
    fetchSavedDates();
  }, [user, authLoading]);

  // Load latest estimate
  useEffect(() => {
    if (!user) {
      setLatestEstimate(null);
      return;
    }

    const fetchLatestEstimate = async () => {
      try {
        const res = await fetch(`/api/estimates/latest?userId=${user.uid}`);
        const result = await res.json();
        if (result.success && result.data) {
          setLatestEstimate(result.data);
          try {
            const propRes = await fetch(`/api/posts/${result.data.propertyId}`);
            const propResult = await propRes.json();
            if (propResult.success && propResult.data) {
              setEstimatePropertyTitle(propResult.data.title || propResult.data.name || "");
            }
          } catch (propErr) {
            console.error("Failed to fetch estimate property details:", propErr);
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest estimate:", err);
      }
    };
    fetchLatestEstimate();
  }, [user]);

  const isHourlySaved = !!(savedDates && savedDates.fromDate.split("T")[0] === savedDates.toDate.split("T")[0]);

  const handleSaveDates = async () => {
    setSaveError(null);

    if (!user) {
      setSaveError("Please sign in or register to save your stay dates.");
      return;
    }

    let start: Date;
    let end: Date;

    if (isHourlySaved && savedDates) {
      const oldFrom = new Date(savedDates.fromDate);
      const oldTo = new Date(savedDates.toDate);
      start = new Date(`${fromDate}T00:00:00`);
      start.setHours(oldFrom.getHours(), oldFrom.getMinutes(), 0, 0);

      end = new Date(`${fromDate}T00:00:00`);
      end.setHours(oldTo.getHours(), oldTo.getMinutes(), 0, 0);
    } else {
      start = new Date(fromDate);
      end = new Date(toDate);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      setSaveError(
        isHourlySaved
          ? "Please select a valid date."
          : "Please select valid check-in and check-out dates."
      );
      return;
    }

    setIsSavingDates(true);
    setSaveStatus(null);

    try {
      const response = await fetch("/api/user/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          fromDate: start.toISOString(),
          toDate: end.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save date profile.");
      }

      setSavedDates(result.data);
      setSaveStatus("Saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save your schedule. Please try again.");
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleShareEstimate = () => {
    if (!latestEstimate) return;
    const inviteUrl = `${window.location.origin}/i/${latestEstimate.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedEstimateUrl(true);
    setTimeout(() => setCopiedEstimateUrl(false), 2500);
  };

  const isEstimatePaid =
    latestEstimate?.paymentStatus === "paid" || latestEstimate?.paymentStatus === "success";

  return (
    // The root layout already renders the <main> landmark.
    <div className="min-h-screen bg-background pb-20 font-sans text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col items-center gap-3 text-center">
          {hostProfile ? (
            <>
              <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                PRO PORTAL • {hostProfile.subdomain}
              </Badge>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                {hostProfile.displayName ? `${hostProfile.displayName}'s Listings` : "Your Cozy Stay"}
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
                Explore custom stays and packages curated directly by {hostProfile.displayName || "our premium host"}.
              </p>
              <a
                href={typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host.replace(`${subdomain}.`, "")}` : "/"}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold mt-2"
              >
                ← View all Simpleplek locations
              </a>
            </>
          ) : (
            <>
              <Badge variant="secondary">Surf Yoga Community</Badge>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Find Your Retreat
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
                Sync your travel dates once, then browse every listing with live pricing for your stay.
              </p>
            </>
          )}
        </header>

        {paymentStatus === "success" && (
          <Alert className="mx-auto w-full max-w-3xl">
            <CheckIcon />
            <AlertTitle>Payment received</AlertTitle>
            <AlertDescription>
              Your stay booking is secured for R {amountPaid}.
            </AlertDescription>
          </Alert>
        )}

        {user && latestEstimate && (
          <Card size="sm" className="mx-auto w-full max-w-3xl">
            <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <PinIcon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Latest active estimate
                    </span>
                    <Badge variant={isEstimatePaid ? "default" : "outline"}>
                      {isEstimatePaid ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                  <p className="font-heading text-base font-medium">
                    {estimatePropertyTitle || "Llandudno Stay"}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      R {latestEstimate.total.toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Button
                  className="flex-1 sm:flex-none"
                  nativeButton={false}
                  render={<Link href={`/estimate/${latestEstimate.id}`} />}
                >
                  Resume
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
                <Button variant="outline" onClick={handleShareEstimate}>
                  {copiedEstimateUrl ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <CopyIcon data-icon="inline-start" />
                  )}
                  {copiedEstimateUrl ? "Copied" : "Share"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="sticky top-4 z-30 mx-auto w-full max-w-3xl">
          <Card size="sm" className="shadow-lg">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="from-date">Check-in date</FieldLabel>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    if (isHourlySaved && savedDates) {
                      setToDate(e.target.value);
                    } else {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        d.setDate(d.getDate() + nights);
                        setToDate(d.toISOString().split("T")[0]);
                      }
                    }
                  }}
                />
              </Field>

              {isHourlySaved && savedDates ? (
                <Field className="flex-1">
                  <FieldLabel htmlFor="slot-window">Slot window</FieldLabel>
                  <div
                    id="slot-window"
                    className="flex h-9 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm font-medium"
                  >
                    <ClockIcon className="size-4 text-muted-foreground" />
                    {formatSlotTime(savedDates.fromDate)}
                  </div>
                </Field>
              ) : (
                <Field className="flex-1">
                  <FieldLabel htmlFor="nights">Nights</FieldLabel>
                  <Input
                    id="nights"
                    type="number"
                    min={1}
                    max={30}
                    value={nights}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setNights(val);
                      const d = new Date(fromDate);
                      if (!isNaN(d.getTime())) {
                        d.setDate(d.getDate() + val);
                        setToDate(d.toISOString().split("T")[0]);
                      }
                    }}
                  />
                </Field>
              )}

              <Button
                onClick={handleSaveDates}
                disabled={isSavingDates || authLoading}
                className="w-full sm:w-auto"
              >
                {isSavingDates ? (
                  <Spinner data-icon="inline-start" />
                ) : !user ? (
                  <LockIcon data-icon="inline-start" />
                ) : (
                  <CalendarCheckIcon data-icon="inline-start" />
                )}
                {isSavingDates
                  ? "Syncing"
                  : saveStatus
                    ? saveStatus
                    : !user
                      ? "Sign in to sync"
                      : "Sync schedule"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {saveError && (
          <Alert variant="destructive" className="mx-auto w-full max-w-3xl">
            <TriangleAlertIcon />
            <AlertTitle>Could not sync your schedule</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        <section className="flex flex-col gap-6 pt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 font-heading text-lg font-medium">
              <HouseIcon className="size-5 text-muted-foreground" />
              Destination listings
            </h2>
            {!isLoadingProps && (
              <span className="text-sm text-muted-foreground">
                {properties.length} location{properties.length === 1 ? "" : "s"} available
              </span>
            )}
          </div>

          {isLoadingProps ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[0, 1].map((i) => (
                <Card key={i} className="gap-0 pt-0">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <CardHeader className="pt-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-1/3" />
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HouseIcon />
                </EmptyMedia>
                <EmptyTitle>No listings yet</EmptyTitle>
                <EmptyDescription>
                  There are no destination properties available right now. Check back soon.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {properties.map((p) => {
                const isHourly = p.bookingType === "hourly";
                return (
                  <Card
                    key={p.id}
                    className="group relative gap-0 pt-0 transition-shadow hover:shadow-lg"
                  >
                    <Link
                      href={`/posts/${p.slug}`}
                      className="absolute inset-0 z-10 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      aria-label={`View ${p.title}`}
                    />

                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {p.images && p.images.length > 0 ? (
                        <img
                          src={p.images[0] || "/placeholder.svg"}
                          alt={p.title}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageOffIcon className="size-6" />
                          <span className="text-xs">No image preview</span>
                        </div>
                      )}

                      <Badge variant="secondary" className="absolute top-3 left-3">
                        {isHourly ? "Hourly slot" : "Nightly stay"}
                      </Badge>
                    </div>

                    <CardHeader className="pt-4">
                      <CardTitle>{p.title}</CardTitle>
                      <CardDescription>
                        {isHourly
                          ? "Book a single time slot"
                          : `Priced per night for your synced window`}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4">
                      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {isHourly ? (
                              <ClockIcon className="size-3.5" />
                            ) : (
                              <CalendarCheckIcon className="size-3.5" />
                            )}
                            {isHourly ? "Applied slot" : "Schedule window"}
                          </span>
                          {savedDates && !isHourly && (
                            <Badge variant="outline">
                              {nights} night{nights > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>

                        {savedDates ? (
                          isHourly ? (
                            <div className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5 text-sm">
                              <span className="font-medium">
                                {formatDisplayDate(savedDates.fromDate)}
                              </span>
                              <Badge variant="outline">
                                <ClockIcon data-icon="inline-start" />
                                {formatSlotTime(savedDates.fromDate)}
                              </Badge>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-0.5 rounded-md bg-background px-3 py-1.5">
                                <span className="text-xs text-muted-foreground">Check-in</span>
                                <span className="text-sm font-medium">
                                  {formatDisplayDate(savedDates.fromDate)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 rounded-md bg-background px-3 py-1.5">
                                <span className="text-xs text-muted-foreground">Check-out</span>
                                <span className="text-sm font-medium">
                                  {formatDisplayDate(savedDates.toDate)}
                                </span>
                              </div>
                            </div>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Sync dates above to configure pricing.
                          </p>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                          {isHourly ? "Hourly rate" : "Nightly rate"}
                        </span>
                        <span className="font-heading text-base font-semibold">
                          R {p.basePricePerNight.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">
                            {isHourly ? "/slot" : "/night"}
                          </span>
                        </span>
                      </div>

                      <span className="pointer-events-none inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        View details
                        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      }
    >
      <AuthProvider>
        <HomePageContent />
      </AuthProvider>
    </Suspense>
  );
}
