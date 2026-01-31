"use client";

import { useState, useEffect } from "react";
import { LOCATIONS } from "../providers/locations";
import axios from "axios";
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
  // ── Form States ───────────────────────────────────────
  const [name, setName] = useState(initialValues?.name || "");
  const [slug, setSlug] = useState(initialValues?.slug?.trim() || "");
  const [slugEdited, setSlugEdited] = useState(!!initialValues?.slug);
  const [description, setDescription] = useState(initialValues?.description || "");
  const [categoryId, setCategoryId] = useState(initialValues?.category_id || "");
  // Base price is now editable
  const [basePrice, setBasePrice] = useState(initialValues?.base_price?.toString() || "0");
  const [duration, setDuration] = useState(initialValues?.duration_minutes?.toString() || "");
  const [isPopular, setIsPopular] = useState(!!initialValues?.is_popular);
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [locations, setLocations] = useState<string[]>(initialValues?.locations || []);
  const [thumbnail, setThumbnail] = useState(initialValues?.thumbnail || "");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [sessionOptions, setSessionOptions] = useState<string[]>(
    Array.isArray(initialValues?.session_options)
      ? (initialValues.session_options as string[])
      : []
  );
  const [timeOptions, setTimeOptions] = useState<string[]>([]);

  // ── Subservices ───────────────────────────────────────
  interface SubserviceRow {
    id?: string;
    name: string;
    price: string;
    slug?: string;
  }

  // Always include a free consultation subservice row at index 0 (use real DB id if available)
  const HARDCODED_SUBSERVICE_NAME = "free consultation";
  const HARDCODED_SUBSERVICE_SLUG = "free-consultation";
  const HARDCODED_SUBSERVICE_PRICE = "0";
  const [subservices, setSubservices] = useState<SubserviceRow[]>([{
    id: undefined,
    name: HARDCODED_SUBSERVICE_NAME,
    price: HARDCODED_SUBSERVICE_PRICE,
    slug: HARDCODED_SUBSERVICE_SLUG,
  }]);
  const [subserviceTouched, setSubserviceTouched] = useState(false);
  const [subserviceError, setSubserviceError] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] || null);
  };

  // ── Effects ───────────────────────────────────────────────
  useEffect(() => {
    // Always fetch latest subservices when editing a service
    if (initialValues?.id) {
      axios
        .get(`/api/subservices?serviceId=${initialValues.id}`)
        .then((res) => {
          let loaded = Array.isArray(res.data)
            ? res.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                price: s.price?.toString() || "",
                slug: s.slug,
              }))
            : [];
          // Find the free consultation subservice in DB (if any)
          const freeRow = loaded.find(s => s.name.trim().toLowerCase() === HARDCODED_SUBSERVICE_NAME);
          // Remove any other free consultation rows from loaded
          const filtered = loaded.filter(s => s.name.trim().toLowerCase() !== HARDCODED_SUBSERVICE_NAME);
          // Always ensure the free consultation row is present at index 0, using DB id if available
          setSubservices([
            freeRow ? { ...freeRow, name: HARDCODED_SUBSERVICE_NAME, price: HARDCODED_SUBSERVICE_PRICE, slug: HARDCODED_SUBSERVICE_SLUG } : {
              id: undefined,
              name: HARDCODED_SUBSERVICE_NAME,
              price: HARDCODED_SUBSERVICE_PRICE,
              slug: HARDCODED_SUBSERVICE_SLUG,
            },
            ...filtered
          ]);
        })
        .catch(() => setSubservices([{
          id: undefined,
          name: HARDCODED_SUBSERVICE_NAME,
          price: HARDCODED_SUBSERVICE_PRICE,
          slug: HARDCODED_SUBSERVICE_SLUG,
        }]));
    } else {
      setSubservices([{
        id: undefined,
        name: HARDCODED_SUBSERVICE_NAME,
        price: HARDCODED_SUBSERVICE_PRICE,
        slug: HARDCODED_SUBSERVICE_SLUG,
      }]);
    }
  }, [initialValues?.id]);

  useEffect(() => {
    // Parse complex session_options format
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
        // silent fail → keep empty
      }
    }

    // Reset form values when initialValues change
    setName(initialValues?.name || "");
    setSlug(initialValues?.slug?.trim() || "");
    setSlugEdited(!!initialValues?.slug);
    setDescription(initialValues?.description || "");
    setCategoryId(initialValues?.category_id || "");
    // basePrice is always zero, do not set from initialValues
    setDuration(initialValues?.duration_minutes?.toString() || "");
    setIsPopular(!!initialValues?.is_popular);
    setIsActive(initialValues?.is_active ?? true);
    setThumbnail(initialValues?.thumbnail || "");
    setImageFile(null);
    setLocations(initialValues?.locations || []);
  }, [initialValues]);

  useEffect(() => {
    if (!subserviceTouched) return;

    const hasError = subservices.some((row) => row.name.trim() && !row.price.trim());
    setSubserviceError(
      hasError ? "If subservice name is filled, price is required." : null
    );
  }, [subservices, subserviceTouched]);

  // ── Submit Handler ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !categoryId || basePrice === "") {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    if (!locations.length) {
      toast({ title: "At least one location must be selected", variant: "destructive" });
      return;
    }

    setSubserviceTouched(true);
    if (subserviceError) {
      toast({ title: "Subservice error", description: subserviceError, variant: "destructive" });
      return;
    }

    setLoading(true);

    let finalSlug = slugify(slug);
    let finalThumbnail = thumbnail;

    try {
      // 1. Check slug uniqueness & append number if needed
      // Use absolute URL if running on server (SSR or API), else relative for browser
      let services;
      if (typeof window === 'undefined') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        services = (await axios.get<Service[]>(`${baseUrl}/api/services`)).data;
      } else {
        services = (await axios.get<Service[]>("/api/services")).data;
      }
      const usedSlugs = new Set(
        services.filter((s) => s.id !== initialValues?.id).map((s) => s.slug.toLowerCase())
      );

      if (usedSlugs.has(finalSlug)) {
        let counter = 1;
        while (usedSlugs.has(`${finalSlug}-${counter}`)) counter++;
        finalSlug = `${finalSlug}-${counter}`;
        setSlug(finalSlug);
        toast({ title: "Slug adjusted", description: `Changed to: ${finalSlug}` });
      }

      // 2. Upload new thumbnail if selected
      if (imageFile) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const ext = imageFile.name.split(".").pop();
        const fileName = `${finalSlug}-${Date.now()}.${ext}`;

        const { error } = await supabase.storage.from("service-images").upload(fileName, imageFile);
        if (error) throw error;

        const { data } = supabase.storage.from("service-images").getPublicUrl(fileName);
        finalThumbnail = data.publicUrl;
        setThumbnail(finalThumbnail);
      }

      // 3. Prepare payload
      const sessionPayload =
        timeOptions.length > 0
          ? JSON.stringify({ options: sessionOptions, times_of_day: timeOptions })
          : sessionOptions;

      const payload = {
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
        locations,
      };

      // 4. Create or Update service
      if (initialValues?.id) {
        await axios.put(`/api/services/${initialValues.id}`, payload);
        toast({ title: "Treatment updated!" });

        // Sync subservices
        await syncSubservices(initialValues.id);
      } else {
        await axios.post("/api/services", payload);
        toast({ title: "Treatment created!" });

        // Get newly created service id
        const { data: all } = await axios.get<Service[]>("/api/services");
        const newService = all.find((s) => s.slug === finalSlug);

        if (newService) await syncSubservices(newService.id, true);
      }

      resetForm();
      onServiceSaved?.();
    } catch (err: any) {
      toast({
        title: initialValues?.id ? "Update failed" : "Create failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Subservices Sync Logic ────────────────────────────────
  const syncSubservices = async (serviceId: string, isNew = false) => {
    // Always fetch existing subservices for this service
    const { data: existing } = await axios.get(`/api/subservices?serviceId=${serviceId}`);
    const existingMap = new Map((existing || []).map((s: any) => [s.id, s]));

    // Upsert or create subservices from form
    for (const [idx, row] of subservices.entries()) {
      if (!row.name.trim() || !row.price.trim()) continue;
      // Always ensure the first row is the free consultation subservice
      if (idx === 0) {
        // Try to find an existing DB subservice for free consultation
        const existingFree = (Array.from(existingMap.values()) as any[]).find((s) => s.name && s.name.trim().toLowerCase() === HARDCODED_SUBSERVICE_NAME);
        const data = {
          name: HARDCODED_SUBSERVICE_NAME,
          price: Number(HARDCODED_SUBSERVICE_PRICE),
          slug: HARDCODED_SUBSERVICE_SLUG,
          service_id: serviceId,
        };
        try {
          if (existingFree && existingFree.id) {
            await axios.put(`/api/subservices/${existingFree.id}`, data);
            existingMap.delete(existingFree.id);
          } else {
            const resp = await axios.post("/api/subservices", data);
            if (resp.data && resp.data.error) {
              toast({ title: "Subservice Error", description: resp.data.error, variant: "destructive" });
              console.error("Subservice POST error:", resp.data.error);
            }
          }
        } catch (err: any) {
          toast({ title: "Subservice Error", description: err?.response?.data?.error || err.message, variant: "destructive" });
          console.error("Subservice POST exception:", err);
        }
        continue;
      }
      // All other subservices (not free consultation)
      let baseSlug = row.slug || slugify(row.name);
      let uniqueSlug = baseSlug;
      let slugCheckCount = 1;
      // Check for slug uniqueness before sending to backend
      while (true) {
        try {
          const checkResp = await axios.get(`/api/subservices?slug=${uniqueSlug}`);
          if (Array.isArray(checkResp.data) && checkResp.data.length > 0) {
            // Slug exists, try next
            uniqueSlug = `${baseSlug}-${slugCheckCount++}`;
          } else {
            break;
          }
        } catch {
          break; // If error, just use the current slug
        }
      }
      const data = {
        name: row.name.trim(),
        price: Number(row.price),
        slug: uniqueSlug,
        service_id: serviceId,
      };
      try {
        if (row.id) {
          await axios.put(`/api/subservices/${row.id}`, data);
          existingMap.delete(row.id);
        } else {
          const resp = await axios.post("/api/subservices", data);
          if (resp.data && resp.data.error) {
            toast({ title: "Subservice Error", description: resp.data.error, variant: "destructive" });
            console.error("Subservice POST error:", resp.data.error);
          }
        }
      } catch (err: any) {
        toast({ title: "Subservice Error", description: err?.response?.data?.error || err.message, variant: "destructive" });
        console.error("Subservice POST exception:", err);
      }
    }

    // Delete subservices that were removed in the UI
    for (const id of existingMap.keys()) {
      await axios.delete(`/api/subservices/${id}`);
    }
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setCategoryId("");
    // basePrice is always zero, no setter needed
    setDuration("");
    setIsPopular(false);
    setIsActive(true);
    setThumbnail("");
    setImageFile(null);
    setSessionOptions([]);
    setTimeOptions([]);
    setSubservices([{
      id: undefined,
      name: HARDCODED_SUBSERVICE_NAME,
      price: HARDCODED_SUBSERVICE_PRICE,
      slug: HARDCODED_SUBSERVICE_SLUG,
    }]);
    setSubserviceTouched(false);
    setSubserviceError(null);
    setLocations([]);
  };

  const [loading, setLoading] = useState(false);

  // ── Render ─────────────────────────────────────────────
  return (
    <div
      className={`rounded-lg border p-6 ${
        initialValues?.id ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <h3 className="text-lg font-semibold mb-5 text-foreground">
        {initialValues?.id ? "✏️ Edit Treatment" : "➕ Add New Treatment"}
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Name */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Name *</label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            placeholder="Treatment name"
            required
            className="capitalize"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Category *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          <label className="block mb-1.5 text-sm font-medium">Base Price*</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={basePrice}
            onChange={e => setBasePrice(e.target.value)}
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Duration (min)</label>
          <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={0} />
        </div>

        {/* Locations Multi-select */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Locations *</label>
          <div className="flex flex-col gap-1">
            {LOCATIONS.map((loc) => (
              <label key={loc} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  value={loc}
                  checked={locations.includes(loc)}
                  onChange={e => {
                    if (e.target.checked) {
                      setLocations(prev => [...prev, loc]);
                    } else {
                      setLocations(prev => prev.filter(l => l !== loc));
                    }
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="capitalize">{loc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Session Options */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Session options</label>
          <div className="flex flex-wrap gap-3">
            {defaultSessionOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sessionOptions.includes(opt)}
                  onChange={(e) =>
                    setSessionOptions((prev) =>
                      e.target.checked ? [...prev, opt] : prev.filter((x) => x !== opt)
                    )
                  }
                  className="h-4 w-4 rounded"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Time Options */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Available times</label>
          <div className="flex flex-wrap gap-3">
            {defaultTimeOptions.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={timeOptions.includes(t)}
                  onChange={(e) =>
                    setTimeOptions((prev) =>
                      e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)
                    )
                  }
                  className="h-4 w-4 rounded"
                />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </div>

       

        {/* Subservices */}
        {/* <div className="col-span-full">
          <label className="block mb-1.5 text-sm font-medium">Subservices (optional)</label>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {subservices.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td className="px-3 py-2">
                      {idx === 0 ? (
                        <Input value={row.name} disabled className="bg-muted text-black" />
                      ) : (
                        <Input
                          value={row.name}
                          onChange={(e) =>
                            setSubservices((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, name: e.target.value, slug: slugify(e.target.value) } : r
                              )
                            )
                          }
                          placeholder="Subservice name"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {idx === 0 ? (
                        <Input value={row.price} disabled className="bg-muted" />
                      ) : (
                        <Input
                          type="number"
                          value={row.price}
                          onChange={(e) =>
                            setSubservices((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r))
                            )
                          }
                          placeholder="Price"
                          min={0}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {idx === 0 ? null : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSubservices((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-destructive h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSubservices((prev) => [...prev, { name: "", price: "" }])}
                    >
                      + Add Subservice
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {subserviceError && <p className="text-xs text-destructive mt-1.5">{subserviceError}</p>}
        </div> */}

        {/* Thumbnail */}
        <div>
          <label className="block mb-1.5 text-sm font-medium">Thumbnail</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          {thumbnail && !imageFile && (
            <div className="mt-3">
              <Image src={thumbnail} alt="Thumbnail preview" width={100} height={100} className="rounded object-cover" />
            </div>
          )}
        </div>

         {/* Description */}
        <div >
          <label className="block mb-1.5 text-sm font-medium">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />

{/* Toggles */}
        <div className="flex items-center gap-8 col-span-full">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm font-medium">Active</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm font-medium">Popular</span>
          </label>
        </div>

        </div>

        

        {/* Actions */}
        <div className="col-span-full flex gap-4 mt-6">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Saving..." : initialValues?.id ? "Update Treatment" : "Add Treatment"}
          </Button>

          {initialValues?.id && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}