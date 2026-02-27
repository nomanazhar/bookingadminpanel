
import { DoctorForm } from "@/components/admin/doctor-form"

export default function NewDoctorPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold font-heading mb-2">Add New Doctor</h1>
      <p className="text-muted-foreground">Create a new doctor profile</p>
      <DoctorForm />
    </div>
  )
}

