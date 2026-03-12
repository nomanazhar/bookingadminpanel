import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./server";

export const getCurrentUserWithProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile, supabase };
});

export async function getCurrentUserAndRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null as null, role: null as null, supabase };
  }

  // Prefer role from auth metadata if present
  const metaRole =
    (user.user_metadata as any)?.role ??
    (user.app_metadata as any)?.role ??
    null;

  if (metaRole && typeof metaRole === "string") {
    return { user, role: metaRole, supabase };
  }

  // Fallback to short-lived signed cookie set by middleware
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("ds_role")?.value;
    if (raw) {
      const [payload] = raw.split(".");
      const [cookieRole, expStr] = (payload || "").split("|");
      const exp = Number(expStr || 0);
      const now = Math.floor(Date.now() / 1000);
      if (cookieRole && exp && exp > now) {
        return { user, role: cookieRole, supabase };
      }
    }
  } catch {
    // If cookies are not accessible, just fall through
  }

  // Ultimate fallback: hit profiles once, but only selecting role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: (profile as any)?.role ?? null, supabase };
}

export async function requireAdmin() {
  const { user, role, supabase } = await getCurrentUserAndRole();
  if (!user) {
    return {
      ok: false as const,
      status: 401 as const,
      user: null,
      role: null,
      supabase,
    };
  }
  if (role !== "admin") {
    return {
      ok: false as const,
      status: 403 as const,
      user: null,
      role,
      supabase,
    };
  }
  return {
    ok: true as const,
    status: 200 as const,
    user,
    role,
    supabase,
  };
}

