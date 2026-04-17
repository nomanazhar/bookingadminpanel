
export const dynamic = "force-static";

import { getCategories } from "@/lib/supabase/queries"
import ClientCategoriesSection from "./_client-categories-section"
import type { Category } from "@/types"
import Link from "next/dist/client/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react"; 

export default async function CategoriesPage() {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (e) {
    // Optionally log error: console.error(e);
    categories = [];
  }
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-start gap-4">
        <Link href="/admin-dashboard">
                  <Button variant="primary" size="icon" className="h-6 w-10 ">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
        <h1 className="text-xl font-bold font-heading ">Categories</h1>
        <p className="text-muted-foreground lowercase text-sm">
          Manage service categories
        </p>
      </div>
      <ClientCategoriesSection initialCategories={categories} />
    </div>
  )
}

