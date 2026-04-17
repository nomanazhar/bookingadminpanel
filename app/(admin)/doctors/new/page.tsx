
import { DoctorForm } from "@/components/admin/doctor-form"
import Link from "next/dist/client/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NewDoctorPage() {
 
  return (
    <div className="p-6 space-y-4">
    <div className="flex items-center justify-start gap-4"> 
       <Link href="/doctors">
                        <Button variant="primary" size="icon" className="h-6 w-10 ">
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </Link>
      <h1 className="text-2xl font-bold font-heading mb-2">Add New Therapist</h1>
      <p className="text-muted-foreground text-sm">Create a new therapist profile</p>
    </div>
      <DoctorForm />
    </div>
  )
}

