"use client"

import { useState } from "react"
import Image from "next/image"
import { AddCategoryForm } from "@/components/admin/add-category-form"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Category } from "@/types"

export default function ClientCategoriesSection({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [editCategory, setEditCategory] = useState<Category | undefined>(undefined)
  
  const handleCategoryAdded = async () => {
    setEditCategory(undefined)
    const res = await fetch("/api/categories-list")
    if (res.ok) {
      setCategories(await res.json())
    }
  }
  
  const handleEdit = (cat: Category) => {
    setEditCategory(cat)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" })
    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== cat.id))
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
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full bg-card">
          <thead className="bg-muted/50">
            <tr>
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
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-semibold text-foreground">{cat.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{cat.description}</td>
                <td className="px-4 py-3">{cat.image_url ? <Image src={cat.image_url} alt={cat.name} width={40} height={40} className="object-cover rounded" /> : <span className="text-muted-foreground">-</span>}</td>
                <td className="px-4 py-3 text-center text-foreground">{cat.display_order}</td>
                <td className="px-4 py-3 text-center text-foreground">{cat.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Manage</button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(cat)}>Edit</DropdownMenuItem>
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