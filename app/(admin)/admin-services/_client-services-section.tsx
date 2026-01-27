"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import TableSearchBar from "@/components/admin/table-search-bar";
import { ServiceForm } from "@/components/admin/service-form";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import type { Category, ServiceWithCategory } from "@/types";

interface ClientServicesSectionProps {
  categories: Category[];
}

export default function ClientServicesSection({
  categories,
}: ClientServicesSectionProps) {
  const [services, setServices] = useState<ServiceWithCategory[]>([]);
  const [search, setSearch] = useState("");
  const [editService, setEditService] =
    useState<ServiceWithCategory | undefined>(undefined);

  /* ------------------ DATA FETCH ------------------ */
  const fetchServices = async () => {
    const res = await fetch("/api/services", { cache: "no-store" });
    if (res.ok) setServices(await res.json());
  };

  useEffect(() => {
    fetchServices();
  }, []);

  /* ------------------ HANDLERS ------------------ */
  const handleServiceSaved = () => {
    setEditService(undefined);
    fetchServices();
  };

  const handleEdit = (service: ServiceWithCategory) => {
    setEditService(service);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (service: ServiceWithCategory) => {
    if (!window.confirm(`Delete service "${service.name}"?`)) return;

    const res = await fetch(`/api/services/${service.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    }
  };

  const handleCancelEdit = () => {
    setEditService(undefined);
  };

  /* ------------------ SEARCH FILTER ------------------ */
  const filteredServices = useMemo(() => {
    if (!search) return services;

    const q = search.toLowerCase();

    return services.filter((s) =>
      [
        s.name,
        s.description,
        s.base_price,
        s.duration_minutes,
        s.is_active ? "active" : "inactive",
        categories.find((c) => c.id === s.category_id)?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [services, search, categories]);

  /* ------------------ RENDER ------------------ */
  return (
    <>
      <div className="mb-8">
        <ServiceForm
          onServiceSaved={handleServiceSaved}
          initialValues={editService}
          categories={categories}
          onCancel={handleCancelEdit}
        />
      </div>

      <div className="mb-4">
        <TableSearchBar
          value={search}
          onChange={setSearch}
          onSearch={() => {}}
          placeholder="Search services..."
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full bg-card">
          <thead className="bg-muted/50">
            <tr className="bg-[#333333] text-white">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Locations</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Manage</th>
            </tr>
          </thead>

          <tbody>
            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  No services found.
                </td>
              </tr>
            )}

            {filteredServices.map((service) => (
              <tr
                key={service.id}
                className="border-b hover:bg-muted/30 transition"
              >
                <td className="px-4 py-3 font-semibold">
                  {service.name}
                </td>
                <td className="px-4 py-3">
                  {categories.find((c) => c.id === service.category_id)?.name ||
                    "-"}
                </td>
                <td className="px-4 py-3">
                  {service.thumbnail ? (
                    <Image
                      src={service.thumbnail}
                      alt={service.name}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">£{service.base_price}</td>
                <td className="px-4 py-3 text-sm">
                  {service.description || "-"}
                </td>
                <td className="px-4 py-3">
                  {service.duration_minutes || "-"} min
                </td>
                <td className="px-4 py-3">
                  {Array.isArray(service.locations) && service.locations.length > 0
                    ? service.locations.map((loc) => (
                        <span key={loc} className="inline-block bg-muted px-2 py-0.5 rounded text-xs mr-1 capitalize">
                          {loc}
                        </span>
                      ))
                    : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  {service.is_active ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-gray-500 hover:text-black">
                        ⋮
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEdit(service)}
                        className="text-blue-600"
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(service)}
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
