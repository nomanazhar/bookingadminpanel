import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search');
    if (!search || search.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Validate env vars early so we return a helpful error instead of a generic 500
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ users: [], error: 'Supabase environment variables are not set' }, { status: 500 });
    }

    const supabase = await createClient();
    // Try to match first_name, last_name, email, and phone. We'll handle full-name matching in JS.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, address, gender, role, avatar_url')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(50);
    if (error) {
      console.error('Supabase users search error:', error);
      // Detect common "relation does not exist" errors and provide a clearer message
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ users: [], error: "Profiles table does not exist. Please run the database migrations." }, { status: 500 });
      }
      return NextResponse.json({ users: [], error: (error as any)?.message || String(error) }, { status: 500 });
    }
    // Filter for full name match in JS
    let filtered = data || [];
    if (search && filtered.length > 0) {
      const q = search.toLowerCase();
      filtered = filtered.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
        return (
          fullName.includes(q) ||
          (u.first_name && u.first_name.toLowerCase().includes(q)) ||
          (u.last_name && u.last_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        );
      });
    }

      // If we got zero results, try a server-side admin fallback (useful if RLS prevents anon reads)
      if ((filtered.length === 0 || !filtered) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
          const { data: adminData, error: adminError } = await admin
            .from('profiles')
            .select('id, first_name, last_name, email, phone, address, gender, role, avatar_url')
            .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
            .limit(50);
          if (!adminError && Array.isArray(adminData) && adminData.length > 0) {
            // apply same JS full-name filter
            const q = search.toLowerCase();
            const adminFiltered = adminData.filter(u => {
              const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
              return (
                fullName.includes(q) ||
                (u.first_name && u.first_name.toLowerCase().includes(q)) ||
                (u.last_name && u.last_name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
              );
            });
            return NextResponse.json({ users: adminFiltered });
          }
        } catch (err) {
          console.error('Admin supabase fallback error:', err);
        }
      }

      // In development include a small hint so frontend can surface why nothing was found
      if ((filtered.length === 0 || !filtered) && process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ users: [], debug: { matched: filtered.length, note: 'No profiles matched with anon/normal client. If you have RLS, consider SUPABASE_SERVICE_ROLE_KEY fallback.' } });
      }

      return NextResponse.json({ users: filtered });
  } catch (error) {
    console.error('Users API unexpected error:', error);
    return NextResponse.json({ users: [], error: (error as Error).message }, { status: 500 });
  }
}
