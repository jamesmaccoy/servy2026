"use client"

import { useMemo, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { PackageForm, type PackageDraft } from "@/components/package-form"
import { cn } from "@/lib/utils"
import { formatZar, type PropertyPackage, type Property } from "@/lib/types"
import { PackageIcon, PencilIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

interface PackageSheetProps {
    property: Property | null
    packages: PropertyPackage[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreate: (propertyId: string, draft: PackageDraft) => void
    onUpdate: (packageId: string, draft: PackageDraft) => void
    onDelete: (packageId: string) => void
    onToggle: (packageId: string, isEnabled: boolean) => void
    onReassign: (packageId: string, propertyId: string) => void
    userPlan?: string
}

function effectivePrice(pkg: PropertyPackage) {
    return Math.round(pkg.baseRate + pkg.price * pkg.multiplier)
}

function PackageRow({
    pkg,
    propertyId,
    isEditing,
    existingIds,
    onEdit,
    onCancelEdit,
    onSave,
    onDelete,
    onToggle,
    onReassign,
    userPlan,
}: {
    pkg: PropertyPackage
    propertyId: string
    isEditing: boolean
    existingIds: string[]
    onEdit: () => void
    onCancelEdit: () => void
    onSave: (draft: PackageDraft) => void
    onDelete: () => void
    onToggle: (isEnabled: boolean) => void
    onReassign: () => void
    userPlan?: string
}) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const mismatched = pkg.propertyId !== propertyId
    const adjusted = pkg.multiplier !== 1 || pkg.baseRate !== 0

    if (isEditing) {
        return <PackageForm initial={pkg} existingIds={existingIds} onCancel={onCancelEdit} onSave={onSave} userPlan={userPlan} />
    }

    return (
        <div
            className={cn(
                "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-opacity",
                !pkg.isEnabled && "opacity-60",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                            variant={pkg.category === "standard" ? "secondary" : "outline"}
                            className="text-[10px] font-bold tracking-wider uppercase"
                        >
                            {pkg.category === "standard" ? "Standard" : "Add-on"}
                        </Badge>
                        {!pkg.isEnabled && (
                            <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase">
                                Hidden
                            </Badge>
                        )}
                        {!pkg.yocoId && (
                            <Badge variant="destructive" className="text-[10px] font-bold tracking-wider uppercase">
                                No Yoco ID
                            </Badge>
                        )}
                    </div>
                    <h4 className="text-pretty text-sm leading-snug font-bold text-foreground">{pkg.name}</h4>
                    <code className="font-mono text-[11px] text-muted-foreground">id: {pkg.id}</code>
                </div>

                <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Rate</p>
                    <p className="text-base leading-tight font-bold text-foreground">{formatZar(pkg.price)}</p>
                    {adjusted && (
                        <p className="mt-0.5 font-mono text-[11px] text-primary">→ {formatZar(effectivePrice(pkg))}</p>
                    )}
                </div>
            </div>

            {pkg.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{pkg.description}</p>
            ) : (
                <p className="text-sm text-muted-foreground italic">No description — guests will see an empty card.</p>
            )}

            {mismatched && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                    <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                    <div className="flex-1">
                        <p className="text-[11px] leading-relaxed font-medium text-foreground">
                            Stored under legacy id <code className="font-mono">{pkg.propertyId}</code>.
                        </p>
                        <Button variant="ghost" size="sm" onClick={onReassign} className="mt-1 h-auto p-0 text-[11px] font-bold text-destructive hover:bg-transparent hover:underline">
                            Reassign to {propertyId}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div className="flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={pkg.isEnabled}
                            onCheckedChange={(checked) => onToggle(Boolean(checked))}
                            aria-label={`${pkg.isEnabled ? "Hide" : "Show"} ${pkg.name}`}
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            {pkg.isEnabled ? "Live" : "Hidden"}
                        </span>
                    </label>
                    <p className="font-mono text-[11px] text-muted-foreground">
                        ×{pkg.multiplier} · base {formatZar(pkg.baseRate)}
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    {confirmDelete ? (
                        <>
                            <span className="text-[11px] font-semibold text-muted-foreground">Delete?</span>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-7 px-2 text-xs">
                                No
                            </Button>
                            <Button variant="destructive" size="sm" onClick={onDelete} className="h-7 px-2 text-xs font-bold">
                                Yes, delete
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={onEdit} className="h-7 px-2 text-xs font-semibold">
                                <PencilIcon className="mr-1 size-3" aria-hidden="true" />
                                Edit
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDelete(true)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                aria-label={`Delete ${pkg.name}`}
                            >
                                <Trash2Icon className="size-3.5" aria-hidden="true" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export function PackageSheet({
    property,
    packages,
    open,
    onOpenChange,
    onCreate,
    onUpdate,
    onDelete,
    onToggle,
    onReassign,
    userPlan,
}: PackageSheetProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const existingIds = useMemo(() => packages.map((p) => p.id), [packages])
    const standard = packages.filter((p) => p.category === "standard")
    const addons = packages.filter((p) => p.category === "addon" || p.category === "hosted" || p.category === "special")
    const liveValue = packages.filter((p) => p.isEnabled).reduce((sum, p) => sum + effectivePrice(p), 0)

    function close(next: boolean) {
        if (!next) {
            setEditingId(null)
            setCreating(false)
        }
        onOpenChange(next)
    }

    if (!property) return null

    const sections = [
        { key: "standard", label: "Standard packages", hint: "Replace the base rate", items: standard },
        { key: "addon", label: "Add-ons & Premium", hint: "Billed on top of the booking", items: addons },
    ]

    return (
        <Sheet open={open} onOpenChange={close}>
            <SheetContent
                side={isMobile ? "bottom" : "right"}
                className={cn(
                    "flex flex-col w-full gap-0 overflow-hidden p-0",
                    isMobile ? "data-[side=bottom]:h-[80vh] rounded-t-3xl border-t" : "h-full data-[side=right]:sm:max-w-lg"
                )}
            >
                <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
                    <p className="text-[11px] font-bold tracking-wider uppercase text-primary">Property packages</p>
                    <SheetTitle className="text-xl font-bold">{property.name}</SheetTitle>
                    <SheetDescription className="text-xs">
                        {packages.length === 0
                            ? "No packages configured"
                            : `${packages.length} package${packages.length === 1 ? "" : "s"} · ${formatZar(liveValue)} live value`}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                        {standard.length} standard · {addons.length} add-on
                    </p>
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingId(null)
                            setCreating(true)
                        }}
                        disabled={creating}
                        className="font-semibold"
                    >
                        <PlusIcon data-icon="inline-start" aria-hidden="true" />
                        Add package
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="flex flex-col gap-5">
                        {creating && (
                            <PackageForm
                                existingIds={existingIds}
                                onCancel={() => setCreating(false)}
                                onSave={(draft) => {
                                    onCreate(property.id, draft)
                                    setCreating(false)
                                }}
                                userPlan={userPlan}
                            />
                        )}

                        {packages.length === 0 && !creating && (
                            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
                                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                                    <PackageIcon className="size-5" aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-foreground">No packages yet</p>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        Guests will only see the {formatZar(property.basePricePerNight)} base rate until you add one.
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => setCreating(true)} className="font-semibold">
                                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                                    Add the first package
                                </Button>
                            </div>
                        )}

                        {sections.map((section) =>
                            section.items.length === 0 ? null : (
                                <section key={section.key} className="flex flex-col gap-2.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h3 className="text-[11px] font-bold tracking-wider uppercase text-foreground">
                                            {section.label}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">{section.hint}</p>
                                    </div>
                                    {section.items.map((pkg) => (
                                        <PackageRow
                                            key={pkg.id}
                                            pkg={pkg}
                                            propertyId={property.id}
                                            existingIds={existingIds}
                                            isEditing={editingId === pkg.id}
                                            onEdit={() => {
                                                setCreating(false)
                                                setEditingId(pkg.id)
                                            }}
                                            onCancelEdit={() => setEditingId(null)}
                                            onSave={(draft) => {
                                                onUpdate(pkg.id, draft)
                                                setEditingId(null)
                                            }}
                                            onDelete={() => onDelete(pkg.id)}
                                            onToggle={(isEnabled) => onToggle(pkg.id, isEnabled)}
                                            onReassign={() => onReassign(pkg.id, property.id)}
                                            userPlan={userPlan}
                                        />
                                    ))}
                                </section>
                            ),
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}