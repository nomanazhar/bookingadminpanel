"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

import TableSearchBar from "@/components/admin/table-search-bar";
import { AddCategoryForm } from "@/components/admin/add-category-form";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import type { Category } from "@/types";

interface CategoriesTableProps {
  initialCategories: Category[];
}

export default function CategoriesTable({
  initialCategories,
}: CategoriesTableProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [editCategory, setEditCategory] = useState<Category | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);

  const handleCategoryAdded = async () => {
    setEditCategory(undefined);
    setError(null);

    try {
      const res = await fetch("/api/categories-list/uncached", {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch categories");
      setCategories(await res.json());
    } catch (err: any) {
      setError(err?.message || "Unknown error fetching categories");
      setCategories([]);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditCategory(cat);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;

    setError(null);

    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete category");

      const uncached = await fetch("/api/categories-list/uncached", {
        cache: "no-store",
      });

      if (!uncached.ok)
        throw new Error("Failed to fetch categories after delete");

      setCategories(await uncached.json());
    } catch (err: any) {
      setError(err?.message || "Unknown error deleting category");
    }
  };

  const handleCancelEdit = () => {
    setEditCategory(undefined);
  };

  const filteredCategories = useMemo(() => {
    if (!search) return categories;

    const q = search.toLowerCase();

    return categories.filter((cat) =>
      [
        cat.name,
        cat.description,
        cat.slug,
        String(cat.display_order),
        cat.is_active ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [categories, search]);

  return (
    <>
      <div className="mb-8">
        <AddCategoryForm
          onCategoryAdded={handleCategoryAdded}
          initialValues={editCategory}
          onCancel={handleCancelEdit}
        />
      </div>

      <div className="mb-4">
        <TableSearchBar
          value={search}
          onChange={setSearch}
          onSearch={() => {}}
          placeholder="Search categories..."
        />
      </div>

      {error && (
        <div className="text-red-500 mb-4">Error: {error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full bg-card">
          <thead className="bg-muted/50">
            <tr className="bg-[#333333] text-white">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-center">Order</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Manage</th>
            </tr>
          </thead>

          <tbody>
            {filteredCategories.length === 0 && !error && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-muted-foreground py-6"
                >
                  No categories found.
                </td>
              </tr>
            )}

            {filteredCategories.map((cat) => (
              <tr
                key={cat.id}
                className="border-b hover:bg-muted/30 transition"
              >
                <td className="px-4 py-3 font-semibold">
                  {cat.name}
                </td>
                <td className="px-4 py-3 text-sm">
                  {cat.slug}
                </td>
                <td className="px-4 py-3 text-sm">
                  {cat.description}
                </td>
                <td className="px-4 py-3">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {cat.display_order}
                </td>
                <td className="px-4 py-3 text-center">
                  {cat.is_active ? "Yes" : "No"}
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
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600"
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(cat)}
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
