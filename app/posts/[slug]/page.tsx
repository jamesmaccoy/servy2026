"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, AuthProvider } from "@/components/auth";
import CalendarPicker from "@/components/CalendarPicker";
import { formatDisplayDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  GiftIcon,
  ImageOffIcon,
  MapPinIcon,
  TriangleAlertIcon,
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  description?: string;
  images?: string[];
  bookingType?: string;
  slots?: string[];
  location?: string;
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

interface PropertyDetailsContentProps {
  slug: string;
}

function PropertyDetailsContent({ slug }: PropertyDetailsContentProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Page States
  const [property, setProperty] = useState<Property | null>(null);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [savedDates, setSavedDates] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [latestEstimate, setLatestEstimate] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [copiedEstimateUrl, setCopiedEstimateUrl] = useState(false);

  // Date Picker Inputs
  const [fromDate, setFromDate] = useState("2026-06-16");
  const [toDate, setToDate] = useState("2026-06-19");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const loadPropertyData = async () => {
    try {
      const propRes = await fetch(`/api/posts/${slug}`);
      const propResult = await propRes.json();
      if (propResult.success && propResult.data) {
        const found = propResult.data;
        setProperty(found);

        const pkgRes = await fetch(`/api/packages?propertyId=${found.id}`);
        const pkgResult = await pkgRes.json();
        if (pkgResult.success && pkgResult.data) {
          setPackages(pkgResult.data);
        }

        const bksRes = await fetch(`/api/bookings?propertyId=${found.id}`);
        const bksResult = await bksRes.json();
        if (bksResult.success && bksResult.data) {
          setBookings(bksResult.data);
        }
      }
    } catch (err) {
      console.error("Failed to query property data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPropertyData();
  }, [slug]);

  // Load user profile dates and latest estimate
  useEffect(() => {
    if (authLoading || !user) {
      setLatestEstimate(null);
      return;
    }

    const fetchUserDatesAndEstimate = async () => {
      try {
        const res = await fetch(`/api/user/dates?userId=${user.uid}`);
        const result = await res.json();
        if (result.success && result.data) {
          setSavedDates(result.data);
          setFromDate(result.data.fromDate.split("T")[0]);
          setToDate(result.data.toDate.split("T")[0]);
        }

        const estRes = await fetch(`/api/estimates/latest?userId=${user.uid}`);
        const estResult = await estRes.json();
        if (estResult.success && estResult.data) {
          setLatestEstimate(estResult.data);
        }
      } catch (err) {
        console.error("Failed to load user dates or estimate:", err);
      }
    };

    fetchUserDatesAndEstimate();
  }, [user, authLoading]);

  // Extract saved start time in hourly mode
  useEffect(() => {
    if (property?.bookingType === "hourly") {
      if (savedDates) {
        try {
          const fD = new Date(savedDates.fromDate);
          if (!isNaN(fD.getTime())) {
            const pad = (num: number) => String(num).padStart(2, "0");
            const slotTime = `${pad(fD.getHours())}:${pad(fD.getMinutes())}`;
            setSelectedSlot(slotTime);
          }
        } catch (err) {
          console.error("Failed to parse start time slot:", err);
        }
      } else if (property.slots && property.slots.length > 0 && !selectedSlot) {
        setSelectedSlot(property.slots[0]);
      }
    }
  }, [property, savedDates, selectedSlot]);

  const handleShareEstimate = () => {
    if (!latestEstimate) return;
    const inviteUrl = `${window.location.origin}/i/${latestEstimate.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedEstimateUrl(true);
    setTimeout(() => setCopiedEstimateUrl(false), 2500);
  };

  const handleSaveDates = async () => {
    if (!user) {
      alert("Please sign in to save your dates.");
      return;
    }
    if (!property) {
      alert("Property details are still loading.");
      return;
    }

    let start: Date;
    let end: Date;

    if (property.bookingType === "hourly") {
      const slotTime = selectedSlot || (property.slots && property.slots.length > 0 ? property.slots[0] : "10:00");
      const [h, m] = slotTime.split(":").map(Number);
      start = new Date(`${fromDate}T00:00:00`);
      start.setHours(h, m, 0, 0);

      end = new Date(start.getTime());
      end.setHours(end.getHours() + 4);
    } else {
      start = new Date(fromDate);
      end = new Date(toDate);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      setDateError("Invalid date selection.");
      return;
    }

    setDateError(null);
    setIsSavingDates(true);

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
        throw new Error(result.error || "Failed to save dates.");
      }

      setSavedDates(result.data);

      let estimatedTotal = 0;
      if (property.bookingType === "hourly") {
        estimatedTotal = property.basePricePerNight;
      } else {
        const stayNights = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        estimatedTotal = property.basePricePerNight * stayNights;
      }

      const estRes = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          packageId: null,
          customerName: user.displayName || user.email?.split("@")[0] || "Authenticated Guest",
          customerEmail: user.email || "",
          customerId: user.uid,
          fromDate: start.toISOString(),
          toDate: end.toISOString(),
          total: estimatedTotal,
        }),
      });

      const estResult = await estRes.json();
      if (estRes.ok && estResult.success) {
        setLatestEstimate(estResult.estimate);
        router.push(`/estimate/${estResult.estimate.id}`);
      }
    } catch (err: any) {
      setDateError(err.message);
    } finally {
      setIsSavingDates(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
        <Spinner className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Retrieving listing information</span>
      </div>
    );
  }

  if (!property) {
    return (
      <Empty className="mx-auto my-20 max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Listing not found</EmptyTitle>
          <EmptyDescription>
            {`The property matching "${slug}" could not be located.`}
          </EmptyDescription>
        </EmptyHeader>
        <Button nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to all destinations
        </Button>
      </Empty>
    );
  }

  const datesLocked = !!savedDates;
  let nights = 0;
  let hours = 0;
  let baseStayCost = 0;

  if (datesLocked && savedDates) {
    const start = new Date(savedDates.fromDate);
    const end = new Date(savedDates.toDate);
    if (property.bookingType === "hourly") {
      hours = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60)));
      baseStayCost = property.basePricePerNight;
    } else {
      nights = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      baseStayCost = property.basePricePerNight * nights;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 font-sans sm:px-6 lg:px-8">
      {/* Navigation Header */}
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to all destinations
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
        {/* Left Column: Property Details & Media */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card className="gap-0 pt-0">
            {/* Gallery */}
            <div className="relative aspect-video overflow-hidden bg-muted">
              {property.images && property.images.length > 0 ? (
                <img
                  src={property.images[activeImageIndex] || "/placeholder.svg"}
                  alt={`${property.title} gallery view`}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageOffIcon className="size-6" />
                  <span className="text-xs">No image available</span>
                </div>
              )}

              <Badge variant="secondary" className="absolute top-3 left-3">
                {property.bookingType === "hourly" ? "Hourly slot" : "Nightly stay"}
              </Badge>
            </div>

            {/* Thumbnails */}
            {property.images && property.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-(--card-spacing) pt-(--card-spacing)">
                {property.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                    aria-current={idx === activeImageIndex}
                    className={`relative aspect-video w-20 shrink-0 overflow-hidden rounded-md ring-2 transition-opacity ${
                      idx === activeImageIndex
                        ? "ring-primary"
                        : "opacity-60 ring-transparent hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img || "/placeholder.svg"}
                      alt=""
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <CardHeader className="pt-(--card-spacing)">
              <CardTitle className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {property.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5" />
                {property.location || "Llandudno, Cape Town"}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-(--card-spacing)">
              <Separator />

              {/* Price Highlights */}
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {property.bookingType === "hourly" ? "Hourly slot price" : "Nightly base rate"}
                  </span>
                  <p className="font-heading text-2xl font-semibold">
                    R {property.basePricePerNight.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">
                      {property.bookingType === "hourly" ? "/slot" : "/night"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Reference</span>
                  <p className="font-mono text-sm">{property.slug}</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="flex flex-col gap-1.5 pt-4">
                <span className="text-xs text-muted-foreground">About this property</span>
                <p className="text-sm leading-relaxed whitespace-pre-line text-pretty">
                  {property.description ||
                    "Experience Llandudno at its finest. This property features coastline scenery, proximity to the beach, luxury amenities, and private decks. Connect package options and add-ons at checkout."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Package Deals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GiftIcon className="size-4 text-muted-foreground" />
                Available packages
              </CardTitle>
            </CardHeader>

            <CardContent>
              {packages.filter((pkg) => pkg.category !== "addon").length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No specific package configurations created for this property yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {packages
                    .filter((pkg) => pkg.category !== "addon")
                    .map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4"
                      >
                        <div className="flex flex-col items-start gap-1.5">
                          {pkg.category && <Badge variant="outline">{pkg.category}</Badge>}
                          <h4 className="font-heading text-sm font-medium">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-xs text-muted-foreground">Price</span>
                          <p className="font-heading text-sm font-semibold">
                            R {pkg.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Stay Scheduler & Booking Block */}
        <div className="sticky top-6 flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                Stay planner
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* Active Estimate Sharing Widget */}
              {latestEstimate && (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Active estimate ready
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {latestEstimate.token ? `${latestEstimate.token.slice(0, 8)}…` : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-heading text-sm font-semibold">
                      R {latestEstimate.total ? latestEstimate.total.toLocaleString() : "0"}
                    </div>
                    <Button size="sm" variant="outline" onClick={handleShareEstimate}>
                      {copiedEstimateUrl ? (
                        <CheckIcon data-icon="inline-start" />
                      ) : (
                        <CopyIcon data-icon="inline-start" />
                      )}
                      {copiedEstimateUrl ? "Copied" : "Share link"}
                    </Button>
                  </div>
                </div>
              )}

              {!user ? (
                <div className="flex flex-col gap-4 py-2 text-center">
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    Sign in or register to lock check-in dates and access package booking options.
                  </p>
                  <Button className="w-full" nativeButton={false} render={<Link href="/login" />}>
                    Sign in to reserve
                  </Button>
                </div>
              ) : datesLocked ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-4">
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {property.bookingType === "hourly" ? "Selected slot" : "Selected stay"}
                      </span>
                      <span className="text-right font-medium">
                        {property.bookingType === "hourly" ? (
                          <>
                            {formatDisplayDate(savedDates!.fromDate)}
                            <br />
                            <span className="font-mono text-muted-foreground">
                              {new Date(savedDates!.fromDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>
                          </>
                        ) : (
                          `${formatDisplayDate(savedDates!.fromDate)} – ${formatDisplayDate(savedDates!.toDate)}`
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {property.bookingType === "hourly"
                          ? "1 slot"
                          : `${nights} night${nights === 1 ? "" : "s"}`}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">Estimated base total</span>
                      <span className="font-heading text-base font-semibold">
                        R {baseStayCost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    nativeButton={false}
                    render={
                      <Link
                        href={
                          latestEstimate
                            ? `/estimate/${latestEstimate.id}`
                            : `/bookings?propertyId=${property.id}`
                        }
                      />
                    }
                  >
                    Select package &amp; pay
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setSavedDates(null)}
                  >
                    Change stay dates
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground text-pretty">
                    {property.bookingType === "hourly"
                      ? "Select booking date and time to persist to your profile."
                      : "Select stay ranges to persist to your guest profile."}
                  </p>

                  {dateError && (
                    <Alert variant="destructive">
                      <TriangleAlertIcon />
                      <AlertTitle>Invalid selection</AlertTitle>
                      <AlertDescription>{dateError}</AlertDescription>
                    </Alert>
                  )}

                  <CalendarPicker
                    selectedFromDate={fromDate}
                    selectedToDate={toDate}
                    bookings={bookings}
                    singleMonth={true}
                    bookingType={property.bookingType}
                    onChange={(start, end) => {
                      setFromDate(start);
                      setToDate(end);
                    }}
                  />

                  {property.bookingType === "hourly" && (
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Available slots
                      </span>
                      {property.slots && property.slots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {property.slots.map((slotTime) => {
                            const isSelected = selectedSlot === slotTime;
                            const [h, m] = slotTime.split(":");
                            const hourNum = parseInt(h);
                            const ampm = hourNum >= 12 ? "PM" : "AM";
                            const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
                            const label = `${displayHour}:${m} ${ampm}`;

                            return (
                              <Button
                                key={slotTime}
                                type="button"
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                aria-pressed={isSelected}
                                onClick={() => setSelectedSlot(slotTime)}
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No available slots configured.
                        </p>
                      )}
                    </div>
                  )}

                  <Button className="w-full" onClick={handleSaveDates} disabled={isSavingDates}>
                    {isSavingDates && <Spinner data-icon="inline-start" />}
                    {isSavingDates ? "Saving selection" : "Confirm & save booking"}
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

export default function PropertyDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      }
    >
      <AuthProvider>
        <PropertyDetailsContent slug={unwrappedParams.slug} />
      </AuthProvider>
    </Suspense>
  );
}
