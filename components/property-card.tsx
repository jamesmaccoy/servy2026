"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRightIcon, ClockIcon, MoonIcon, PackageIcon, PlusIcon } from "lucide-react"
import { formatZar, rateLabel, resolveBookingType, type Property, type PropertyPackage } from "@/lib/types"

interface PropertyCardProps {
    property: Property
    packages: PropertyPackage[]
    onOpenPackages: () => void
}

export function PropertyCard({ property, packages, onOpenPackages }: PropertyCardProps) {
    const bookingType = resolveBookingType(property)
    const isHourly = bookingType === "hourly"
    const standardCount = packages.filter((p) => p.category === "standard").length
    const addonCount = packages.filter((p) => p.category === "addon").length
    const hasPackages = packages.length > 0

    return (
        <Card className="flex flex-col gap-0 overflow-hidden p-0">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                {property.images?.[0] ? (
                    <img
                        src={property.images[0] || "/placeholder.svg"}
                        alt={property.title || property.name || ""}
                        className="size-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-xs font-medium text-muted-foreground">
                        No image
                    </div>
                )}

                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/75 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-background backdrop-blur-sm">
                        {isHourly ? (
                            <ClockIcon className="size-3" aria-hidden="true" />
                        ) : (
                            <MoonIcon className="size-3" aria-hidden="true" />
                        )}
                        {isHourly ? "Hourly slots" : "Nightly stay"}
                    </span>

                    {!property.bookingType && (
                        <span
                            className="rounded-full bg-background/85 px-2 py-1 text-[10px] font-bold tracking-wide uppercase text-muted-foreground backdrop-blur-sm"
                            title="This record has no bookingType field — defaulting to nightly."
                        >
                            Inferred
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h3 className="text-pretty text-base leading-snug font-bold text-foreground">{property.title || property.name}</h3>
                        <p className="mt-0.5 text-xs font-semibold text-primary">
                            {property.location || <span className="text-muted-foreground">No location set</span>}
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                            {rateLabel(property)}
                        </p>
                        <p className="text-lg leading-tight font-bold text-foreground">{formatZar(property.basePricePerNight)}</p>
                    </div>
                </div>

                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {property.description || "No description yet."}
                </p>

                {isHourly && property.slots && property.slots.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {property.slots.map((slot) => (
                            <Badge key={slot} variant="secondary" className="font-mono text-[10px]">
                                {slot}
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                    <Button
                        variant={hasPackages ? "secondary" : "outline"}
                        size="sm"
                        onClick={onOpenPackages}
                        className="font-semibold"
                    >
                        {hasPackages ? (
                            <>
                                <PackageIcon data-icon="inline-start" aria-hidden="true" />
                                {packages.length} package{packages.length === 1 ? "" : "s"}
                            </>
                        ) : (
                            <>
                                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                                Add packages
                            </>
                        )}
                    </Button>

                    {hasPackages && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                            {standardCount} standard · {addonCount} add-on
                        </p>
                    )}
                </div>

        <Link
          href={`/admin/properties/${property.id}`}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-mb-1 justify-start px-0 text-xs font-bold tracking-wide uppercase text-muted-foreground hover:bg-transparent hover:text-primary",
          })}
        >
          Configure
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Link>
            </div>
        </Card>
    )
}