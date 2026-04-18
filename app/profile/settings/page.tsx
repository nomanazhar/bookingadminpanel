"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearUsersClientCache } from "@/components/admin/users-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ProfileSettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    gender: "",
    address: "",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      if (userData?.user) {
        setUser(userData.user);
        // fetch profile row
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("id,email,first_name,last_name,phone,gender,address,role")
          .eq("id", userData.user.id)
          .single();
        if (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Failed", description: "Could not load profile" });
          return;
        }
        setProfile(prof);
        setForm({
          first_name: prof?.first_name || "",
          last_name: prof?.last_name || "",
          phone: prof?.phone || "",
          email: userData.user.email || "",
          gender: prof?.gender || "",
          address: prof?.address || "",
        });
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  // Contact fields are not editable by either customers or admins from this page.
  // Centralized policy: prevent changing email/phone here to avoid auth issues.
  const canEditContact = false

  async function invalidateUsersCache() {
    try {
      const res = await fetch("/api/admin/clear-users-cache", { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("clear-users-cache failed", res.status, text);
        toast({ variant: "destructive", title: "Cache clear failed", description: `Status ${res.status}` });
      }
    } catch (err) {
      console.error("clear-users-cache error", err);
      toast({ variant: "destructive", title: "Cache clear error" });
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Not signed in" });
      return;
    }
    setLoading(true);
    try {
      // If email changed, update auth email first
      // Only attempt to update auth email when editing contact fields is allowed
      if (canEditContact && form.email && form.email !== user.email) {
        const { error: authErr } = await supabase.auth.updateUser({ email: form.email });
        if (authErr) {
          toast({ variant: "destructive", title: "Email update failed", description: authErr.message });
          setLoading(false);
          return;
        }
      }

      // update profiles table
      const updates: any = {
        id: user.id,
        // include email/phone only when editing contact fields is allowed
        ...(canEditContact ? { email: form.email || user.email } : {}),
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        ...(canEditContact ? { phone: form.phone || null } : {}),
        gender: form.gender || null,
      };

      // Only include `address` if the profiles row contains that column
      try {
        if (profile && Object.prototype.hasOwnProperty.call(profile, "address")) {
          updates.address = form.address || null;
        }
      } catch (e) {
        // defensive: if profile is not an object, skip address
      }

      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) {
        toast({ variant: "destructive", title: "Update failed", description: error.message });
      } else {
        toast({ title: "Saved", description: "Profile updated successfully" });
        // Clear server-side cache then the client-side users cache so admin list updates immediately
        await invalidateUsersCache();
        try {
          clearUsersClientCache();
        } catch (e) {
          // ignore if clearing client cache fails
        }

        // Refresh session so middleware / role cookie is updated when current user edits self
        try {
          await fetch('/api/auth/session', { method: 'POST', credentials: 'same-origin' })
        } catch (e) {
          // ignore refresh failures
        }

      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="container mx-auto py-6">
        <section className="max-w-3xl mx-auto mb-4">
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              // If admin, go to /admin; else, go to /
              let backHref = "/book-consultation";
              if (profile && (profile.role === "admin" || (user && user.email && user.email.endsWith("@admin.com")))) {
                backHref = "/admin-dashboard";
              }
              return (
                <Link href={backHref}>
                  <Button variant="primary" className="h-6 w-10 "><ArrowLeft /></Button>
                </Link>
              );
            })()}
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          </div>

        </section>

        <section className="max-w-3xl mx-auto bg-muted rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Personal Details</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-2" onSubmit={handleSave}>
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                className="w-full rounded-lg border px-2 py-1 text-md text-black font-medium bg-white"
                value={form.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-lg border px-2 py-1 text-md text-black font-medium bg-white pr-4"
                  value={form.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone number</label>
              <div className="flex items-center gap-2">
                <span className="inline-block w-10 h-10 bg-muted border rounded-lg flex items-center justify-center text-md">📱</span>
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-1 text-md text-black font-medium bg-white"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={!canEditContact}
                />
              </div>
              {!canEditContact && (
                <p className="text-xs text-muted-foreground mt-1">Phone number cannot be changed here.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border px-2 py-1 text-md text-black font-medium bg-white"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!canEditContact}
              />
              {!canEditContact && (
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font.medium mb-1">Gender (optional)</label>
              <select
                className="w-full rounded-lg border px-2 py-1 text-md text-black font-medium bg-white"
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
             <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                className="w-full rounded-lg border px-2 py-1 text-sm text-black font-medium bg-white"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street address, city, postcode"
              />
            </div>
            <div className="md:col-span-2 flex justify-end mt-1">
              <button type="submit" disabled={loading} className="bg-[#222] text-white text-lg font-semibold rounded-full px-6 py-2 shadow-md hover:bg-[#111] transition-all">
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}
