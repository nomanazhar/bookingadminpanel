
import { DoctorForm } from "@/components/admin/doctor-form"
import { createClient } from "@/lib/supabase/server"

export default async function EditDoctorPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: doctor, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", params.id)
    .single()

    if (error || !doctor) {
      return <div className="p-6">Doctor not found.</div>
    }

    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold font-heading mb-2">Edit Doctor</h1>
        <p className="text-muted-foreground">Update doctor profile</p>
        <DoctorForm initialValues={doctor} />
      </div>
    )
  }
