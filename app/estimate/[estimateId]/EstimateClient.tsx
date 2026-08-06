"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, AuthProvider } from "@/components/auth";
import { formatDisplayDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  CircleCheckIcon,
  HouseIcon,
  KeyRoundIcon,
  LinkIcon,
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

interface Estimate {
  id: string;
  propertyId: string;
  packageId: string | null;
  customerName: string;
  customerEmail: string;
  customerId: string;
  fromDate: string;
  toDate: string;
  total: number;
  paymentStatus: string;
  token: string;
  guests?: string[];
  guestsDetails?: Record<string, { name: string; email: string }>;
}

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  bookingType?: string;
  images?: string[];
  imageUrl?: string;
  image?: string;
  coverImage?: string;
}

interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  multiplier: number;
  baseRate: number;
  category: string;
}

interface EstimateClientProps {
  estimate: Estimate;
  property: Property | null;
  selectedPackage: Package | null;
}

function EstimateClientContent({ estimate, property, selectedPackage }: EstimateClientProps) {
  const { user, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>(estimate.packageId || "");
  const [isUpdatingPackage, setIsUpdatingPackage] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);

  // Fetch packages for the property
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const res = await fetch(`/api/packages?propertyId=${estimate.propertyId}`);
        const result = await res.json();
        if (result.success && result.data) {
          setPackages(result.data.filter((p: any) => p.category !== "addon"));
        }
      } catch (err) {
        console.error("Failed to load packages on estimate page:", err);
      }
    };
    loadPackages();
  }, [estimate.propertyId]);

  const [hasUserPaid, setHasUserPaid] = useState(false);
  const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(true);

  // Check if current user has already paid for this estimate (to support multiple hourly payments)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoadingPaymentStatus(false);
      return;
    }
    const checkUserPaid = async () => {
      try {
        const res = await fetch(`/api/bookings?propertyId=${estimate.propertyId}`);
        const result = await res.json();
        if (result.success && result.data) {
          const userBooking = result.data.find(
            (b: any) => b.estimateId === estimate.id && (b.customerId === user.uid || b.customerEmail === user.email) && (b.paymentStatus === "paid" || b.paymentStatus === "success")
          );
          if (userBooking) {
            setHasUserPaid(true);
          }
        }
      } catch (err) {
        console.error("Failed to check user payment status:", err);
      } finally {
        setIsLoadingPaymentStatus(false);
      }
    };
    checkUserPaid();
  }, [estimate.propertyId, estimate.id, user, authLoading]);

  // Copy share url helper
  const inviteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/i/${estimate.token}` : "";

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePay = async () => {
    setIsPaying(true);
    setPayError(null);

    try {
      const targetType = currentSelectedPackage 
        ? currentSelectedPackage.id 
        : (packages.length > 0 
            ? packages[0].id 
            : (estimate.propertyId === "cottage" ? "long_weekend_at_the_Cottage" : "shack_stack")
          );

      const linkRes = await fetch("/api/v1/generate_checkout_link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: targetType,
          estimateId: estimate.id,
          amountInCentsOverride: Math.round(finalTotal * 100),
          descriptionOverride: currentSelectedPackage ? currentSelectedPackage.name : "Stay Booking",
          userId: user?.uid,
          email: user?.email,
          name: user?.displayName || user?.email?.split("@")[0] || "Guest"
        }),
      });

      const linkResult = await linkRes.json();
      if (!linkRes.ok || !linkResult.status) {
        throw new Error(linkResult.data || "Redirect link generation failed.");
      }

      window.location.href = linkResult.data.redirectUrl;
    } catch (err: any) {
      setPayError(err.message || "An error occurred generating checkout link.");
      setIsPaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Securing session context</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Empty className="mx-auto my-20 max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyRoundIcon />
          </EmptyMedia>
          <EmptyTitle>Authentication required</EmptyTitle>
          <EmptyDescription>
            Please sign in to view and interact with these estimate details.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          nativeButton={false}
          render={<Link href={`/login?redirect=/estimate/${estimate.id}`} />}
        >
          Sign in
        </Button>
      </Empty>
    );
  }

  // Authorization Check
  const isOwner =
    user.uid === estimate.customerId ||
    user.email?.toLowerCase() === estimate.customerEmail.toLowerCase();
  const isGuest = estimate.guests && estimate.guests.includes(user.uid);
  const isAdmin =
    user.email &&
    [
      "thankyou.digital@gmail.com",
      "admin@llandudnostays.co.za",
      "jmaclachlan@gmail.com",
      "admin@example.com",
    ].includes(user.email.toLowerCase());

  if (!isOwner && !isGuest && !isAdmin) {
    return (
      <Empty className="mx-auto my-20 max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="text-destructive">
            <ShieldXIcon />
          </EmptyMedia>
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>
            You do not have permission to view this estimate. You must be invited as a guest or be
            the customer who generated the estimate.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Go home
        </Button>
      </Empty>
    );
  }

  const from = new Date(estimate.fromDate);
  const to = new Date(estimate.toDate);

  const isHourly = property?.bookingType === "hourly";
  const stayNights = Math.max(
    1,
    Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );

  const nights = isHourly ? 1 : stayNights;
  const isPaid = isHourly 
    ? hasUserPaid 
    : (estimate.paymentStatus === "paid" || estimate.paymentStatus === "success" || hasUserPaid);

  const basePricePerNight = property ? property.basePricePerNight : 1500;
  const baseCost = basePricePerNight * nights;

  const currentSelectedPackage = packages.find(p => p.id === selectedPackageId) || (selectedPackageId === estimate.packageId ? selectedPackage : null);
  const packagePrice = currentSelectedPackage ? (currentSelectedPackage.price || currentSelectedPackage.baseRate || 0) : 0;
  const packageMultiplier = currentSelectedPackage ? (currentSelectedPackage.multiplier || 1.0) : 1.0;
  const finalTotal = (baseCost + packagePrice) * packageMultiplier;

  const handlePackageChange = async (packageId: string) => {
    setSelectedPackageId(packageId);
    setIsUpdatingPackage(true);
    setPackageError(null);

    try {
      const activePkg = packages.find(p => p.id === packageId);
      const activePrice = activePkg ? (activePkg.price || activePkg.baseRate || 0) : 0;
      const activeMultiplier = activePkg ? (activePkg.multiplier || 1.0) : 1.0;
      
      const newTotal = (baseCost + activePrice) * activeMultiplier;

      const res = await fetch("/api/estimates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId: estimate.id,
          packageId: packageId || null,
          total: newTotal
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to update package option in database.");
      }
      
      estimate.total = newTotal;
      estimate.packageId = packageId || null;
    } catch (err: any) {
      setPackageError(err?.message || "Failed to update the selected package.");
    } finally {
      setIsUpdatingPackage(false);
    }
  };

  const propThumbnail =
    property?.images?.[0] || property?.imageUrl || property?.image || property?.coverImage;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 font-sans sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Stay estimate
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
            Estimate for {property?.title || "Llandudno"}
          </h1>
          <span className="font-mono text-xs text-muted-foreground">Ref: {estimate.id}</span>
        </div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Return home
        </Button>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        {/* Left Side: Summary Details */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Stay Configuration Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col items-start gap-1.5">
                  <Badge variant="secondary">
                    {estimate.propertyId === "shack"
                      ? "Beach Shack"
                      : estimate.propertyId === "cottage"
                        ? "Cozy Cottage"
                        : "Luxury Villa"}
                  </Badge>
                  <CardTitle className="text-lg">
                    {property?.title || "Llandudno Property"}
                  </CardTitle>
                  <CardDescription>Estimate configuration and customer details</CardDescription>
                </div>

                {propThumbnail ? (
                  <img
                    src={propThumbnail || "/placeholder.svg"}
                    alt={property?.title || "Property"}
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <HouseIcon className="size-6" />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
              <Separator className="mb-2" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{estimate.customerName}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Contact email</span>
                <span className="font-mono text-xs">{estimate.customerEmail}</span>
              </div>
            </CardContent>
          </Card>

          {/* Booking Dates & Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                Reserved stay dates
              </CardTitle>
              <div data-slot="card-action" className="col-start-2 row-start-1 justify-self-end">
                <Badge variant="secondary">
                  {isHourly ? "1 slot" : `${nights} night${nights > 1 ? "s" : ""}`}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Check In */}
              <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {isHourly ? "Start time" : "Check-in"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDisplayDate(from)}
                  </span>
                </div>
                <span className="font-heading text-base font-semibold">
                  {isHourly
                    ? from.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "From 14:00"}
                </span>
                <span className="text-xs text-muted-foreground">Arrival window</span>
              </div>

              {/* Check Out */}
              <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {isHourly ? "End time" : "Check-out"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDisplayDate(to)}
                  </span>
                </div>
                <span className="font-heading text-base font-semibold">
                  {isHourly
                    ? to.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "By 10:00"}
                </span>
                <span className="text-xs text-muted-foreground">Departure window</span>
              </div>
            </CardContent>
          </Card>

          {/* Select Package Option Tiles */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Select package option</CardTitle>
              <CardDescription>
                Enhance your stay by choosing a curated package experience, or check out with
                standard accommodation.
              </CardDescription>
            </CardHeader>

            <CardContent
              role="radiogroup"
              aria-label="Package option"
              className="flex flex-col gap-3"
            >
              {packageError && (
                <Alert variant="destructive">
                  <TriangleAlertIcon />
                  <AlertTitle>Could not update package</AlertTitle>
                  <AlertDescription>{packageError}</AlertDescription>
                </Alert>
              )}

              {/* Option: Standard / No Package Tile */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedPackageId === ""}
                disabled={isUpdatingPackage || isPaid}
                onClick={() => handlePackageChange("")}
                className={`flex w-full items-start justify-between gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70 ${
                  selectedPackageId === ""
                    ? "border-primary bg-primary/5"
                    : "bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    selectedPackageId === ""
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {selectedPackageId === "" && <CheckIcon className="size-3" />}
                </span>

                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-medium">Standard stay</span>
                    <Badge variant="outline">Basic</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Standard booking with base amenities included. No additional package added.
                  </p>
                </div>

                <span className="mt-0.5 shrink-0 font-heading text-sm font-semibold">R 0</span>
              </button>

              {/* Dynamic Package Tiles */}
              {packages
                .filter((p) => p.category !== "addon")
                .map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  const price = pkg.price || pkg.baseRate || 0;

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isUpdatingPackage || isPaid}
                      onClick={() => handlePackageChange(pkg.id)}
                      className={`flex w-full items-start justify-between gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70 ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "bg-muted/30 hover:bg-muted/60"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input"
                        }`}
                      >
                        {isSelected && <CheckIcon className="size-3" />}
                      </span>

                      <div className="flex flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-heading text-sm font-medium">{pkg.name}</span>
                          {pkg.category && <Badge variant="outline">{pkg.category}</Badge>}
                          {pkg.multiplier && pkg.multiplier !== 1 && (
                            <Badge variant="secondary">{pkg.multiplier}× multiplier</Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {pkg.description}
                          </p>
                        )}
                      </div>

                      <span className="mt-0.5 shrink-0 font-heading text-sm font-semibold">
                        +R {price.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
            </CardContent>
          </Card>

          {/* Invite Guests & Sharing Portal */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-4 text-muted-foreground" />
                Invite guests &amp; share estimate
              </CardTitle>
              <CardDescription>
                Share this unique invite URL with friends or co-guests so they can view and join
                this estimate.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="invite-url" className="sr-only">
                  Invite URL
                </label>
                <Input
                  id="invite-url"
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 font-mono text-xs"
                />
                <Button onClick={handleCopy} className="shrink-0">
                  {copied ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <LinkIcon data-icon="inline-start" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>

              {/* Guest List Roster */}
              {estimate.guests && estimate.guests.length > 0 && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Joined guest roster ({estimate.guests.length})
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {estimate.guests.map((gUid, idx) => {
                      const details = estimate.guestsDetails?.[gUid];
                      const label = details
                        ? `${details.name} (${details.email})`
                        : gUid === user.uid
                          ? "You"
                          : gUid.substring(0, 8) + "…";
                      return (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                            <span className="font-mono text-xs">{label}</span>
                          </span>
                          <Badge variant="secondary">Joined</Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Total calculations & Secure Book action */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b">
              <CardTitle>Estimate summary</CardTitle>
              <div data-slot="card-action" className="col-start-2 row-start-1 justify-self-end">
                <Badge variant={isPaid ? "default" : "outline"}>
                  {isPaid ? "Paid" : "Pending payment"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Created by</span>
                <span className="font-medium">{estimate.customerName}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{isHourly ? "Duration" : "Stay length"}</span>
                <span className="font-medium">
                  {isHourly ? "1 slot" : `${nights} night${nights === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Accommodation cost</span>
                <span className="font-medium">R {baseCost.toLocaleString()}</span>
              </div>
              {currentSelectedPackage && (
                <>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Package cost ({currentSelectedPackage.name})
                    </span>
                    <span className="font-medium">R {packagePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Package multiplier</span>
                    <span className="font-medium">× {packageMultiplier}</span>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Total payable</span>
                <span className="font-heading text-2xl font-semibold">
                  R {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {payError && (
                <Alert variant="destructive">
                  <TriangleAlertIcon />
                  <AlertTitle>Checkout failed</AlertTitle>
                  <AlertDescription>{payError}</AlertDescription>
                </Alert>
              )}

              {!isPaid ? (
                <Button
                  className="w-full"
                  onClick={handlePay}
                  disabled={isPaying || isLoadingPaymentStatus}
                >
                  {(isPaying || isLoadingPaymentStatus) && <Spinner data-icon="inline-start" />}
                  {isLoadingPaymentStatus
                    ? "Checking payment status"
                    : isPaying
                      ? "Connecting to checkout"
                      : "Confirm & pay via Yoco"}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Alert>
                    <CircleCheckIcon />
                    <AlertTitle>Stay fully paid</AlertTitle>
                    <AlertDescription>Your booking is confirmed.</AlertDescription>
                  </Alert>
                  <Button
                    className="w-full"
                    nativeButton={false}
                    render={<Link href="/bookings" />}
                  >
                    Go to my bookings
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EstimateClient(props: EstimateClientProps) {
  return (
    <AuthProvider>
      <EstimateClientContent {...props} />
    </AuthProvider>
  );
}
