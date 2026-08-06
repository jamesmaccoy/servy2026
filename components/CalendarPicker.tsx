"use client";

import React, { useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
  source?: string;
}

interface CalendarPickerProps {
  selectedFromDate: string; // YYYY-MM-DD
  selectedToDate: string; // YYYY-MM-DD
  bookings: Booking[];
  onChange: (fromDate: string, toDate: string) => void;
  singleMonth?: boolean;
  bookingType?: string;
}

export default function CalendarPicker({
  selectedFromDate,
  selectedToDate,
  bookings,
  onChange,
  singleMonth = false,
  bookingType = "nightly",
}: CalendarPickerProps) {
  // Current calendar month view (starts with the check-in date's month or current month)
  const initialDate = selectedFromDate ? new Date(selectedFromDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Helper to format date as YYYY-MM-DD in local time
  const formatDateString = (year: number, month: number, day: number): string => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const todayStr = (() => {
    const d = new Date();
    return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const getBookingForDate = (year: number, month: number, day: number): Booking | null => {
    const date = new Date(year, month, day);
    const time = date.getTime();

    for (const b of bookings) {
      if (b.paymentStatus === "failed" || b.paymentStatus === "refunded") continue;
      const start = new Date(b.fromDate.split("T")[0]); // compare dates only
      const end = new Date(b.toDate.split("T")[0]);

      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

      if (bookingType === "hourly") {
        if (startTime === endTime) {
          if (time === startTime) {
            return b;
          }
        } else {
          if (time >= startTime && time < endTime) {
            return b;
          }
        }
      } else {
        // Block night of check-in up to night before check-out
        if (time >= startTime && time < endTime) {
          return b;
        }
      }
    }
    return null;
  };

  // Generate calendar days for a given month and year
  const getDaysInMonth = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDayIndex, totalDays };
  };

  // Render a single month view
  const renderMonth = (year: number, month: number) => {
    const { firstDayIndex, totalDays } = getDaysInMonth(year, month);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const days: React.JSX.Element[] = [];

    // Empty cells for offset before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-full aspect-square max-w-[44px]" />
      );
    }

    // Days cells
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDateString(year, month, day);
      const booking = getBookingForDate(year, month, day);
      const isBooked = !!booking;

      const isSelectedFrom = selectedFromDate === dateStr;
      const isSelectedTo = selectedToDate === dateStr;

      // Check if day is inside selected range
      const isSelectedRange = (() => {
        if (!selectedFromDate || !selectedToDate) return false;
        return dateStr > selectedFromDate && dateStr < selectedToDate;
      })();

      const isToday = todayStr === dateStr;

      // Click handler for day selection
      const handleDayClick = () => {
        if (isBooked) return;

        setRangeError(null);

        if (bookingType === "hourly") {
          onChange(dateStr, dateStr);
        } else {
          // Selection Logic
          if (!selectedFromDate || (selectedFromDate && selectedToDate)) {
            // Select Check-in
            onChange(dateStr, "");
          } else {
            // Select Check-out
            if (dateStr > selectedFromDate) {
              // Ensure no booked days inside the selected range
              let hasOverlap = false;
              let current = new Date(selectedFromDate);
              const target = new Date(dateStr);

              while (current < target) {
                const checkB = getBookingForDate(current.getFullYear(), current.getMonth(), current.getDate());
                if (checkB) {
                  hasOverlap = true;
                  break;
                }
                current.setDate(current.getDate() + 1);
              }

              if (hasOverlap) {
                setRangeError(
                  "The selected range overlaps with an existing booking. Please choose another range."
                );
                onChange(dateStr, "");
              } else {
                onChange(selectedFromDate, dateStr);
              }
            } else {
              // Selected a date before check-in date: reset check-in to this date
              onChange(dateStr, "");
            }
          }
        }
      };

      // Determine label & styles for tooltip/indicator
      let tooltipText = "";
      if (isBooked && booking) {
        if (booking.source === "gcal") {
          tooltipText = `Unavailable: ${booking.customerName}`;
        } else if (booking.source === "airbnb") {
          tooltipText = `Airbnb: Blocked Dates`;
        } else {
          tooltipText = `Booked by ${booking.customerName}`;
        }
      } else if (isToday) {
        tooltipText = "Today";
      }

      // Styles. The continuous range band is painted on the wrapper (which has no
      // gap between cells) so a multi-day stay reads as one connected band rather
      // than a row of disconnected pills.
      const isRangeInterior = isSelectedRange && !isSelectedFrom && !isSelectedTo;
      const hasRange = Boolean(selectedFromDate && selectedToDate);
      let bandClass = "absolute inset-y-0.5 -inset-x-px bg-accent ";
      if (isSelectedFrom && hasRange) {
        bandClass += "left-1/2 rounded-l-full";
      } else if (isSelectedTo && hasRange) {
        bandClass += "right-1/2 rounded-r-full";
      }

      let dayClass =
        "relative flex aspect-square w-full items-center justify-center rounded-full text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ";
      if (isBooked) {
        dayClass += "cursor-not-allowed text-destructive/70 line-through";
      } else if (isSelectedFrom || isSelectedTo) {
        dayClass += "bg-primary font-semibold text-primary-foreground";
      } else if (isRangeInterior) {
        dayClass += "text-accent-foreground";
      } else if (isToday) {
        dayClass += "ring-1 ring-inset ring-primary/60 text-foreground hover:bg-accent";
      } else {
        dayClass += "text-foreground hover:bg-accent";
      }

      days.push(
        <div key={dateStr} className="relative group w-full max-w-[44px]">
          {/* Continuous selection band behind the day cells */}
          {(isRangeInterior || ((isSelectedFrom || isSelectedTo) && hasRange)) && (
            <span aria-hidden="true" className={bandClass} />
          )}
          <button
            type="button"
            onClick={handleDayClick}
            disabled={isBooked}
            aria-label={tooltipText ? `${dateStr}. ${tooltipText}` : dateStr}
            aria-pressed={isSelectedFrom || isSelectedTo || isSelectedRange}
            className={dayClass}
          >
            {day}

            {/* Visual indicator for booked/blocked dates */}
            {isBooked && (
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-destructive"
              />
            )}
          </button>

          {/* Tooltip */}
          {tooltipText && (
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[200px] -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-center text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              {tooltipText}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Month Header */}
        <div className="border-b pb-2.5 text-center font-heading text-sm font-medium">
          {monthNames[month]} {year}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 justify-items-center gap-y-1">
          {/* Weekday headers */}
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
            <div
              key={dayName}
              className="flex h-6 w-full max-w-[44px] items-center justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {dayName}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  // Show two consecutive months
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthVal = currentMonth === 11 ? 0 : currentMonth + 1;

  return (
    <div className="flex w-full flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground">
      {/* Calendar Navigation */}
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </Button>

        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarIcon className="size-4" />
          {bookingType === "hourly" ? "Time-specific calendar" : "Availability calendar"}
        </span>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </Button>
      </div>

      {rangeError && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{rangeError}</AlertDescription>
        </Alert>
      )}

      {/* Responsive grids for two months */}
      <div className={`grid gap-8 ${singleMonth ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 md:gap-12"}`}>
        {renderMonth(currentYear, currentMonth)}
        {!singleMonth && renderMonth(nextMonthYear, nextMonthVal)}
      </div>

      {/* Date display legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3.5 rounded-sm bg-primary" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-destructive/70 line-through">
              00
            </span>
            <span>Unavailable</span>
          </div>
        </div>

        {selectedFromDate && (
          <p>
            {bookingType === "hourly" ? (
              <>
                Selected date:{" "}
                <strong className="font-medium text-foreground">{selectedFromDate}</strong>
              </>
            ) : (
              <>
                Stay: <strong className="font-medium text-foreground">{selectedFromDate}</strong>
                {selectedToDate ? (
                  <>
                    {" "}
                    to <strong className="font-medium text-foreground">{selectedToDate}</strong>
                  </>
                ) : (
                  " (select check-out)"
                )}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
