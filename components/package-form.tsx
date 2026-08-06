"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatZar, type PackageCategory, type PropertyPackage } from "@/lib/types"

export type PackageDraft = Omit<PropertyPackage, "propertyId">

interface PackageFormProps {
    initial?: PropertyPackage
    existingIds: string[]
    onCancel: () => void
    onSave: (draft: PackageDraft) => void
    userPlan?: string
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
}

export function PackageForm({ initial, existingIds, onCancel, onSave, userPlan }: PackageFormProps) {
    const isEdit = Boolean(initial)
    const [name, setName] = useState(initial?.name ?? "")
    const [description, setDescription] = useState(initial?.description ?? "")
    const [price, setPrice] = useState(String(initial?.price ?? ""))
    const [category, setCategory] = useState<PackageCategory>((initial?.category as PackageCategory) ?? "standard")
    const [multiplier, setMultiplier] = useState(String(initial?.multiplier ?? 1))
    const [baseRate, setBaseRate] = useState(String(initial?.baseRate ?? 0))
    const [yocoId, setYocoId] = useState(initial?.yocoId ?? "")

    const derivedId = initial?.id ?? slugify(name)
    const numericPrice = Number(price) || 0
    const numericMultiplier = Number(multiplier) || 0
    const numericBase = Number(baseRate) || 0
    const effective = numericBase + numericPrice * numericMultiplier

    const idCollision = !isEdit && derivedId.length > 0 && existingIds.includes(derivedId)
    const nameError = name.trim().length === 0
    const priceError = numericPrice <= 0
    const canSave = !nameError && !priceError && !idCollision

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        if (!canSave) return
        onSave({
            id: derivedId,
            name: name.trim(),
            description: description.trim(),
            price: numericPrice,
            category,
            multiplier: numericMultiplier,
            baseRate: numericBase,
            isEnabled: initial?.isEnabled ?? true,
            yocoId: yocoId.trim() || derivedId,
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-secondary/40 p-4"
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold tracking-wider uppercase text-primary">
                    {isEdit ? "Edit package" : "New package"}
                </p>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    id: {derivedId || "—"}
                </code>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="pkg-name" className="text-xs font-semibold">
                    Name
                </Label>
                <Input
                    id="pkg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Hosted stay"
                    aria-invalid={nameError || idCollision}
                />
                {idCollision && (
                    <p className="text-xs font-medium text-destructive">
                        A package with the id {`"${derivedId}"`} already exists on this property.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="pkg-desc" className="text-xs font-semibold">
                    Description
                </Label>
                <Textarea
                    id="pkg-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="What the guest actually receives."
                />
            </div>

            <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-xs font-semibold text-foreground">Category</legend>
                <div className="flex gap-2">
                    {(["standard", "addon"] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setCategory(value)}
                            aria-pressed={category === value}
                            className={cn(
                                "flex-1 rounded-lg border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors",
                                category === value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                        >
                            {value === "standard" ? "Standard" : "Add-on"}
                        </button>
                    ))}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Standard packages replace the base rate. Add-ons are billed on top of the booking.
                </p>
            </fieldset>

            <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pkg-price" className="text-xs font-semibold">
                        Price (R)
                    </Label>
                    <Input
                        id="pkg-price"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        aria-invalid={priceError}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pkg-mult" className="text-xs font-semibold">
                        Multiplier
                    </Label>
                    <Input
                        id="pkg-mult"
                        type="number"
                        step="0.1"
                        min={0}
                        value={multiplier}
                        onChange={(e) => setMultiplier(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pkg-base" className="text-xs font-semibold">
                        Base (R)
                    </Label>
                    <Input
                        id="pkg-base"
                        type="number"
                        min={0}
                        value={baseRate}
                        onChange={(e) => setBaseRate(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="pkg-yoco" className="text-xs font-semibold">
                    Yoco ID <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                    id="pkg-yoco"
                    value={yocoId}
                    onChange={(e) => setYocoId(e.target.value)}
                    placeholder={derivedId || "auto-generated from name"}
                    className="font-mono text-xs"
                />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground">Guest pays</span>
                <span className="font-mono text-sm font-bold text-foreground">{formatZar(Math.round(effective))}</span>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!canSave} className="font-semibold">
                    {isEdit ? "Save changes" : "Create package"}
                </Button>
            </div>
        </form>
    )
}