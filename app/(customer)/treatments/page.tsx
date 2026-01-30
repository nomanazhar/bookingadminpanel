

"use client";

import { useEffect, useState } from "react";
import { CategoryButtons } from '@/components/dashboard/category-buttons';
import { ServiceCard } from '@/components/dashboard/service-card';
import type { Category, Service } from '@/types';

export default function AllTreatmentsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/services').then(res => res.json())
    ])
      .then(([catData, svcData]) => {
        setCategories(Array.isArray(catData) ? catData : []);
        setServices(Array.isArray(svcData) ? svcData : []);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  // Only show selected category's services, or all if none selected
  const displayCategories = selected
    ? categories.filter(cat => cat.id === selected)
    : categories;

  const handleSelect = (id: string) => {
    setSelected((prev: string | null) => (prev === id ? null : id));
  };

  return (
    <main className="container mx-auto py-8 ">
      <section className="max-w-3xl mx-auto mb-10 ">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          All Treatments
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Browse all available treatment categories below.
        </p>
        <CategoryButtons categories={categories} selectedId={selected} onSelect={handleSelect} />
      </section>

      {/* Services Section */}
      <section className="max-w-7xl mx-auto mb-10">
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          displayCategories.map((category: Category) => {
            const catServices = services.filter((s: Service) => s.category_id === category.id);
            if (!catServices.length) return null;
            return (
              <div key={category.id} className="mb-12" id={`category-${category.id}`}>
                <h2 className="text-2xl font-semibold mb-6 capitalize">{category.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {catServices.map((service: Service) => (
                      <ServiceCard key={service.id} service={{ ...service, category }} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}