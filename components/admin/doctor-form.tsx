"use client"

import { useState, useTransition, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import type { Doctor } from "@/types"

export function DoctorForm({ 
  onDoctorSaved, 
  initialValues, 
  onCancel 
}: { 
  onDoctorSaved?: () => void
  initialValues?: Partial<Doctor>
  onCancel?: () => void 
}) {
  // Synchronize form fields when initialValues changes
  useEffect(() => {
    setFirstName(initialValues?.first_name || "")
    setLastName(initialValues?.last_name || "")
    setEmail(initialValues?.email || "")
    setPhone(initialValues?.phone || "")
    setSpecialization(initialValues?.specialization || "")
    setBio(initialValues?.bio || "")
    setImageFile(null)
    setImageUrl(initialValues?.avatar_url || "")
    setIsActive(initialValues?.is_active ?? true)
  }, [initialValues])

  const [firstName, setFirstName] = useState(initialValues?.first_name || "")
  const [lastName, setLastName] = useState(initialValues?.last_name || "")
  const [email, setEmail] = useState(initialValues?.email || "")
  const [phone, setPhone] = useState(initialValues?.phone || "")
  const [specialization, setSpecialization] = useState(initialValues?.specialization || "")
  const [bio, setBio] = useState(initialValues?.bio || "")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(initialValues?.avatar_url || "")
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true)
  const [updating, setUpdating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!firstName.trim()) {
      toast({ title: "First name is required", variant: "destructive" })
      return
    }
    
    if (!lastName.trim()) {
      toast({ title: "Last name is required", variant: "destructive" })
      return
    }
    
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" })
      return
    }

    let finalImageUrl = imageUrl
    
    // Upload image if a new file is selected
    if (imageFile) {
      setUploading(true)
      try {
        const supabase = createClient()
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `doctor-${firstName}-${lastName}-${Date.now()}.${fileExt}`
        const { error } = await supabase.storage.from('category-images').upload(fileName, imageFile)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('category-images').getPublicUrl(fileName)
        finalImageUrl = urlData.publicUrl
        setImageUrl(finalImageUrl)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        toast({ 
          title: "Image upload failed", 
          description: errorMessage, 
          variant: "destructive" 
        })
        setUploading(false)
        return
      }
      setUploading(false)
    }

    startTransition(async () => {
      try {
        let res
        if (initialValues?.id) {
          setUpdating(true)
          res = await fetch(`/api/doctors/${initialValues.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.trim(),
              phone: phone.trim() || null,
              specialization: specialization.trim() || null,
              bio: bio.trim() || null,
              avatar_url: finalImageUrl || null,
              is_active: isActive,
            }),
          })
        } else {
          res = await fetch("/api/doctors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.trim(),
              phone: phone.trim() || null,
              specialization: specialization.trim() || null,
              bio: bio.trim() || null,
              avatar_url: finalImageUrl || null,
              is_active: isActive,
            }),
          })
        }
        
        if (!res.ok) {
          const err = await res.json()
          const errorMessage = err.error || "Unknown error"
          
          // Check if the error is about table not existing
          if (errorMessage.includes("does not exist") || errorMessage.includes("table")) {
            toast({
              title: "Database Setup Required",
              description: "The doctors table needs to be created. Please see DOCTORS_TABLE_SETUP.md for instructions, or contact your database administrator.",
              variant: "destructive",
            })
            console.error("Table setup required:", err)
            return
          }
          
          throw new Error(errorMessage)
        }
        
        toast({ 
          title: initialValues?.id ? "Doctor updated!" : "Doctor created!" 
        })
        
        // Reset form only if it's a new doctor
        if (!initialValues?.id) {
          setFirstName("")
          setLastName("")
          setEmail("")
          setPhone("")
          setSpecialization("")
          setBio("")
          setImageFile(null)
          setImageUrl("")
          setIsActive(true)
        }
        
        setUpdating(false)
        onDoctorSaved?.()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        toast({ 
          title: `Error ${initialValues?.id ? "updating" : "creating"} doctor`, 
          description: errorMessage, 
          variant: "destructive" 
        })
        setUpdating(false)
      }
    })
  }

  return (
    <div className={`rounded-lg border p-6 ${
      initialValues?.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
    }`}>
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {initialValues?.id ? '✏️ Edit Doctor' : '➕ Add New Doctor'}
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="block mb-1 font-medium text-foreground">
            First Name *
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="lastName" className="block mb-1 font-medium text-foreground">
            Last Name *
          </Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="email" className="block mb-1 font-medium text-foreground">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@example.com"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="phone" className="block mb-1 font-medium text-foreground">
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="specialization" className="block mb-1 font-medium text-foreground">
            Specialization
          </Label>
          <Input
            id="specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g., Dermatology, Cosmetic Surgery (optional)"
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="bio" className="block mb-1 font-medium text-foreground">
            Bio
          </Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Doctor biography (optional)"
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="avatar" className="block mb-1 font-medium text-foreground">
            Profile Image
          </Label>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {uploading && (
            <span className="text-xs text-muted-foreground">Uploading...</span>
          )}
          {imageUrl && !imageFile && (
            <div className="mt-2">
              <Image 
                src={imageUrl} 
                alt="Current avatar" 
                width={80} 
                height={80} 
                className="object-cover rounded-full border border-border" 
              />
            </div>
          )}
        </div>
        
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            id="isActive"
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="isActive" className="font-medium text-foreground">
            Active
          </Label>
        </div>
        
        <div className="md:col-span-2 flex gap-3">
          <Button 
            type="submit" 
            disabled={isPending || updating || uploading} 
            size="lg" 
            className="flex-1"
          >
            {initialValues?.id 
              ? (updating ? "Updating..." : "Update Doctor") 
              : "Add Doctor"
            }
          </Button>
          {initialValues?.id && onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              onClick={onCancel}
            >
              Cancel Edit
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

