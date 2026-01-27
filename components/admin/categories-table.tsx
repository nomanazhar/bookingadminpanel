"use client"

import { memo, useState, useMemo } from "react"
import TableSearchBar from './table-search-bar'
import type { Category } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash } from "lucide-react"

interface CategoriesTableProps {
  categories: Category[]
}

function CategoriesTableComponent({ categories }: CategoriesTableProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(cat =>
      (cat.name?.toLowerCase().includes(q) || '') ||
      (cat.description?.toLowerCase().includes(q) || '') ||
      String(cat.display_order).includes(q) ||
      (cat.is_active ? 'active' : 'inactive').includes(q)
    );
  }, [categories, search]);

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No categories yet
      </div>
    )
  }

  return (
    <div>
      <TableSearchBar
        value={search}
        onChange={setSearch}
        onSearch={() => {}}
        placeholder="Search categories..."
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="max-w-md truncate">
                  {category.description || "—"}
                </TableCell>
                <TableCell>{category.display_order}</TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 bg-white p-2 rounded shadow-md absolute z-10">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export const CategoriesTable = memo(CategoriesTableComponent)

