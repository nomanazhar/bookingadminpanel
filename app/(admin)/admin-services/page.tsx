
import { getCategories } from "@/lib/supabase/queries"
import ClientServicesSection from "./_client-services-section"

import Link from "next/dist/client/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ServicesPage() {
  const categories = await getCategories()
  return (
    <div className="p-6 space-y-2">
      <div className="flex items-center justify-start gap-6">
         <Link href="/admin-dashboard">
                  <Button variant="primary" size="icon" className="h-6 w-10 ">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
        <h1 className="text-xl font-bold font-heading ">Treatments</h1>
        <p className="text-muted-foreground text-sm lowercase">Manage your treatments</p>
      </div>
      <ClientServicesSection categories={categories} />
    </div>
  )
}

