"use client";

import { useState } from "react"
import Image from "next/image"
import { AddCategoryForm } from "@/components/admin/add-category-form"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Category } from "@/types"

export default function ClientCategoriesSection({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [editCategory, setEditCategory] = useState<Category | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const handleCategoryAdded = async () => {
    setEditCategory(undefined)
    setError(null)
    try {
      const res = await fetch("/api/categories-list/uncached")
      if (!res.ok) throw new Error("Failed to fetch categories")
      setCategories(await res.json())
    } catch (err: any) {
      setError(err?.message || "Unknown error fetching categories")
      setCategories([])
    }
  }

  const handleEdit = (cat: Category) => {
    setEditCategory(cat)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category \"${cat.name}\"?`)) return
    setError(null)
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete category")
      // Always fetch latest from Supabase, not from cache
      const uncached = await fetch("/api/categories-list/uncached")
      if (!uncached.ok) throw new Error("Failed to fetch categories after delete")
      setCategories(await uncached.json())
    } catch (err: any) {
      setError(err?.message || "Unknown error deleting category")
    }
  }

  const handleCancelEdit = () => {
    setEditCategory(undefined)
  }
  
  return (
    <>
      <div className="mb-8">
        <AddCategoryForm 
          onCategoryAdded={handleCategoryAdded} 
          initialValues={editCategory}
          onCancel={handleCancelEdit}
        />
      </div>
      {error && <div className="text-red-500 mb-4">Error: {error}</div>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full bg-card">
          <thead className="bg-muted/50">
            <tr className="bg-[#333333] text-white">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Slug</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Image</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Display Order</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Active</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Manage</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-6">No categories found.</td>
              </tr>
            )}
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">{cat.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{cat.slug}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{cat.description}</td>
                <td className="px-4 py-3">{cat.image_url ? <Image src={cat.image_url} alt={cat.name} width={40} height={40} className="object-cover rounded" /> : <span className="text-muted-foreground">-</span>}</td>
                <td className="px-4 py-3 text-center text-foreground">{cat.display_order}</td>
                <td className="px-4 py-3 text-center text-foreground">{cat.is_active ? 'Yes' : 'No'}</td>
                <td className="flex items-center justify-center px-4 py-3 text-center relative">
                  <DropdownMenu >
                    <DropdownMenuTrigger asChild>
                      <span className="cursor-pointer text-gray-500 hover:text-black mt-2" title="Manage">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="19.5" cy="12" r="1.5" />
                          <circle cx="4.5" cy="12" r="1.5" />
                        </svg>
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(cat)} className="text-blue-600">Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(cat)} className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}