"use client"

import { useState } from "react"
import { formatZar, type Property, type PropertyPackage } from "@/lib/types"
import { ChevronDownIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SuggestedPackagesProps {
  suggested: PropertyPackage[]
  properties: Property[]
  onCopy: (propertyId: string, pkg: PropertyPackage) => void
}

export function SuggestedPackages({ suggested, properties, onCopy }: SuggestedPackagesProps) {
  const [expanded, setExpanded] = useState(false)
  const total = suggested.length

  if (total === 0) return null

  return (
    <section className="mt-6 rounded-xl border border-primary/30 bg-primary/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <SparklesIcon className="size-4 shrink-0 text-primary animate-pulse" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            {total} Suggested Package Template{total === 1 ? "" : "s"} Available
          </p>
          <p className="text-xs text-muted-foreground">
            Reuse popular package configurations from other listings in the community.
          </p>
        </div>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-primary/20 px-4 py-4 max-h-[380px] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suggested.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/45 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={pkg.category === "standard" ? "secondary" : "outline"}
                        className="text-[9px] font-bold tracking-wider uppercase animate-fade-in"
                      >
                        {pkg.category === "standard" ? "Standard" : "Add-on"}
                      </Badge>
                      {pkg.multiplier !== 1 && (
                        <Badge variant="outline" className="text-[9px]">
                          {pkg.multiplier}x multiplier
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary">{formatZar(pkg.price)}</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-foreground">{pkg.name}</h4>
                  {pkg.description ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {pkg.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground italic">No description provided.</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <select
                    onChange={(e) => {
                      const propId = e.target.value
                      if (propId) {
                        onCopy(propId, pkg)
                        // Reset selection
                        e.target.value = ""
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:border-primary/40 transition-colors focus:outline-none cursor-pointer"
                  >
                    <option value="">➕ Use this template...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}