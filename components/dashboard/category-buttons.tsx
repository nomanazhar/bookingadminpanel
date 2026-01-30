"use client"

import { Button } from "@/components/ui/button"
import type { Category } from "@/types"

interface CategoryButtonsProps {
  categories: Category[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function CategoryButtons({ categories, selectedId = null, onSelect }: CategoryButtonsProps) {
  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`)
    element?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleClick = (id: string) => {
    onSelect?.(id)
    scrollToCategory(id)
  }

  return (
    <section className="w-full py-2 overflow-hidden">
      <div className="container px-4">
        {/* Wrapped buttons for all screen sizes */}
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center max-w-full ">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedId === category.id ? "default" : "outline"}
              size="sm"
              className={`font-semibold text-xs md:text-sm whitespace-nowrap capitalize ${selectedId === category.id ? "bg-[#333333] text-white border-2 border-primary" : "bg-white text-[#333333]"}`}
              onClick={() => handleClick(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
