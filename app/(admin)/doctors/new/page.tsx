"use client";

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

export default function NewDoctorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [bio, setBio] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [isActive, setIsActive] = useState(true)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setUploading(true)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `doctor-${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage.from('category-images').upload(fileName, file)
      if (error) throw error

      const { data: urlData } = supabase.storage.from('category-images').getPublicUrl(fileName)
      setImageUrl(urlData.publicUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      toast({
        title: "Image upload failed",
        description: errorMessage,
        variant: "destructive",
      })
      setImageFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      })
      return
    }

    if (!lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      })
      return
    }

    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          specialization: specialization.trim() || null,
          bio: bio.trim() || null,
          avatar_url: imageUrl || null,
          is_active: isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create doctor")
      }

      toast({
        title: "Success",
        description: "Doctor created successfully!",
      })

      // Navigate back to doctors page
      router.push("/doctors")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create doctor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/doctors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">Add New Doctor</h1>
          <p className="text-muted-foreground">Create a new doctor profile</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Information</CardTitle>
          <CardDescription>Fill in the details to create a new doctor profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@example.com"
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number (optional)"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Professional Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Professional Details</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g., Dermatology, Cosmetic Surgery (optional)"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Doctor biography (optional)"
                    rows={4}
                    className="w-full min-h-[120px] border border-input bg-background text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </div>
            </div>

            {/* Profile Image Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Profile Image</h3>
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Image</Label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {uploading && (
                  <p className="text-xs text-muted-foreground">Uploading image...</p>
                )}
                {imageUrl && (
                  <div className="mt-2">
                    <Image
                      src={imageUrl}
                      alt="Profile preview"
                      width={120}
                      height={120}
                      className="object-cover rounded-full border border-border"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Status</h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  id="isActive"
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="isActive" className="font-medium text-foreground cursor-pointer">
                  Active (Doctor is available)
                </Label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading || uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || uploading || !firstName || !lastName || !email}
              >
                {loading ? "Creating..." : "Create Doctor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

