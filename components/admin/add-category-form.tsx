"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";

interface AddCategoryFormProps {
  onCategoryAdded?: () => void;
  initialValues?: Partial<Category>;
  onCancel?: () => void;
}

export function AddCategoryForm({
  onCategoryAdded,
  initialValues,
  onCancel,
}: AddCategoryFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [slug, setSlug] = useState(initialValues?.slug || "");
  const [slugEdited, setSlugEdited] = useState<boolean>(Boolean(initialValues?.slug));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url || "");
  const [displayOrder, setDisplayOrder] = useState(initialValues?.display_order ?? 0);
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [updating, setUpdating] = useState(false);

  // Sync form fields when editing (initialValues changes)
  useEffect(() => {
    setName(initialValues?.name || "");
    setDescription(initialValues?.description || "");
    setSlug(initialValues?.slug || "");
    setSlugEdited(Boolean(initialValues?.slug));
    setImageFile(null);
    setImageUrl(initialValues?.image_url || "");
    setDisplayOrder(initialValues?.display_order ?? 0);
    setIsActive(initialValues?.is_active ?? true);
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

    if (!name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    if (!slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }

    const safeSlugBase = slugify(slug);
    let finalSlug = safeSlugBase;

    setUpdating(true);

    // Check slug uniqueness
    try {
      const { data: allCategories } = await axios.get<Category[]>("/api/categories");
      const existingSlugs = new Set(
        allCategories
          .filter((c) => c.id !== initialValues?.id && typeof c.slug === 'string')
          .map((c) => c.slug!.toLowerCase())
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
          description: `Automatically changed to: ${finalSlug}`,
        });
      }
    } catch (err) {
      console.warn("Slug uniqueness check failed:", err);
      // Proceed with user-provided slug if check fails
    }

    let finalImageUrl = imageUrl;

    // Handle image upload
    if (imageFile) {
      setUploading(true);
      try {
        const supabase = createClient();
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${finalSlug}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("category-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("category-images")
          .getPublicUrl(fileName);

        finalImageUrl = urlData.publicUrl;
        setImageUrl(finalImageUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast({ title: "Image upload failed", description: msg, variant: "destructive" });
        setUploading(false);
        setUpdating(false);
        return;
      }
      setUploading(false);
    }

    try {
      if (initialValues?.id) {
        // Update existing category
        await axios.put(`/api/categories/${initialValues.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          slug: finalSlug,
          image_url: finalImageUrl || null,
          display_order: Number(displayOrder),
          is_active: isActive,
        });
        toast({ title: "Category updated successfully!" });
      } else {
        // Create new category
        await axios.post("/api/categories", {
          name: name.trim(),
          description: description.trim() || null,
          slug: finalSlug,
          image_url: finalImageUrl || null,
          display_order: Number(displayOrder),
          is_active: isActive,
        });
        toast({ title: "Category created successfully!" });

        // Reset form only on create
        setName("");
        setDescription("");
        setSlug("");
        setSlugEdited(false);
        setImageFile(null);
        setImageUrl("");
        setDisplayOrder(0);
        setIsActive(true);
      }

      onCategoryAdded?.();
    } catch (err: any) {
      let msg = "Unknown error";
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err.message) {
        msg = err.message;
      }

      toast({
        title: `Error ${initialValues?.id ? "updating" : "creating"} category`,
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-6 ${
        initialValues?.id ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {initialValues?.id ? "✏️ Edit Category" : "➕ Add New Category"}
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            placeholder="Category name"
            required
          />
        </div>

        {/* Slug */}
        {/* <div>
          <label className="block mb-1 font-medium text-foreground">Slug *</label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="category-slug"
            required
          />
        </div> */}

        {/* Description */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {uploading && <span className="text-xs text-muted-foreground mt-1 block">Uploading...</span>}
          {imageUrl && !imageFile && (
            <div className="mt-3">
              <Image
                src={imageUrl}
                alt="Current category image"
                width={80}
                height={80}
                className="object-cover rounded border border-border"
              />
            </div>
          )}
        </div>

        {/* Display Order */}
        <div>
          <label className="block mb-1 font-medium text-foreground">Display Order</label>
          <Input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            min={0}
          />
        </div>

        {/* Active Checkbox */}
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

        {/* Submit Buttons */}
        <div className="col-span-full flex gap-4 mt-4">
          <Button
            type="submit"
            disabled={updating || uploading}
            size="lg"
            className="flex-1"
          >
            {updating
              ? "Saving..."
              : initialValues?.id
              ? "Update Category"
              : "Add Category"}
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