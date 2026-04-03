import { createClient } from "@/lib/supabase/server"
import ClientDoctorsSection from "./_client-doctors-section"

async function getDoctors() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    // Check if table doesn't exist
    if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      // Return error object instead of empty array so client can handle it
      return { error: "Table does not exist", message: error.message } as any
    }
    console.error("Error fetching therapists:", error)
    return []
  }
  
  return data || []
}

export default async function DoctorsPage() {
  const doctorsOrError = await getDoctors()
  return (
    <div className="p-6 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading">Therapists</h1>
          <p className="text-muted-foreground">Manage your therapists and medical staff</p>
        </div>
      </div>
      <ClientDoctorsSection initialDoctors={doctorsOrError as any} />
    </div>
  )
}

