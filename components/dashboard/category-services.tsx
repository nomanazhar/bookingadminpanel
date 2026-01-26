"use client"

import { useEffect, useState } from "react"
import type { Category, Service } from "@/types"
import { CategoryButtons } from "./category-buttons"

export function CategoryServices({ categories }: { categories: Category[] }) {
  const [services, setServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/services`).then((res) => res.json()).then((data) => {
      setServices(data || [])
    })
  }, [])

  // Filter categories to show only those with services
  const filteredCategories = categories.filter((cat) =>
    services.some((s) => s.category_id === cat.id)
  )

  // If a category is selected, only show that one; otherwise show all
  const displayCategories = selected
    ? filteredCategories.filter((cat) => cat.id === selected)
    : filteredCategories

  // Handler to allow deselecting
  const handleSelect = (id: string) => {
    setSelected((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <CategoryButtons categories={categories} selectedId={selected} onSelect={handleSelect} />
      <div className="w-full">
        {displayCategories.map((category: Category) => {
          const catServices = services.filter((s) => s.category_id === category.id)
          if (!catServices.length) return null
          return (
            <section
              key={category.id}
              id={`category-${category.id}`}
              className="container py-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center capitalize">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-center">
                {catServices.map((service: Service) => (
                  <div
                    key={service.id}
                    className="relative rounded-lg overflow-hidden group min-h-[220px] flex items-end"
                    style={{ minHeight: 220 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.thumbnail || "/services/placeholder.jpg"}
                      alt={service.name}
                      className="object-cover w-full h-full absolute inset-0 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                    <div className="relative z-10 p-6 flex flex-col justify-end h-full w-full">
                      <h3 className="text-xl md:text-2xl font-semibold text-white mb-1 drop-shadow-lg capitalize">
                        {service.name}
                      </h3>
                      {/* {service.subtitle && (
                        <div className="text-base text-white mb-4 drop-shadow-lg capitalize">
                          {service.subtitle}
                        </div>
                      )} */}
                      <a href={`/customer-services/${service.slug}`}>
                        <button className="bg-white text-black font-semibold rounded-full px-6 py-2 w-fit shadow-lg text-base cursor-pointer">
                          Book now
                        </button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
