import { createClient } from './server'
import type { Category } from '@/types'

export async function createCategory({ name, description }: { name: string; description?: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .insert([
      {
        name,
        description,
        is_active: true,
        display_order: 0, // You may want to handle ordering logic elsewhere
      },
    ])
    .select()
    .single()
  if (error) throw error
  return data as Category
}
