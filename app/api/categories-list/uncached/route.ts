import { NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/publicClient"

export async function GET() {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
  return NextResponse.json(data)
}
