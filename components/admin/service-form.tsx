"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Service, Category } from "@/types/database";

interface ServiceFormProps {
  onServiceSaved?: () => void;
  initialValues?: Partial<Service>;
  categories: Category[];
  onCancel?: () => void;
}

const defaultSessionOptions = ["1 session", "3 sessions", "6 sessions", "10 sessions"];
const defaultTimeOptions = ["morning", "afternoon", "evening"];

export function ServiceForm({
  onServiceSaved,
  initialValues,
  categories,
  onCancel,
}: ServiceFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [slug, setSlug] = useState(initialValues?.slug?.trim() || "");
  const [slugEdited, setSlugEdited] = useState<boolean>(Boolean(initialValues?.slug));
  const [description, setDescription] = useState(initialValues?.description || "");
  const [categoryId, setCategoryId] = useState(initialValues?.category_id || "");
  const [basePrice, setBasePrice] = useState(initialValues?.base_price?.toString() || "");
  const [duration, setDuration] = useState(initialValues?.duration_minutes?.toString() || "");
  const [isPopular, setIsPopular] = useState(initialValues?.is_popular || false);
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [thumbnail, setThumbnail] = useState(initialValues?.thumbnail || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sessionOptions, setSessionOptions] = useState<string[]>(
    Array.isArray(initialValues?.session_options)
      ? (initialValues.session_options as string[])
      : []
  );
  const [timeOptions, setTimeOptions] = useState<string[]>([]);

  // Parse session_options on mount / when initialValues change
  useEffect(() => {
    if (initialValues?.session_options) {
      try {
        const parsed = JSON.parse(String(initialValues.session_options));
        if (typeof parsed === "object" && parsed !== null) {
          setSessionOptions(Array.isArray(parsed.options) ? parsed.options : []);
          setTimeOptions(Array.isArray(parsed.times_of_day) ? parsed.times_of_day : []);
        } else if (Array.isArray(parsed)) {
          setSessionOptions(parsed);
        }
      } catch {
        // fallback to empty
      }
    }

    setName(initialValues?.name || "");
    setSlug(initialValues?.slug?.trim() || "");
    setSlugEdited(Boolean(initialValues?.slug));
    setDescription(initialValues?.description || "");
    setCategoryId(initialValues?.category_id || "");
    setBasePrice(initialValues?.base_price?.toString() || "");
    setDuration(initialValues?.duration_minutes?.toString() || "");
    setIsPopular(initialValues?.is_popular || false);
    setIsActive(initialValues?.is_active ?? true);
    setThumbnail(initialValues?.thumbnail || "");
    setImageFile(null);
  }, [initialValues]);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !categoryId || !basePrice) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const safeSlugBase = slugify(slug);
    let finalSlug = safeSlugBase;

    setLoading(true);

    // Check slug uniqueness
    try {
      const { data: allServices } = await axios.get<Service[]>("/api/services");
      const existingSlugs = new Set(
        allServices
          .filter((s) => s.id !== initialValues?.id)
          .map((s) => s.slug.toLowerCase())
      );

      if (existingSlugs.has(safeSlugBase)) {
        let counter = 1;
        while (existingSlugs.has(`${safeSlugBase}-${counter}`)) {
          counter++;
        }
        finalSlug = `${safeSlugBase}-${counter}`;
        setSlug(finalSlug);
        toast({
          title: "Slug already exists",
          description: `Changed to: ${finalSlug}`,
        });
      }
    } catch (err) {
      console.warn("Could not check slug uniqueness:", err);
      // proceed anyway
    }

    let finalThumbnail = thumbnail;

    // Upload new image if selected
    if (imageFile) {
      setUploading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${finalSlug}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("service-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("service-images").getPublicUrl(fileName);
        finalThumbnail = urlData.publicUrl;
        setThumbnail(finalThumbnail);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast({ title: "Image upload failed", description: msg, variant: "destructive" });
        setUploading(false);
        setLoading(false);
        return;
      }
      setUploading(false);
    }

    // Prepare session options payload
    const sessionPayload =
      timeOptions.length > 0
        ? JSON.stringify({ options: sessionOptions, times_of_day: timeOptions })
        : sessionOptions;

    try {
      if (initialValues?.id) {
        await axios.put(`/api/services/${initialValues.id}`, {
          name,
          slug: finalSlug,
          description,
          category_id: categoryId,
          base_price: Number(basePrice),
          duration_minutes: duration ? Number(duration) : null,
          is_popular: isPopular,
          is_active: isActive,
          session_options: sessionPayload,
          thumbnail: finalThumbnail,
        });
        toast({ title: "Treatment updated successfully!" });
      } else {
        await axios.post("/api/services", {
          name,
          slug: finalSlug,
          description,
          category_id: categoryId,
          base_price: Number(basePrice),
          duration_minutes: duration ? Number(duration) : null,
          is_popular: isPopular,
          is_active: isActive,
          session_options: sessionPayload,
          thumbnail: finalThumbnail,
        });
        toast({ title: "Treatment created successfully!" });
      }

      // Reset form
      setName("");
      setSlug("");
      setDescription("");
      setCategoryId("");
      setBasePrice("");
      setDuration("");
      setIsPopular(false);
      setIsActive(true);
      setThumbnail("");
      setImageFile(null);
      setSessionOptions([]);
      setTimeOptions([]);

      onServiceSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast({
        title: initialValues?.id ? "Failed to update treatment" : "Failed to create treatment",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-6 ${
        initialValues?.id ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {initialValues?.id ? "✏️ Edit Treatment" : "➕ Add New Treatment"}
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Name */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Name *</label>
          <Input
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              if (!slugEdited) setSlug(slugify(v));
            }}
            placeholder="Treatment name"
            required
            className="capitalize"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Category *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            required
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Base Price */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Base Price *</label>
          <Input
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            min={0}
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Duration (minutes)</label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={0}
          />
        </div>

        {/* Session Options */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Session options</label>
          <div className="flex flex-wrap gap-3">
            {defaultSessionOptions.map((opt) => (
              <label key={opt} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sessionOptions.includes(opt)}
                  onChange={(e) =>
                    setSessionOptions((prev) =>
                      e.target.checked ? [...prev, opt] : prev.filter((x) => x !== opt)
                    )
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time of Day */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Available times of day</label>
          <div className="flex flex-wrap gap-3">
            {defaultTimeOptions.map((t) => (
              <label key={t} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={timeOptions.includes(t)}
                  onChange={(e) =>
                    setTimeOptions((prev) =>
                      e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)
                    )
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Thumbnail</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
          {thumbnail && !imageFile && (
            <div className="mt-2">
              <Image
                src={thumbnail}
                alt="Current thumbnail"
                width={80}
                height={80}
                className="object-cover rounded"
              />
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              id="isActive"
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isActive" className="font-medium text-foreground">
              Active
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPopular}
              onChange={(e) => setIsPopular(e.target.checked)}
              id="isPopular"
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isPopular" className="font-medium text-foreground">
              Popular
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="col-span-full flex gap-3 mt-4">
          <Button type="submit" disabled={loading || uploading} size="lg" className="flex-1">
            {loading
              ? "Saving..."
              : initialValues?.id
              ? "Update Treatment"
              : "Add Treatment"}
          </Button>

          {initialValues?.id && onCancel && (
            <Button type="button" variant="outline" size="lg" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}