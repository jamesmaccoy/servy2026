"use client";

import React, { useState, useEffect } from "react";
import { formatDisplayDate } from "@/lib/utils";

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  bookingType?: string;
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

interface CalculateEstimateProps {
  basePricePerNight: number;
  fromDate: Date;
  toDate: Date;
  packageMultiplier: number;
  packageBaseRate: number;
}

export function calculateBookingTotal({
  basePricePerNight,
  fromDate,
  toDate,
  packageMultiplier,
  packageBaseRate,
}: CalculateEstimateProps): number {
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const baseCost = basePricePerNight * nights;
  const total = (baseCost + packageBaseRate) * packageMultiplier;

  return total;
}

interface SmartEstimateBlockProps {
  properties: Property[];
  selectedPropertyId: string;
  onPropertyChange: (id: string) => void;
}

export default function SmartEstimateBlock({
  properties,
  selectedPropertyId,
  onPropertyChange
}: SmartEstimateBlockProps) {
  const [bookingMode, setBookingMode] = useState<"predefined" | "custom">("predefined");

  // Dynamic Packages States
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);

  // Custom Stay Mode States
  const [customFromDate, setCustomFromDate] = useState<string>("2026-06-16");
  const [customToDate, setCustomToDate] = useState<string>("2026-06-19");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  
  // Date Conflict & Checkout States
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [dateConflict, setDateConflict] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutLog, setCheckoutLog] = useState<string[]>([]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Load packages for property
  useEffect(() => {
    if (!selectedPropertyId) return;

    const fetchPackages = async () => {
      setIsLoadingPackages(true);
      setPackagesError(null);
      try {
        const res = await fetch(`/api/packages?propertyId=${selectedPropertyId}`);
        const result = await res.json();
        if (result.success && result.data) {
          setPackages(result.data);
          if (result.data.length > 0) {
            setSelectedPackageId(result.data[0].id);
          } else {
            setSelectedPackageId("");
          }
        } else {
          setPackagesError("Failed to fetch packages.");
        }
      } catch (err: any) {
        setPackagesError(err.message || "Failed to query packages API.");
      } finally {
        setIsLoadingPackages(false);
      }
    };

    const fetchBookings = async () => {
      try {
        const res = await fetch(`/api/bookings?propertyId=${selectedPropertyId}`);
        const result = await res.json();
        if (result.success && result.data) {
          setExistingBookings(result.data);
        }
      } catch (err) {
        console.error("Failed to load property bookings:", err);
      }
    };

    fetchPackages();
    fetchBookings();
  }, [selectedPropertyId]);

  // Check for date conflicts
  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  
  useEffect(() => {
    if (!selectedPropertyId) return;

    const from = new Date(customFromDate);
    const to = new Date(customToDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      setDateConflict("Invalid date selection.");
      return;
    }

    // Overlap math: fromDate < booking.toDate && toDate > booking.fromDate
    const conflict = existingBookings.find(booking => {
      if (booking.paymentStatus === "failed" || booking.paymentStatus === "refunded") return false;
      const bStart = new Date(booking.fromDate);
      const bEnd = new Date(booking.toDate);
      return from < bEnd && to > bStart;
    });

    if (conflict) {
      const startStr = formatDisplayDate(conflict.fromDate);
      const endStr = formatDisplayDate(conflict.toDate);
      setDateConflict(`Conflict detected with existing booking (${startStr} - ${endStr}) by ${conflict.customerName}`);
    } else {
      setDateConflict(null);
    }
  }, [customFromDate, customToDate, existingBookings, selectedPropertyId]);

  // Calculate nights and pricing
  const isHourly = selectedProperty?.bookingType === "hourly";
  const stayHours = Math.max(
    1,
    Math.ceil(
      Math.abs(new Date(customToDate).getTime() - new Date(customFromDate).getTime()) /
        (1000 * 60 * 60)
    )
  );
  const stayNights = Math.max(
    1,
    Math.ceil(
      Math.abs(new Date(customToDate).getTime() - new Date(customFromDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const nights = isHourly ? stayHours : stayNights;

  const basePricePerNight = selectedProperty ? selectedProperty.basePricePerNight : 1500;
  
  let packageMultiplier = 1.0;
  let packageBaseRate = 0;
  let calculatedTotal = basePricePerNight * nights;

  if (bookingMode === "predefined" && selectedPackage) {
    packageMultiplier = selectedPackage.multiplier ?? 1.0;
    packageBaseRate = selectedPackage.baseRate ?? 0;
    calculatedTotal = selectedPackage.price;
  } else if (bookingMode === "custom") {
    // Custom stay calculation formula
    calculatedTotal = calculateBookingTotal({
      basePricePerNight,
      fromDate: new Date(customFromDate),
      toDate: new Date(customToDate),
      packageMultiplier,
      packageBaseRate,
    });
  }

  const handleBookAndPay = async () => {
    if (!customerName || !customerEmail) {
      alert("Please enter cardholder name and email address.");
      return;
    }
    if (dateConflict) {
      alert("Please resolve date conflicts first.");
      return;
    }

    setIsSubmitting(true);
    setCheckoutLog(["1. Initializing stay booking creation process...", "2. Contacting secure database..."]);

    try {
      // Create the booking record first (ensures date conflict block is enforced on server-side)
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          packageId: bookingMode === "predefined" ? selectedPackageId : null,
          customerName,
          customerEmail,
          fromDate: new Date(customFromDate).toISOString(),
          toDate: new Date(customToDate).toISOString(),
          total: calculatedTotal
        })
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok || !bookingResult.success) {
        throw new Error(bookingResult.error || "Database rejected booking request.");
      }

      setCheckoutLog(prev => [
        ...prev,
        "3. ✅ Booking recorded successfully in database (status: pending).",
        "4. Contacting Yoco gateway for package link creation..."
      ]);

      // Call generate checkout link API using the package's yocoId
      const targetType = bookingMode === "predefined" && selectedPackage ? selectedPackage.yocoId : "shack_stack";
      
      const linkResponse = await fetch("/api/v1/generate_checkout_link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: targetType })
      });

      const linkResult = await linkResponse.json();

      if (!linkResponse.ok || !linkResult.status) {
        throw new Error(linkResult.data || "Failed to generate payment link.");
      }

      const redirectUrl = linkResult.data.redirectUrl;
      setCheckoutLog(prev => [
        ...prev,
        `5. ✅ Payment link generated successfully: "${redirectUrl.substring(0, 50)}..."`,
        "6. Redirecting to payment gateway..."
      ]);

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);

    } catch (err: any) {
      setCheckoutLog(prev => [...prev, `❌ Failure: ${err.message}`]);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      {/* Header Info */}
      <div className="mb-6 border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Smart Stay Bookings</h2>
          <p className="text-xs text-white/50">Dynamic Price Estimator & Payment Redirection</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Base Price</span>
          <p className="text-sm font-extrabold text-teal-400">R {basePricePerNight.toLocaleString()}/{isHourly ? "hour" : "night"}</p>
        </div>
      </div>

      {/* Property Selector Selector */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
          Choose Property
        </label>
        <select
          value={selectedPropertyId}
          onChange={(e) => onPropertyChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-teal-500 focus:outline-none"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id} className="bg-zinc-900">
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Booking Mode Selector */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1 border border-white/5">
        <button
          onClick={() => setBookingMode("predefined")}
          className={`rounded-lg py-2.5 text-xs font-bold transition-all ${
            bookingMode === "predefined"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-teal-500/20"
              : "text-white/60 hover:text-white"
          }`}
        >
          🎁 Package Deals ({packages.length})
        </button>
        <button
          onClick={() => setBookingMode("custom")}
          className={`rounded-lg py-2.5 text-xs font-bold transition-all ${
            bookingMode === "custom"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-teal-500/20"
              : "text-white/60 hover:text-white"
          }`}
        >
          ⚙️ Custom Stay Rates
        </button>
      </div>

      <div className="space-y-4">
        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Your Full Name *</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none placeholder:text-zinc-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Your Email Address *</label>
            <input
              type="email"
              placeholder="e.g. john@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none placeholder:text-zinc-700"
            />
          </div>
        </div>

        {/* Date Selections */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Check-in Date *</label>
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Check-out Date *</label>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Package Deal Configuration Details */}
        {bookingMode === "predefined" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-white/50">Choose Package Offer</label>
              {isLoadingPackages ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-teal-500 border-white/10" />
                </div>
              ) : packagesError ? (
                <div className="text-red-400 text-xs py-2">⚠️ {packagesError}</div>
              ) : packages.length === 0 ? (
                <div className="text-zinc-500 text-xs py-2">No packages defined for this property.</div>
              ) : (
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id} className="bg-zinc-900">
                      {pkg.name} (R {pkg.price.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedPackage && (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-teal-400">
                      {selectedPackage.category} Category
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{selectedPackage.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block">Fixed Fee</span>
                    <p className="text-base font-black text-teal-400">R {selectedPackage.price.toLocaleString()}</p>
                  </div>
                </div>
                {selectedPackage.description && (
                  <p className="text-xs text-zinc-400 border-t border-white/5 pt-2 leading-relaxed">{selectedPackage.description}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom stay breakdown calculation display */}
        {bookingMode === "custom" && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>{isHourly ? "Hours Selected:" : "Nights Selected:"}</span>
              <span className="font-bold text-white">
                {isHourly ? `${nights} hour(s)` : `${nights} night(s)`}
              </span>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>{isHourly ? `Base Rate (R ${basePricePerNight} × ${nights} hours):` : `Base Rate (R ${basePricePerNight} × ${nights} nights):`}</span>
              <span className="font-bold text-white">R {(basePricePerNight * nights).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Package Multiplier:</span>
              <span className="font-bold text-white">1.0x</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between items-center mt-2">
              <span className="text-sm font-bold text-white">Calculated Custom Cost:</span>
              <span className="text-xl font-black text-teal-400">R {calculatedTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Date overlap warning alert */}
      {dateConflict && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-center text-xs font-bold text-red-400 animate-pulse">
          ⚠️ {dateConflict}
        </div>
      )}

      {/* Book & Pay redirection initiator */}
      <button
        onClick={handleBookAndPay}
        disabled={isSubmitting || !!dateConflict}
        className={`mt-6 w-full rounded-2xl py-4 text-center text-sm font-bold text-white transition-all ${
          !!dateConflict
            ? "bg-neutral-800 text-white/30 cursor-not-allowed border border-neutral-700"
            : "bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 shadow-xl shadow-teal-500/20 hover:scale-[1.02] hover:brightness-110 active:scale-95"
        }`}
      >
        {isSubmitting ? "Enrolling Stay Booking..." : "Book & Pay via Yoco Checkout"}
      </button>

      {/* System output steps logger */}
      {checkoutLog.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/5 bg-black/60 p-4 font-mono text-[10px] text-teal-300 space-y-1 max-h-40 overflow-y-auto">
          <div className="text-white/40 mb-1 border-b border-white/5 pb-1 font-sans">Checkout Session Process Logs</div>
          {checkoutLog.map((log, idx) => (
            <div key={idx}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
