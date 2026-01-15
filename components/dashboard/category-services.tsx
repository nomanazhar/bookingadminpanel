"use client"

import { useState } from "react"
import type { Category } from "@/types"
import { CategoryButtons } from "./category-buttons"
import { ServicesGallery } from "./services-gallery"

export function CategoryServices({ categories }: { categories: Category[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <CategoryButtons categories={categories} selectedId={selected} onSelect={setSelected} />
      <ServicesGallery categoryId={selected} />
    </>
  )
}
