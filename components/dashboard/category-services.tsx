"use client"

import { useEffect, useState } from "react"

import type { Category, Service } from "@/types"
import { CategoryButtons } from "./category-buttons"
import { useLocation } from "../providers/location-provider"

export function CategoryServices() {
  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const { location } = useLocation();

  // Fetch categories and services on mount
  useEffect(() => {
    fetch(`/api/categories`).then((res) => res.json()).then((data) => {
      setCategories(data || [])
    })
    fetch(`/api/services`).then((res) => res.json()).then((data) => {
      setServices(data || [])
    })
  }, [])


  // Treat 'Stay Here' as show all
  const normalizedLocation = location ? location.trim().toLowerCase() : '';
  const isShowAll = !normalizedLocation || normalizedLocation === 'stay here';

  // Filter categories and services by selected location, or show all if 'Stay Here'
  const filteredCategories = isShowAll
    ? categories.filter((cat) => services.some((s) => s.category_id === cat.id))
    : categories.filter((cat) => {
        const catLocs = (cat.locations || []).map((l: string) => l.trim().toLowerCase());
        return catLocs.includes(normalizedLocation) &&
          services.some((s) => {
            const svcLocs = (s.locations || []).map((l: string) => l.trim().toLowerCase());
            return s.category_id === cat.id && svcLocs.includes(normalizedLocation);
          });
      });

  // If a category is selected, only show that one; otherwise show all
  const displayCategories = selected
    ? filteredCategories.filter((cat) => cat.id === selected)
    : filteredCategories

  // Handler to allow deselecting
  const handleSelect = (id: string) => {
    setSelected((prev) => (prev === id ? null : id))
  }

  // Loading and error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/categories`).then((res) => res.json()),
      fetch(`/api/services`).then((res) => res.json()),
    ])
      .then(([catData, svcData]) => {
        setCategories(Array.isArray(catData) ? catData : []);
        setServices(Array.isArray(svcData) ? svcData : []);
      })
      .catch((err) => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-40 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="container py-8 text-red-500 text-center">{error}</div>;
  }

  return (
    <>
      <CategoryButtons categories={filteredCategories} selectedId={selected} onSelect={handleSelect} />
      <div className="w-full">
        {displayCategories.map((category: Category) => {
          const catServices = isShowAll
            ? services.filter((s) => s.category_id === category.id)
            : services.filter((s) => {
                const svcLocs = (s.locations || []).map((l: string) => l.trim().toLowerCase());
                return s.category_id === category.id && svcLocs.includes(normalizedLocation);
              });
          if (!catServices.length) return null;
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
          );
        })}
      </div>
    </>
  );
}
