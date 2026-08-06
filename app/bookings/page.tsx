"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, AuthProvider } from "@/components/auth";
import Link from "next/link";
import CalendarPicker from "@/components/CalendarPicker";
import { formatDisplayDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BedDoubleIcon,
  CalendarOffIcon,
  CheckIcon,
  ClockIcon,
  KeyRoundIcon,
  LuggageIcon,
  TriangleAlertIcon,
  UsersIcon,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  bookingType?: string;
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
  guestsDetails?: Record<string, { name: string; email: string }>;
}

function paymentBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "paid" || status === "success") return "default";
  if (status === "failed" || status === "cancelled" || status === "refunded")
    return "destructive";
  return "secondary";
}

function BookingsCheckoutContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") || "";

  const { user, loading: authLoading } = useAuth();

  // Page States
  const [property, setProperty] = useState<Property | null>(null);
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [savedDates, setSavedDates] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutLog, setCheckoutLog] = useState<string[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [dateConflict, setDateConflict] = useState<string | null>(null);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);

  // Admin and filter mode states
  const [viewMode, setViewMode] = useState<"my" | "all">("my");
  const [latestEstimate, setLatestEstimate] = useState<any | null>(null);

  // Load property, user dates, and packages
  useEffect(() => {
    const loadPageData = async () => {
      try {
        // 1. Fetch all properties to resolve property ID -> Title
        const propRes = await fetch("/api/posts");
        const propResult = await propRes.json();
        let fetchedProps: Property[] = [];
        if (propResult.success && propResult.data) {
          setPropertiesList(propResult.data);
          fetchedProps = propResult.data;
        }

        if (propertyId) {
          const found = fetchedProps.find((p: Property) => p.id === propertyId);
          if (found) setProperty(found);

          // 2. Fetch Packages for this property
          const pkgRes = await fetch(`/api/packages?propertyId=${propertyId}`);
          const pkgResult = await pkgRes.json();
          if (pkgResult.success && pkgResult.data) {
            setPackages(pkgResult.data);
          }

          // 3. Fetch Bookings for history list
          const bksRes = await fetch(`/api/bookings?propertyId=${propertyId}`);
          const bksResult = await bksRes.json();
          if (bksResult.success && bksResult.data) {
            setBookingsList(bksResult.data);
          }
        } else {
          // Fetch all bookings for dashboard display
          const bksRes = await fetch("/api/bookings");
          const bksResult = await bksRes.json();
          if (bksResult.success && bksResult.data) {
            setBookingsList(bksResult.data);
          }
          // Fetch all packages for the dashboard to render addons
          const pkgRes = await fetch("/api/packages");
          const pkgResult = await pkgRes.json();
          if (pkgResult.success && pkgResult.data) {
            setPackages(pkgResult.data);
          }
        }
      } catch (err) {
        console.error("Failed to load page data:", err);
      } finally {
        if (!propertyId) {
          setIsLoading(false);
        }
      }
    };

    loadPageData();
  }, [propertyId]);

  // Load saved dates and latest estimate for logged-in user
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const res = await fetch(`/api/user/dates?userId=${user.uid}`);
        const result = await res.json();
        if (result.success && result.data) {
          setSavedDates(result.data);
        }

        const estRes = await fetch(`/api/estimates/latest?userId=${user.uid}`);
        const estResult = await estRes.json();
        if (estResult.success && estResult.data) {
          setLatestEstimate(estResult.data);
        }
      } catch (err) {
        console.error("Failed to retrieve user dates or estimate:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, authLoading]);

  // Check for date overlaps
  useEffect(() => {
    if (!savedDates || !propertyId || bookingsList.length === 0) return;

    const from = new Date(savedDates.fromDate);
    const to = new Date(savedDates.toDate);

    const conflict = bookingsList.find((b) => {
      if (b.paymentStatus === "failed" || b.paymentStatus === "refunded") return false;
      const bStart = new Date(b.fromDate);
      const bEnd = new Date(b.toDate);
      return from < bEnd && to > bStart;
    });

    if (conflict) {
      const startStr = formatDisplayDate(conflict.fromDate);
      const endStr = formatDisplayDate(conflict.toDate);
      setDateConflict(`Dates overlap with an existing booking (${startStr} - ${endStr}) by ${conflict.customerName}`);
    } else {
      setDateConflict(null);
    }
  }, [savedDates, propertyId, bookingsList]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Spinner className="size-6 text-primary" />
        <span className="text-sm text-muted-foreground">Securing session context...</span>
      </div>
    );
  }

  // 1. Not Authenticated State
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
              {propertyId
                ? "You must be logged in and have selected stay dates before checking out a package."
                : "You must be logged in to view your stays."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="w-full" nativeButton={false} render={<Link href="/" />}>
              {propertyId ? "Go to homepage login and date picker" : "Go to homepage to login"}
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // 2. Dates not selected state (Only during checkout flow)
  if (propertyId && !savedDates) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOffIcon />
            </EmptyMedia>
            <EmptyTitle>Dates missing</EmptyTitle>
            <EmptyDescription>
              No active stay dates found on your profile. Please configure check-in and check-out
              dates on the portal first.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="w-full" nativeButton={false} render={<Link href="/" />}>
              Select dates first
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // Calculate stay duration
  const from = savedDates ? new Date(savedDates.fromDate) : new Date();
  const to = savedDates ? new Date(savedDates.toDate) : new Date();

  const isHourly = property?.bookingType === "hourly";
  const stayNights = savedDates ? Math.max(1, Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const nights = isHourly ? 1 : stayNights;

  const basePricePerNight = property ? property.basePricePerNight : 1500;
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  const baseCost = basePricePerNight * nights;
  const packagePrice = selectedPackage ? selectedPackage.price || selectedPackage.baseRate || 0 : 0;
  const packageMultiplier = selectedPackage ? selectedPackage.multiplier || 1.0 : 1.0;

  const finalTotal = (baseCost + packagePrice) * packageMultiplier;

  const handleUpdateDates = async (start: string, end: string) => {
    if (!user) return;

    // Local update for responsive UI feedback
    if (!end) {
      setSavedDates({
        fromDate: new Date(start).toISOString(),
        toDate: new Date(start).toISOString()
      });
      return;
    }

    try {
      const response = await fetch("/api/user/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          fromDate: new Date(start).toISOString(),
          toDate: new Date(end).toISOString()
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSavedDates(result.data);
      }
    } catch (err) {
      console.error("Failed to update user stay dates:", err);
    }
  };

  const handleBookNow = async () => {
    if (dateConflict) {
      setCheckoutError("Please resolve the date conflict before proceeding.");
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);
    setCheckoutLog(["1. Validating stay selection...", "2. Registering stay estimate details..."]);

    try {
      // POST estimate
      const estRes = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          packageId: selectedPackageId || null,
          customerName: user.displayName || user.email?.split("@")[0] || "Authenticated Guest",
          customerEmail: user.email || "",
          customerId: user.uid,
          fromDate: from.toISOString(),
          toDate: to.toISOString(),
          total: finalTotal
        })
      });

      const estResult = await estRes.json();
      if (!estRes.ok || !estResult.success) {
        throw new Error(estResult.error || "Failed to log stay estimate.");
      }

      setCheckoutLog(prev => [
        ...prev,
        "3. Estimate saved successfully. Preparing payment details...",
      ]);

      const targetType = selectedPackage
        ? (selectedPackage.id || selectedPackage.yocoId)
        : (packages.length > 0
          ? packages[0].id
          : (propertyId === "cottage" ? "long_weekend_at_the_Cottage" : "shack_stack")
        );

      // POST create link
      const linkRes = await fetch("/api/v1/generate_checkout_link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: targetType,
          estimateId: estResult.estimate.id,
          amountInCentsOverride: Math.round(finalTotal * 100),
          descriptionOverride: selectedPackage ? selectedPackage.name : 'Stay Booking'
        })
      });

      const linkResult = await linkRes.json();
      if (!linkRes.ok || !linkResult.status) {
        throw new Error(linkResult.data || "Redirect link generation failed.");
      }

      setCheckoutLog(prev => [
        ...prev,
        "4. Redirecting to checkout gateway..."
      ]);

      setTimeout(() => {
        window.location.href = linkResult.data.redirectUrl;
      }, 1200);

    } catch (err: unknown) {
      const error = err as Error;
      setCheckoutError(error.message);
      setIsSubmitting(false);
    }
  };

  if (!propertyId) {
    const displayBookings = bookingsList.filter((b) => {
      if (viewMode === "my") {
        const isCustomer = b.customerEmail?.toLowerCase() === user.email?.toLowerCase();
        const isGuest = b.guests && b.guests.includes(user.uid);
        return isCustomer || isGuest;
      }
      return true;
    });

    const getCountdownLabel = (
      b: Booking
    ): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
      if (b.paymentStatus === "failed" || b.paymentStatus === "cancelled" || b.paymentStatus === "refunded") {
        return { text: "No active reservation", variant: "outline" };
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = new Date(b.fromDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(b.toDate);
      end.setHours(0, 0, 0, 0);

      if (now > end) {
        return { text: "Completed stay", variant: "outline" };
      }
      if (now >= start && now <= end) {
        return { text: "Active now", variant: "default" };
      }

      const diffTime = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        return { text: "Starts tomorrow", variant: "default" };
      }
      return { text: `Starts in ${diffDays} days`, variant: "secondary" };
    };

    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Account stays
            </span>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
              My bookings
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="self-start sm:self-auto"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            View destination properties
          </Button>
        </header>

        {latestEstimate && latestEstimate.paymentStatus === "pending" && (() => {
          const estimateProperty = propertiesList.find((p) => p.id === latestEstimate.propertyId);
          return (
            <Card className="mb-8 border-primary/40 bg-accent/40">
              <CardContent className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {estimateProperty?.images && estimateProperty.images.length > 0 && (
                    <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-28">
                      <img
                        src={estimateProperty.images[0] || "/placeholder.svg"}
                        alt={estimateProperty.title}
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Badge variant="secondary">Unpaid stay estimate</Badge>
                    <h2 className="font-heading text-lg font-semibold tracking-tight">
                      {estimateProperty?.title || latestEstimate.propertyId}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatDisplayDate(latestEstimate.fromDate)} to{" "}
                      {formatDisplayDate(latestEstimate.toDate)}
                    </p>
                    <p className="text-sm font-medium">
                      Total: R{" "}
                      {latestEstimate.total ? Number(latestEstimate.total).toLocaleString() : "0"}
                    </p>
                  </div>
                </div>

                <Button
                  className="shrink-0"
                  nativeButton={false}
                  render={<Link href={`/estimate/${latestEstimate.id}`} />}
                >
                  View details and pay
                </Button>
              </CardContent>
            </Card>
          );
        })()}

        {user?.isAdmin && (
          <ToggleGroup
            aria-label="Booking scope"
            value={[viewMode]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "my" || next === "all") setViewMode(next);
            }}
            variant="outline"
            size="sm"
            className="mb-8"
          >
            <ToggleGroupItem value="my">My bookings</ToggleGroupItem>
            <ToggleGroupItem value="all">All system bookings</ToggleGroupItem>
          </ToggleGroup>
        )}

        {displayBookings.length === 0 ? (
          <Empty className="rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LuggageIcon />
              </EmptyMedia>
              <EmptyTitle>No stays found</EmptyTitle>
              <EmptyDescription>
                {viewMode === "my"
                  ? "You haven't reserved any stays yet. Visit the homepage to choose a property and dates."
                  : "No bookings recorded in the system ledger yet."}
              </EmptyDescription>
            </EmptyHeader>
            {viewMode === "my" && (
              <EmptyContent>
                <Button nativeButton={false} render={<Link href="/" />}>
                  Explore properties
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {displayBookings.map((b) => {
              const propertyForBooking = propertiesList.find((p) => p.id === b.propertyId);
              const isHourlyBooking = propertyForBooking?.bookingType === "hourly";
              const checkIn = isHourlyBooking
                ? `${formatDisplayDate(b.fromDate)} ${new Date(b.fromDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}`
                : formatDisplayDate(b.fromDate);
              const checkOut = isHourlyBooking
                ? `${formatDisplayDate(b.toDate)} ${new Date(b.toDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}`
                : formatDisplayDate(b.toDate);
              const stayNights = Math.max(
                1,
                Math.ceil(Math.abs(new Date(b.toDate).getTime() - new Date(b.fromDate).getTime()) / (1000 * 60 * 60 * 24))
              );
              const propName = propertyForBooking?.title || b.propertyId;
              const countdown = getCountdownLabel(b);
              const guestCount = b.guests?.length || 0;

              return (
                <Card
                  key={b.id}
                  className="group flex flex-col transition-colors hover:border-primary/50"
                >
                  <CardHeader className="flex-row items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <CardTitle className="truncate text-xl">
                        <Link href={`/bookings/${b.id}`} className="hover:underline">
                          {propName}
                        </Link>
                      </CardTitle>
                      <CardDescription className="truncate font-mono text-xs">
                        Ref: {b.id}
                      </CardDescription>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant={paymentBadgeVariant(b.paymentStatus)}>
                          {b.paymentStatus}
                        </Badge>
                        <Badge variant={countdown.variant}>{countdown.text}</Badge>
                      </div>
                    </div>

                    {propertyForBooking?.images && propertyForBooking.images.length > 0 && (
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={propertyForBooking.images[0] || "/placeholder.svg"}
                          alt={propName}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Check-in
                        </span>
                        <span className="text-sm font-medium">{checkIn}</span>
                      </div>
                      <div className="flex flex-col gap-1 border-l pl-4">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Check-out
                        </span>
                        <span className="text-sm font-medium">{checkOut}</span>
                      </div>
                    </div>

                    {(b.paymentStatus === "paid" || b.paymentStatus === "success") && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total guests</span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <UsersIcon className="size-4 text-muted-foreground" />
                          {guestCount} {guestCount === 1 ? "guest" : "guests"}
                        </span>
                      </div>
                    )}

                    {viewMode === "all" && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Guest</span>
                        <span className="font-medium">{b.customerName}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="mt-auto flex-row items-end justify-between border-t pt-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Duration
                      </span>
                      <span className="text-sm font-medium">
                        {isHourlyBooking ? "1 slot booking" : `${stayNights} night(s)`}
                      </span>
                    </div>

                    <div className="flex items-end gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Total
                        </span>
                        <span className="font-heading text-xl font-semibold tabular-nums">
                          R {b.total ? b.total.toLocaleString() : "0"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/bookings/${b.id}`} />}
                      >
                        Details
                        <ArrowRightIcon data-icon="inline-end" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step 2 of 2 &middot; Checkout
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
            Book your stay
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Change dates or property
        </Button>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        {/* Left Side: Summary & Package Select Tiles */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle>1. Stay configuration</CardTitle>
              <Badge variant="secondary">
                {isHourly ? (
                  <>
                    <ClockIcon className="size-3.5" />
                    Hourly slot
                  </>
                ) : (
                  <>
                    <BedDoubleIcon className="size-3.5" />
                    Nightly stay
                  </>
                )}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected destination
                </span>
                <span className="font-heading text-sm font-medium">
                  {property ? property.title : "Llandudno Villa"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">id: {propertyId}</span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {isHourly ? "Booking date and time slot" : "Check-in and check-out"}
                </span>
                {isHourly ? (
                  <>
                    <span className="font-heading text-sm font-medium">
                      {formatDisplayDate(from)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                      <ClockIcon className="size-3.5" />
                      Slot time:{" "}
                      {from.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </>
                ) : (
                  <span className="font-heading text-sm font-medium">
                    {formatDisplayDate(from)} &ndash; {formatDisplayDate(to)}
                  </span>
                )}

                <Separator className="my-1" />
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  {isHourly ? (
                    <>
                      <ClockIcon className="mt-0.5 size-3.5 shrink-0" />
                      Access granted only during the selected hourly slot. No overnight stay.
                    </>
                  ) : (
                    <>
                      <BedDoubleIcon className="mt-0.5 size-3.5 shrink-0" />
                      Standard overnight accommodation ({nights} night{nights > 1 ? "s" : ""}).
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Package Configuration - TILE SELECTOR */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle>2. Select package option</CardTitle>
              <CardDescription>Optional enhancements</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Package option" className="flex flex-col gap-3">
                {/* Option: Standard / No Package Tile */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPackageId === ""}
                  onClick={() => setSelectedPackageId("")}
                  className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                    selectedPackageId === ""
                      ? "border-primary bg-accent/50"
                      : "bg-card hover:border-primary/50"
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
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                          isSelected
                            ? "border-primary bg-accent/50"
                            : "bg-card hover:border-primary/50"
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
                            {pkg.category && <Badge variant="secondary">{pkg.category}</Badge>}
                            {pkg.multiplier && pkg.multiplier !== 1 && (
                              <Badge variant="outline">{pkg.multiplier}x multiplier</Badge>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Total calculations & Secure Book action */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>3. Cost estimate</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isHourly ? "Booking duration" : "Stay duration"}
                </span>
                <span className="font-medium tabular-nums">
                  {isHourly ? "1 slot" : `${nights} night(s)`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  {isHourly
                    ? `Slot cost (R ${basePricePerNight} x 1)`
                    : `Nightly cost (R ${basePricePerNight} x ${nights})`}
                </span>
                <span className="font-medium tabular-nums">R {baseCost.toLocaleString()}</span>
              </div>

              {selectedPackage && (
                <>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Package cost ({selectedPackage.name})
                    </span>
                    <span className="font-medium tabular-nums">
                      R {packagePrice.toLocaleString()}
                    </span>
                  </div>
                  {packageMultiplier > 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Package multiplier</span>
                      <span className="font-medium tabular-nums">x {packageMultiplier}</span>
                    </div>
                  )}
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Payable total (ZAR)</span>
                <span className="font-heading text-2xl font-semibold tabular-nums">
                  R {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Date Overlap block alert & visual resolver */}
              {dateConflict && (
                <div className="flex flex-col gap-4">
                  <Alert variant="destructive">
                    <TriangleAlertIcon />
                    <AlertTitle>Date conflict</AlertTitle>
                    <AlertDescription>{dateConflict}</AlertDescription>
                  </Alert>
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {isHourly
                        ? "Select an available date on the calendar below to update your booking date:"
                        : "Select an available date range on the calendar below to update your stay dates:"}
                    </p>
                    <CalendarPicker
                      selectedFromDate={savedDates?.fromDate.split("T")[0] || ""}
                      selectedToDate={savedDates?.toDate.split("T")[0] || ""}
                      bookings={bookingsList}
                      singleMonth={true}
                      bookingType={property?.bookingType}
                      onChange={handleUpdateDates}
                    />
                  </div>
                </div>
              )}

              {checkoutError && (
                <Alert variant="destructive">
                  <TriangleAlertIcon />
                  <AlertTitle>Checkout failed</AlertTitle>
                  <AlertDescription>{checkoutError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleBookNow}
                disabled={isSubmitting || !!dateConflict}
                className="w-full"
                size="lg"
              >
                {isSubmitting && <Spinner className="size-4" />}
                {isSubmitting ? "Generating Yoco transaction..." : "Confirm and pay via Yoco"}
              </Button>
            </CardFooter>
          </Card>

          {/* Checkout console logger */}
          {checkoutLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session log</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex max-h-40 flex-col gap-1.5 overflow-y-auto font-mono text-xs text-muted-foreground">
                  {checkoutLog.map((log, idx) => (
                    <li key={idx}>{log}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="size-6 text-primary" />
        </div>
      }
    >
      <AuthProvider>
        <BookingsCheckoutContent />
      </AuthProvider>
    </Suspense>
  );
}
