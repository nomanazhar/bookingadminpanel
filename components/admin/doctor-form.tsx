"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Doctor } from "@/types";

interface DoctorFormProps {
  onDoctorSaved?: () => void;
  initialValues?: Partial<Doctor>;
  onCancel?: () => void;
}

export function DoctorForm({
  onDoctorSaved,
  initialValues,
  onCancel,
}: DoctorFormProps) {
  const [firstName, setFirstName] = useState(initialValues?.first_name || "");
  const [lastName, setLastName] = useState(initialValues?.last_name || "");
  const [email, setEmail] = useState(initialValues?.email || "");
  const [phone, setPhone] = useState(initialValues?.phone || "");
  const [specialization, setSpecialization] = useState(initialValues?.specialization || "");
  const [bio, setBio] = useState(initialValues?.bio || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialValues?.avatar_url || "");
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [locations, setLocations] = useState<string[]>(initialValues?.locations || []);
  const [updating, setUpdating] = useState(false);

  // Sync form when initialValues change (edit mode)
  useEffect(() => {
    setFirstName(initialValues?.first_name || "");
    setLastName(initialValues?.last_name || "");
    setEmail(initialValues?.email || "");
    setPhone(initialValues?.phone || "");
    setSpecialization(initialValues?.specialization || "");
    setBio(initialValues?.bio || "");
    setImageFile(null);
    setImageUrl(initialValues?.avatar_url || "");
    setIsActive(initialValues?.is_active ?? true);
    setLocations(initialValues?.locations || []);
  }, [initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!firstName.trim()) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    if (!locations.length) {
      toast({ title: "At least one location must be selected", variant: "destructive" });
      setUpdating(false);
      return;
    }
    if (!lastName.trim()) {
      toast({ title: "Last name is required", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    setUpdating(true);

    let finalImageUrl = imageUrl;

    // Upload new image if selected
    if (imageFile) {
      setUploading(true);
      try {
        const supabase = createClient();
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const fileName = `doctor-${firstName}-${lastName}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("category-images") // ← change to "doctors" bucket if you want
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
        // Update existing doctor
        await axios.put(`/api/doctors/${initialValues.id}`, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          specialization: specialization.trim() || null,
          bio: bio.trim() || null,
          avatar_url: finalImageUrl || null,
          is_active: isActive,
          locations,
        });
        toast({ title: "Doctor updated successfully!" });
      } else {
        // Create new doctor
        await axios.post("/api/doctors", {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          specialization: specialization.trim() || null,
          bio: bio.trim() || null,
          avatar_url: finalImageUrl || null,
          is_active: isActive,
          locations,
        });
        toast({ title: "Doctor created successfully!" });

        // Reset form only on create
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setSpecialization("");
        setBio("");
        setImageFile(null);
        setImageUrl("");
        setIsActive(true);
        setLocations([]);
      }

      onDoctorSaved?.();
    } catch (err: any) {
      let msg = "Unknown error";
      if (err.response?.data?.error) {
        msg = err.response.data.error;
        if (msg.includes("does not exist") || msg.includes("table")) {
          toast({
            title: "Database Setup Required",
            description: "The doctors table needs to be created. Check DOCTORS_TABLE_SETUP.md or contact admin.",
            variant: "destructive",
          });
          console.error("Table setup issue:", err);
          setUpdating(false);
          return;
        }
      } else if (err.message) {
        msg = err.message;
      }

      toast({
        title: `Error ${initialValues?.id ? "updating" : "creating"} doctor`,
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
        {initialValues?.id ? "✏️ Edit Doctor" : "➕ Add New Doctor"}
      </h3>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g., Dermatology, Cosmetic Surgery (optional)"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Doctor biography (optional)"
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="avatar">Profile Image</Label>
          <input
            id="avatar"
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
                alt="Current doctor avatar"
                width={100}
                height={100}
                className="object-cover rounded-full border border-border shadow-sm"
              />
            </div>
          )}
        </div>


        {/* Locations Multi-select */}
        <div className="md:col-span-2">
          <Label className="block mb-1 font-medium text-foreground">Locations *</Label>
          <div className="flex flex-col gap-1">
            {['newyork', 'newcastle'].map((loc) => (
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

        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            id="isActive"
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="isActive" className="font-medium">
            Active
          </Label>
        </div>

        <div className="md:col-span-2 flex gap-4 mt-4">
          <Button
            type="submit"
            disabled={updating || uploading}
            size="lg"
            className="flex-1"
          >
            {updating
              ? "Saving..."
              : initialValues?.id
              ? "Update Doctor"
              : "Add Doctor"}
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