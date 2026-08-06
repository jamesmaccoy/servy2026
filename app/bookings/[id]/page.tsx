"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useAuth, AuthProvider } from "@/components/auth";
import Link from "next/link";
import { formatDisplayDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  KeyRoundIcon,
  Share2Icon,
  ShieldXIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  images?: string[];
}

interface PackageData {
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

interface Booking {
  id: string;
  propertyId: string;
  packageId: string | null;
  customerName: string;
  customerEmail: string;
  fromDate: string;
  toDate: string;
  total: number;
  paymentStatus: string;
  token?: string;
  guests?: string[];
}

function BookingDetailsContent({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [purchasingAddonId, setPurchasingAddonId] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [addonError, setAddonError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        // 1. Fetch Booking
        const bkRes = await fetch(`/api/bookings/${id}`);
        const bkResult = await bkRes.json();
        if (!bkRes.ok || !bkResult.success) {
          setIsLoading(false);
          return;
        }
        const bkData = bkResult.data;
        setBooking(bkData);

        // 2. Fetch specific property details directly
        const propRes = await fetch(`/api/posts/${bkData.propertyId}`);
        const propResult = await propRes.json();
        if (propResult.success && propResult.data) {
          setProperty(propResult.data);
        }

        // 3. Fetch Packages for this property
        const pkgRes = await fetch(`/api/packages?propertyId=${bkData.propertyId}`);
        const pkgResult = await pkgRes.json();
        if (pkgResult.success && pkgResult.data) {
          setPackages(pkgResult.data);
        }
      } catch (err) {
        console.error("Failed to load booking details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id]);

  const handleCopyInviteLink = () => {
    if (!booking?.token) return;
    const inviteUrl = `${window.location.origin}/i/${booking.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePurchaseAddon = async (addon: PackageData) => {
    if (!booking) return;
    setAddonError(null);
    setPurchasingAddonId(addon.id);
    try {
      const response = await fetch("/api/v1/generate_checkout_link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: addon.yocoId || addon.id,
          bookingId: booking.id,
          amountInCentsOverride: Math.round(addon.price * 100),
          descriptionOverride: `Add-on: ${addon.name} for Booking ${booking.id}`,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.status) {
        throw new Error(result.data || "Failed to generate checkout link.");
      }

      window.location.assign(result.data.redirectUrl);
    } catch (err: unknown) {
      const error = err as Error;
      setAddonError(error.message || "Failed to initiate purchase.");
      setPurchasingAddonId("");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner className="size-6 text-primary" />
        <span className="text-sm text-muted-foreground">Retrieving stay details...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRoundIcon />
            </EmptyMedia>
            <EmptyTitle>Authentication required</EmptyTitle>
            <EmptyDescription>
              Please log in to view stay reservation information.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="w-full"
              nativeButton={false}
              render={<Link href={`/login?redirect=/bookings/${id}`} />}
            >
              Sign in
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Booking not found</EmptyTitle>
            <EmptyDescription>
              The requested booking details could not be found or have been removed.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href="/bookings" />}
            >
              Go to bookings dashboard
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // Authorization check: User must be customer, guest, or admin
  const isCustomer = booking.customerEmail?.toLowerCase() === user.email?.toLowerCase();
  const isGuest = booking.guests && booking.guests.includes(user.uid);
  const isUserAuthorized = isCustomer || isGuest || user.isAdmin;

  if (!isUserAuthorized) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldXIcon />
            </EmptyMedia>
            <EmptyTitle>Access restricted</EmptyTitle>
            <EmptyDescription>
              You do not have authorization to view this booking.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href="/bookings" />}
            >
              Go to bookings dashboard
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const checkIn = formatDisplayDate(booking.fromDate);
  const checkOut = formatDisplayDate(booking.toDate);
  const stayNights = Math.max(
    1,
    Math.ceil(Math.abs(new Date(booking.toDate).getTime() - new Date(booking.fromDate).getTime()) / (1000 * 60 * 60 * 24))
  );
  const propName = property ? property.title : booking.propertyId;
  const isPaid = booking.paymentStatus === "paid" || booking.paymentStatus === "success";
  const addonsList = packages.filter((p) => p.propertyId === booking.propertyId && p.category === "addon");
  const statusVariant: "default" | "secondary" | "destructive" = isPaid
    ? "default"
    : booking.paymentStatus === "failed"
      ? "destructive"
      : "secondary";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reservation overview
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
            Booking overview
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto"
          nativeButton={false}
          render={<Link href="/bookings" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to dashboard
        </Button>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        {/* Main Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Property Summary & Status Card */}
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <CardTitle className="truncate text-2xl">{propName}</CardTitle>
                <CardDescription className="truncate font-mono text-xs">
                  Ref: {booking.id}
                </CardDescription>
                <div className="pt-1">
                  <Badge variant={statusVariant}>{booking.paymentStatus}</Badge>
                </div>
              </div>

              {property?.images && property.images.length > 0 && (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={property.images[0] || "/placeholder.svg"}
                    alt={propName}
                    className="size-full object-cover"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Separator />
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Primary guest</span>
                <span className="font-medium">{booking.customerName}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Contact email</span>
                <span className="truncate font-mono text-xs">{booking.customerEmail}</span>
              </div>
            </CardContent>
          </Card>

          {/* Check-in / Check-out Schedule */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                Stay schedule
              </CardTitle>
              <Badge variant="secondary">
                {stayNights} night{stayNights > 1 ? "s" : ""} total
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Check-in
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">From 14:00</span>
                </div>
                <span className="font-heading text-base font-medium">{checkIn}</span>
                <span className="text-xs text-muted-foreground">Standard arrival window</span>
              </div>

              <div className="flex flex-col gap-1 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Check-out
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">By 10:00</span>
                </div>
                <span className="font-heading text-base font-medium">{checkOut}</span>
                <span className="text-xs text-muted-foreground">Departure cutoff time</span>
              </div>
            </CardContent>
          </Card>

          {/* Guest Management & Invitation Portal */}
          {isPaid && (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="size-4 text-muted-foreground" />
                    Invited stay guests
                  </CardTitle>
                  <CardDescription>
                    Share your stay access link with companions joining this reservation.
                  </CardDescription>
                </div>

                {booking.token && (
                  <Button onClick={handleCopyInviteLink} className="shrink-0">
                    {copiedLink ? (
                      <CheckIcon data-icon="inline-start" />
                    ) : (
                      <Share2Icon data-icon="inline-start" />
                    )}
                    {copiedLink ? "Invite copied" : "Share invite link"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Confirmed party ({booking.guests?.length || 0})
                </span>

                {booking.guests && booking.guests.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {booking.guests.map((gUid, idx) => (
                      <li key={idx}>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm">
                          <UserIcon className="size-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs">
                            {gUid === user.uid ? "You (owner)" : `${gUid.substring(0, 8)}...`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      No companions have accepted this stay invite yet. Share the link above to
                      invite them.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Financial Summary & Add-ons */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Financial breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Payment status</span>
                <Badge variant={statusVariant}>{booking.paymentStatus}</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Total charge</span>
                <span className="font-heading text-xl font-semibold tabular-nums">
                  R {booking.total ? booking.total.toLocaleString() : "0"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* In-App Add-ons Purchases */}
          {isPaid && (
            <Card>
              <CardHeader>
                <CardTitle>Enhance stay</CardTitle>
                <CardDescription>
                  Select optional upgrades for this destination listing.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {addonError && (
                  <Alert variant="destructive">
                    <TriangleAlertIcon />
                    <AlertTitle>Purchase failed</AlertTitle>
                    <AlertDescription>{addonError}</AlertDescription>
                  </Alert>
                )}

                {addonsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No add-ons available for this property.
                  </p>
                ) : (
                  addonsList.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 transition-colors hover:border-primary/50"
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="font-heading text-sm font-medium">{addon.name}</h3>
                        {addon.description && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {addon.description}
                          </p>
                        )}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-heading text-sm font-semibold tabular-nums">
                          R {addon.price.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handlePurchaseAddon(addon)}
                          disabled={purchasingAddonId === addon.id}
                        >
                          {purchasingAddonId === addon.id && (
                            <Spinner className="size-3.5" data-icon="inline-start" />
                          )}
                          {purchasingAddonId === addon.id ? "Connecting..." : "Add to stay"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="size-6 text-primary" />
        </div>
      }
    >
      <AuthProvider>
        <BookingDetailsContent id={unwrappedParams.id} />
      </AuthProvider>
    </Suspense>
  );
}
