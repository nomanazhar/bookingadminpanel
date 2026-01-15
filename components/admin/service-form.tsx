"use client"

import { useState, useTransition, useEffect } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import type { Service, Category } from "@/types/database"

export function ServiceForm({ onServiceSaved, initialValues, categories, onCancel }: { onServiceSaved?: () => void, initialValues?: Partial<Service>, categories: Category[], onCancel?: () => void }) {
  const [name, setName] = useState(initialValues?.name || "")
  const [slug, setSlug] = useState(initialValues?.slug?.trim() || "")
  const [slugEdited, setSlugEdited] = useState<boolean>(Boolean(initialValues?.slug))
  const [description, setDescription] = useState(initialValues?.description || "")
  const [categoryId, setCategoryId] = useState(initialValues?.category_id || "")
  const [basePrice, setBasePrice] = useState(initialValues?.base_price || "")
  const [duration, setDuration] = useState(initialValues?.duration_minutes || "")
  const [isPopular, setIsPopular] = useState(initialValues?.is_popular || false)
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true)
  const [thumbnail, setThumbnail] = useState(initialValues?.thumbnail || "")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const defaultSessionOptions = ["1 session", "3 sessions", "6 sessions", "10 sessions"]
  const defaultTimeOptions = ["morning", "afternoon", "evening"]
  const parseSessionOptions = (v: any) => {
    if (Array.isArray(v)) return v
    if (!v) return []
    try {
      const parsed = JSON.parse(String(v))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return Array.isArray(parsed.options) ? parsed.options : []
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }
  const parseTimeOptions = (v: any) => {
    if (!v) return []
    try {
      const parsed = JSON.parse(String(v))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return Array.isArray(parsed.times_of_day) ? parsed.times_of_day : []
    } catch {}
    return []
  }
  const [sessionOptions, setSessionOptions] = useState<string[]>(parseSessionOptions(initialValues?.session_options))
  const [timeOptions, setTimeOptions] = useState<string[]>(parseTimeOptions(initialValues?.session_options))

  // Synchronize form fields when initialValues changes
  useEffect(() => {
    setName(initialValues?.name || "")
    setSlug(initialValues?.slug?.trim() || "")
    setSlugEdited(Boolean(initialValues?.slug))
    setDescription(initialValues?.description || "")
    setCategoryId(initialValues?.category_id || "")
    setBasePrice(initialValues?.base_price || "")
    setDuration(initialValues?.duration_minutes || "")
    setIsPopular(initialValues?.is_popular || false)
    setIsActive(initialValues?.is_active ?? true)
    setThumbnail(initialValues?.thumbnail || "")
    setImageFile(null)
    setSessionOptions(parseSessionOptions(initialValues?.session_options))
    setTimeOptions(parseTimeOptions(initialValues?.session_options))
  }, [initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim() || !categoryId || !basePrice) {
      toast({ title: "All required fields must be filled", variant: "destructive" })
      return
    }
    const safeSlugBase = slug.trim().replace(/\s+/g, '-').toLowerCase();
    // ensure slug is unique
    const ensureUniqueSlug = (base: string, existing: Set<string>, excludeId?: string | null) => {
      if (!existing.has(base)) return base
      let i = 1
      let candidate = `${base}-${i}`
      while (existing.has(candidate)) {
        i += 1
        candidate = `${base}-${i}`
      }
      return candidate
    }
    let safeSlug = safeSlugBase
    try {
      const allRes = await fetch('/api/services')
      if (allRes.ok) {
        const all = await allRes.json()
        const existing = new Set<string>()
        all.forEach((s: any) => {
          if (!s || !s.slug) return
          // exclude current service when editing
          if (initialValues?.id && s.id === initialValues.id) return
          existing.add(String(s.slug).toLowerCase())
        })
        if (existing.has(safeSlugBase)) {
          const unique = ensureUniqueSlug(safeSlugBase, existing, initialValues?.id)
          safeSlug = unique
          // update slug field so admin sees it
          setSlug(unique)
          toast({ title: `Slug already in use, changed to ${unique}` })
        }
      }
    } catch (err) {
      // ignore uniqueness check failures and proceed with provided slug
    }
    let finalThumbnail = thumbnail
    if (imageFile) {
      setUploading(true)
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${safeSlug}-${Date.now()}.${fileExt}`
        const { error } = await supabase.storage.from('service-images').upload(fileName, imageFile)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('service-images').getPublicUrl(fileName)
        finalThumbnail = urlData.publicUrl
        setThumbnail(finalThumbnail)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        toast({ title: "Image upload failed", description: errorMessage, variant: "destructive" })
        setUploading(false)
        return
      }
      setUploading(false)
    }
    startTransition(async () => {
      try {
        let res
        if (initialValues?.id) {
          res = await fetch(`/api/services/${initialValues.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              slug: safeSlug,
              description,
              category_id: categoryId,
              base_price: Number(basePrice),
              duration_minutes: duration ? Number(duration) : null,
              is_popular: isPopular,
              is_active: isActive,
              session_options: (function buildSessionPayload(){
                // If admin selected any time-of-day options, store as object to keep metadata
                if (timeOptions && timeOptions.length > 0) {
                  return JSON.stringify({ options: sessionOptions, times_of_day: timeOptions })
                }
                // otherwise keep simple array
                return sessionOptions
              })(),
              thumbnail: finalThumbnail,
            }),
          })
        } else {
          res = await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              slug: safeSlug,
              description,
              category_id: categoryId,
              base_price: Number(basePrice),
              duration_minutes: duration ? Number(duration) : null,
              is_popular: isPopular,
              is_active: isActive,
              session_options: (function buildSessionPayload(){
                if (timeOptions && timeOptions.length > 0) {
                  return JSON.stringify({ options: sessionOptions, times_of_day: timeOptions })
                }
                return sessionOptions
              })(),
              thumbnail: finalThumbnail,
            }),
          })
        }
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Unknown error")
        }
        toast({ title: initialValues?.id ? "Treatment updated!" : "Treatment created!" })
        setName("")
        setSlug("")
        setDescription("")
        setCategoryId("")
        setBasePrice("")
        setDuration("")
        setIsPopular(false)
        setIsActive(true)
        setThumbnail("")
        setImageFile(null)
        setSessionOptions([])
        setTimeOptions([])
        onServiceSaved?.()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        toast({ title: `Error ${initialValues?.id ? "updating" : "creating"} Treatment`, description: errorMessage, variant: "destructive" })
      }
    })
  }

  const slugify = (v: string) =>
    v
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

  return (
    <div className={`rounded-lg border p-6 ${initialValues?.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {initialValues?.id ? '✏️ Edit Treatment' : '➕ Add New Treatment'}
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block mb-1 font-medium text-foreground">Name</label>
        <Input
          value={name}
          onChange={e => {
            const v = e.target.value
            setName(v)
            if (!slugEdited) setSlug(slugify(v))
          }}
          placeholder="Treatment name"
          required
          className="capitalize "
        />
      </div>
      {/* Slug is auto-generated; hidden from admin UI */}
      <div>
        <label className="block mb-1 font-medium text-foreground">Category</label>
        <select 
          value={categoryId} 
          onChange={e => setCategoryId(e.target.value)} 
          className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          required
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium text-foreground">Base Price</label>
        <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} min={0} required />
      </div>
      <div>
        <label className="block mb-1 font-medium text-foreground">Duration (minutes)</label>
        <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={0} />
      </div>
      <div>
        <label className="block mb-1 font-medium text-foreground">Session options (enable for this treatment)</label>
        <div className="flex flex-wrap gap-3">
          {defaultSessionOptions.map((opt) => {
            const checked = sessionOptions.includes(opt)
            return (
              <label key={opt} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) setSessionOptions((s) => [...s, opt])
                    else setSessionOptions((s) => s.filter((x) => x !== opt))
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-foreground">{opt}</span>
              </label>
            )
          })}
        </div>
      </div>
      <div>
        <label className="block mb-1 font-medium text-foreground">Available times of day</label>
        <div className="flex flex-wrap gap-3">
          {defaultTimeOptions.map((t) => {
            const checked = timeOptions.includes(t)
            return (
              <label key={t} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) setTimeOptions((s) => [...s, t])
                    else setTimeOptions((s) => s.filter((x) => x !== t))
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-foreground">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </label>
            )
          })}
        </div>
      </div>
      <div>
        <label className="block mb-1 font-medium text-foreground">Description</label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" />
      </div>
      <div>
        <label className="block mb-1 font-medium text-foreground">Thumbnail</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={e => setImageFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
        {thumbnail && !imageFile && (
          <div className="mt-2"><Image src={thumbnail} alt="Current" width={40} height={40} className="object-cover rounded" /></div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-6">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="isActive" className="h-4 w-4 rounded border-input" />
        <label htmlFor="isActive" className="font-medium text-foreground">Active</label>
      </div>
      <div className="flex items-center gap-2 mt-6 hidden">
        <input type="checkbox" checked={isPopular} onChange={e => setIsPopular(e.target.checked)} id="isPopular" className="h-4 w-4 rounded border-input" />
        <label htmlFor="isPopular" className="font-medium text-foreground">Popular</label>
      </div>
      

      <div className="col-span-full flex gap-3">
        <Button type="submit" disabled={isPending || uploading} size="lg" className="flex-1">
          {initialValues?.id ? "Update Treatment" : "Add Treatment"}
        </Button>
        {initialValues?.id && onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            Cancel Edit
          </Button>
        )}
      </div>
    </form>
    </div>
  )
}
