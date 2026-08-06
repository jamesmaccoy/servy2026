"use client";

import React, { useState, useEffect, use, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Lock,
  Moon,
  Clock,
  ImagePlus,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Property {
  id: string;
  title: string;
  slug: string;
  basePricePerNight: number;
  airbnbCalendarUrl?: string;
  googleCalendarUrl?: string;
  description?: string;
  images?: string[];
  hostId?: string;
  bookingType?: string;
  slots?: string[];
  location?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

type FieldName = "title" | "slug" | "basePrice" | "slots";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/avif"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatSlotLabel(slotTime: string) {
  const [h, m] = slotTime.split(":");
  const hourNum = Number.parseInt(h, 10);
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
  return `${displayHour}:${m} ${ampm}`;
}

/** Uploads a file with real progress reporting. */
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(10 + Math.round((event.loaded / event.total) * 85));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage rejected the upload (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(file);
  });
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}

function EditPropertyContent({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const isNew = id === "new";

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const statusRef = useRef<HTMLDivElement | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [location, setLocation] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [airbnbCalendarUrl, setAirbnbCalendarUrl] = useState("");
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [bookingType, setBookingType] = useState<"nightly" | "hourly">("nightly");
  const [slots, setSlots] = useState<string[]>(["10:00", "14:00"]);

  const isUploading = uploadingFiles.length > 0;

  const notify = useCallback((type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
  }, []);

  const clearFieldError = useCallback((field: FieldName) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  useEffect(() => {
    if (statusMessage) {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [statusMessage]);

  useEffect(() => {
    const fetchProperty = async () => {
      if (isNew) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/posts/${id}`);
        const result = await res.json();
        if (result.success && result.data) {
          setProperty(result.data);
          setTitle(result.data.title || result.data.name || "");
          setSlug(result.data.slug || "");
          setBasePrice(
            result.data.basePricePerNight
              ? String(result.data.basePricePerNight)
              : ""
          );
          setAirbnbCalendarUrl(result.data.airbnbCalendarUrl || "");
          setGoogleCalendarUrl(result.data.googleCalendarUrl || "");
          setDescription(result.data.description || "");
          setImages(result.data.images || []);
          setBookingType(result.data.bookingType || "nightly");
          setSlots(
            result.data.slots?.length ? result.data.slots : ["10:00", "14:00"]
          );
          setLocation(result.data.location || "");
        } else {
          notify("error", result.error || "Property not found.");
        }
      } catch (err: unknown) {
        console.error("Failed to load property details:", err);
        notify("error", "Failed to load property details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [id, isNew, notify]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    clearFieldError("title");
    // Only auto-fill the slug on new listings while the user hasn't edited it manually.
    if (isNew && !slugTouched) {
      setSlug(slugify(val));
      clearFieldError("slug");
    }
  };

  const processFiles = useCallback(
    async (fileList: File[]) => {
      if (fileList.length === 0) return;

      if (!user) {
        notify("error", "You must be signed in to upload images.");
        return;
      }

      const validFiles: File[] = [];
      const rejected: string[] = [];

      for (const file of fileList) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          rejected.push(`${file.name} (unsupported format)`);
        } else if (file.size > MAX_FILE_SIZE) {
          rejected.push(`${file.name} (over 10MB)`);
        } else {
          validFiles.push(file);
        }
      }

      if (rejected.length > 0) {
        notify("error", `Skipped ${rejected.length} file(s): ${rejected.join(", ")}`);
      }

      for (const file of validFiles) {
        const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        setUploadingFiles((prev) => [
          ...prev,
          { id: uploadId, name: file.name, progress: 5 },
        ]);

        try {
          const presignRes = await fetch("/api/media/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hostId: user.uid,
              filename: file.name,
              contentType: file.type,
              propertyId: isNew ? slug || "draft" : id,
            }),
          });

          if (!presignRes.ok) {
            const presignError = await presignRes.json().catch(() => ({}));
            throw new Error(presignError.error || "Could not prepare the upload.");
          }
          const { presignedUrl, publicUrl } = await presignRes.json();

          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, progress: 10 } : item
            )
          );

          await uploadWithProgress(presignedUrl, file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((item) =>
                item.id === uploadId ? { ...item, progress } : item
              )
            );
          });

          setImages((prev) => (prev.includes(publicUrl) ? prev : [...prev, publicUrl]));
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Upload error";
          console.error("Upload failed for file:", file.name, err);
          notify("error", `Upload failed for ${file.name}: ${errorMessage}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadId));
        }
      }
    },
    [user, isNew, slug, id, notify]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = "";
    await processFiles(fileList);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    await processFiles(dropped);
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  /** Returns per-field errors plus a summary message for the alert. */
  const validateForm = () => {
    const errors: Partial<Record<FieldName, string>> = {};

    if (!title.trim()) {
      errors.title = "Please add a property title.";
    }
    if (!slug.trim()) {
      errors.slug = "A slug is required.";
    } else if (!SLUG_PATTERN.test(slug)) {
      errors.slug = "Use lowercase letters, numbers and single dashes only.";
    }
    if (!basePrice.trim()) {
      errors.basePrice = "Please set a base price.";
    } else {
      const price = Number(basePrice);
      if (!Number.isFinite(price) || price <= 0) {
        errors.basePrice = "Base price must be a number greater than zero.";
      }
    }
    if (bookingType === "hourly" && slots.length === 0) {
      errors.slots = "Select at least one available time slot.";
    }

    const firstError = Object.values(errors)[0];
    const summary = isUploading
      ? "Please wait for image uploads to finish."
      : firstError;

    return { errors, summary };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { errors, summary } = validateForm();
    setFieldErrors(errors);
    if (summary) {
      notify("error", summary);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const url = isNew ? "/api/posts" : `/api/posts/${id}`;
      const method = isNew ? "POST" : "PUT";
      const cleanTitle = title.trim();

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
          "x-user-email": user?.email || "",
        },
        body: JSON.stringify({
          title: cleanTitle,
          name: cleanTitle,
          slug: slug.trim().toLowerCase(),
          basePricePerNight: Number(basePrice),
          airbnbCalendarUrl: airbnbCalendarUrl.trim(),
          googleCalendarUrl: googleCalendarUrl.trim(),
          description: description.trim(),
          images,
          bookingType,
          slots: bookingType === "hourly" ? slots : [],
          location: location.trim(),
          hostId: user?.uid,
        }),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        if (response.status === 409) {
          setFieldErrors({ slug: "That slug is already in use." });
          throw new Error(
            `That slug is already in use. Try a different one, e.g. ${slug}-2.`
          );
        }
        throw new Error(
          resJson.error || resJson.data || "Failed to save property."
        );
      }

      notify(
        "success",
        isNew ? "Listing created successfully!" : "Listing updated successfully!"
      );
      setTimeout(() => {
        router.push("/admin/properties");
      }, 1200);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred.";
      notify("error", errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.uid || "",
          "x-user-email": user?.email || "",
        },
      });

      const resJson = await response.json().catch(() => ({}));
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "Failed to delete property.");
      }

      notify("success", "Listing deleted successfully!");
      setTimeout(() => {
        router.push("/admin/properties");
      }, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      notify("error", error.message || "An error occurred.");
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <PageShell>
        <Spinner className="size-6 text-primary" aria-label="Loading" />
      </PageShell>
    );
  }

  const hasAccess =
    isNew ||
    (user &&
      user.isAdmin &&
      (!property?.hostId ||
        property.hostId === user.uid ||
        property.hostId === "mock_admin_example_com"));

  if (!user || !user.isAdmin || !hasAccess) {
    return (
      <PageShell>
        <Empty className="w-full max-w-md rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock />
            </EmptyMedia>
            <EmptyTitle>Access Denied</EmptyTitle>
            <EmptyDescription>
              Administrative privileges or listing ownership is required to
              access this portal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/admin/properties" />}>
              Back to Properties
            </Button>
            <Button nativeButton={false} variant="ghost" render={<Link href="/" />}>
              Back to Home
            </Button>
          </EmptyContent>
        </Empty>
      </PageShell>
    );
  }

  const submitDisabled = isSubmitting || isUploading;

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Button
              variant="link"
              size="sm"
              className="h-auto w-fit p-0"
              nativeButton={false}
              render={<Link href="/admin/properties" />}
            >
              <ArrowLeft data-icon="inline-start" />
              Back to Listings
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {isNew ? "Create Property Listing" : "Edit Property Configuration"}
            </h1>
          </div>
          <Badge variant="secondary" className="w-fit shrink-0">
            {isNew ? (
              <>
                <Sparkles />
                New Listing
              </>
            ) : (
              `ID: ${id}`
            )}
          </Badge>
        </header>

        <div ref={statusRef} aria-live="polite" role="status">
          {statusMessage && (
            <Alert
              variant={statusMessage.type === "success" ? "default" : "destructive"}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 />
              ) : (
                <AlertTriangle />
              )}
              <AlertTitle>
                {statusMessage.type === "success" ? "Success" : "Something needs attention"}
              </AlertTitle>
              <AlertDescription className="text-pretty">
                {statusMessage.text}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {isNew || property ? (
          <form onSubmit={handleSubmit} noValidate>
            <Card>
              <CardHeader>
                <CardTitle>Listing details</CardTitle>
                <CardDescription>
                  {isNew
                    ? "Describe the property, set pricing, and add photos to publish a new listing."
                    : "Update the property information, pricing, and imagery for this listing."}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <FieldGroup>
                  <Field data-invalid={fieldErrors.title ? true : undefined}>
                    <FieldLabel htmlFor="property-title">Property title</FieldLabel>
                    <Input
                      id="property-title"
                      placeholder="e.g. Llandudno Cliffside Villa"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      aria-invalid={fieldErrors.title ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.title ? [{ message: fieldErrors.title }] : undefined} />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={fieldErrors.slug ? true : undefined}>
                      <FieldLabel htmlFor="property-slug">
                        Slug{isNew && !slugTouched ? " (auto-generated)" : ""}
                      </FieldLabel>
                      <Input
                        id="property-slug"
                        inputMode="url"
                        className="font-mono"
                        placeholder="llandudno-cliffside-villa"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                          clearFieldError("slug");
                        }}
                        onBlur={() => setSlug((prev) => slugify(prev).replace(/^-|-$/g, ""))}
                        aria-invalid={fieldErrors.slug ? true : undefined}
                      />
                      {fieldErrors.slug ? (
                        <FieldError errors={[{ message: fieldErrors.slug }]} />
                      ) : (
                        <FieldDescription>
                          Lowercase letters, numbers and dashes only.
                        </FieldDescription>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="property-location">Location</FieldLabel>
                      <Input
                        id="property-location"
                        placeholder="e.g. Llandudno, Cape Town"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={fieldErrors.basePrice ? true : undefined}>
                      <FieldLabel htmlFor="property-price">
                        {bookingType === "hourly"
                          ? "Base price per hour"
                          : "Base price per night"}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>R</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="property-price"
                          type="number"
                          min={1}
                          step={1}
                          className="font-mono"
                          placeholder={bookingType === "hourly" ? "250" : "1500"}
                          value={basePrice}
                          onChange={(e) => {
                            setBasePrice(e.target.value);
                            clearFieldError("basePrice");
                          }}
                          aria-invalid={fieldErrors.basePrice ? true : undefined}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>ZAR</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError errors={fieldErrors.basePrice ? [{ message: fieldErrors.basePrice }] : undefined} />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="booking-type">Booking type</FieldLabel>
                      <ToggleGroup
                        id="booking-type"
                        variant="outline"
                        className="w-full"
                        value={[bookingType]}
                        onValueChange={(value) => {
                          const next = value[0] as "nightly" | "hourly" | undefined;
                          if (next) setBookingType(next);
                        }}
                      >
                        <ToggleGroupItem value="nightly" className="flex-1">
                          <Moon />
                          Nightly stay
                        </ToggleGroupItem>
                        <ToggleGroupItem value="hourly" className="flex-1">
                          <Clock />
                          Hourly slots
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </Field>
                  </div>

                  {bookingType === "hourly" && (
                    <FieldSet data-invalid={fieldErrors.slots ? true : undefined}>
                      <FieldLegend variant="label">Available time slots</FieldLegend>
                      <ToggleGroup
                        multiple
                        variant="outline"
                        className="flex-wrap"
                        value={slots}
                        onValueChange={(value) => {
                          setSlots([...value].sort());
                          if (value.length > 0) clearFieldError("slots");
                        }}
                      >
                        {TIME_SLOTS.map((slotTime) => (
                          <ToggleGroupItem key={slotTime} value={slotTime}>
                            {formatSlotLabel(slotTime)}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      {fieldErrors.slots ? (
                        <FieldError errors={[{ message: fieldErrors.slots }]} />
                      ) : (
                        <FieldDescription>
                          Guests can book any of the slots you select.
                        </FieldDescription>
                      )}
                    </FieldSet>
                  )}

                  <Field>
                    <FieldLabel htmlFor="property-description">
                      Description
                    </FieldLabel>
                    <Textarea
                      id="property-description"
                      rows={4}
                      className="resize-y leading-relaxed"
                      placeholder="Describe your stay, amenities, views, scenery..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <FieldDescription>
                      This appears on the public listing page.
                    </FieldDescription>
                  </Field>

                  <Separator />

                  <Field>
                    <FieldLabel htmlFor="property-images">
                      Property imagery
                    </FieldLabel>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={cn(
                        "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/60"
                      )}
                    >
                      <input
                        id="property-images"
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES.join(",")}
                        onChange={handleFileUpload}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                      <div className="pointer-events-none flex flex-col items-center gap-1">
                        <ImagePlus className="size-6 text-primary" />
                        <span className="text-sm font-medium">
                          {isDragging
                            ? "Drop images to upload"
                            : "Drag & drop files or click to upload"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP up to 10MB each
                        </span>
                      </div>
                    </div>

                    {uploadingFiles.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {uploadingFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-mono">{file.name}</span>
                              <span className="shrink-0 font-medium text-muted-foreground">
                                {file.progress}%
                              </span>
                            </div>
                            <Progress value={file.progress} className="h-1" />
                          </div>
                        ))}
                      </div>
                    )}

                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {images.map((url, index) => (
                          <div
                            key={url}
                            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                          >
                            <Image
                              src={url || "/placeholder.svg"}
                              alt={`${title || "Property"} photo ${index + 1}`}
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 33vw, 25vw"
                              className="object-cover"
                            />
                            {index === 0 && (
                              <Badge
                                variant="secondary"
                                className="absolute bottom-1 left-1"
                              >
                                Cover
                              </Badge>
                            )}
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="destructive"
                              onClick={() => handleRemoveImage(url)}
                              aria-label={`Remove image ${index + 1}`}
                              className="absolute top-1 right-1 z-10 bg-destructive text-destructive-foreground opacity-100 hover:bg-destructive/90 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              <X />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Field>

                  <Separator />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="airbnb-ical">
                        Airbnb iCal URL
                      </FieldLabel>
                      <Input
                        id="airbnb-ical"
                        type="url"
                        placeholder="https://www.airbnb.co.za/calendar/ical/..."
                        value={airbnbCalendarUrl}
                        onChange={(e) => setAirbnbCalendarUrl(e.target.value)}
                      />
                      <FieldDescription>Optional.</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="google-ical">
                        Google Calendar iCal URL
                      </FieldLabel>
                      <Input
                        id="google-ical"
                        type="url"
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        value={googleCalendarUrl}
                        onChange={(e) => setGoogleCalendarUrl(e.target.value)}
                      />
                      <FieldDescription>Optional.</FieldDescription>
                    </Field>
                  </div>
                </FieldGroup>
              </CardContent>

              <CardFooter className="flex-col gap-3 border-t sm:flex-row">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitDisabled}
                  className="w-full sm:flex-1"
                >
                  {isSubmitting && <Spinner data-icon="inline-start" />}
                  {isUploading
                    ? "Waiting for uploads..."
                    : isSubmitting
                      ? isNew
                        ? "Creating listing..."
                        : "Saving changes..."
                      : isNew
                        ? "Create Listing"
                        : "Save Listing Changes"}
                </Button>

                {!isNew && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          type="button"
                          size="lg"
                          variant="destructive"
                          disabled={isSubmitting}
                          className="w-full sm:w-auto"
                        />
                      }
                    >
                      <Trash2 data-icon="inline-start" />
                      Delete Listing
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the property and every package
                          associated with it. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleDelete}
                        >
                          Delete listing
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          </form>
        ) : (
          <Empty className="rounded-xl border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertTriangle />
              </EmptyMedia>
              <EmptyTitle>Listing unavailable</EmptyTitle>
              <EmptyDescription>
                Could not retrieve property metadata for this listing.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/admin/properties" />}
              >
                Back to Listings
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </div>
  );
}

export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);

  return (
    <Suspense
      fallback={
        <PageShell>
          <Spinner className="size-6 text-primary" aria-label="Loading" />
        </PageShell>
      }
    >
      <EditPropertyContent id={unwrappedParams.id} />
    </Suspense>
  );
}
