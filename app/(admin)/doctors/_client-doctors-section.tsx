"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import TableSearchBar from "@/components/admin/table-search-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

import type { Doctor } from "@/types";

interface Props {
  initialDoctors: Doctor[] | { error: string };
}

export default function ClientDoctorsSection({ initialDoctors }: Props) {
  const router = useRouter();

  const [doctors, setDoctors] = useState<Doctor[]>(
    Array.isArray(initialDoctors) ? initialDoctors : []
  );

  const [search, setSearch] = useState("");

  const [tableError, setTableError] = useState<string | null>(() => {
    if (!Array.isArray(initialDoctors) && "error" in initialDoctors) {
      return (
        initialDoctors.error ||
        "The doctors table does not exist. Please run the database migration."
      );
    }
    return null;
  });

  /* ------------------ FETCH ------------------ */
  const refreshDoctors = useCallback(async () => {
    setTableError(null);
    const res = await fetch("/api/doctors", { cache: "no-store" });

    if (!res.ok) return;

    const data = await res.json();

    if (data?.error?.includes("does not exist")) {
      setTableError(
        "The doctors table does not exist. Please run the database migration."
      );
    } else {
      setDoctors(data);
    }
  }, []);

  /* ------------------ ACTIONS ------------------ */
  const handleEdit = (doctor: Doctor) => {
    router.push(`/admin/doctors/${doctor.id}/edit`);
  };

  const handleDelete = async (doctor: Doctor) => {
    if (
      !window.confirm(
        `Delete doctor "${doctor.first_name} ${doctor.last_name}"?`
      )
    )
      return;

    const res = await fetch(`/api/doctors/${doctor.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
    } else {
      const error = await res.json();
      alert(error?.error || "Failed to delete doctor");
    }
  };

  /* ------------------ REFRESH ON FOCUS ------------------ */
  useEffect(() => {
    const onFocus = () => refreshDoctors();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshDoctors]);

  /* ------------------ SEARCH FILTER ------------------ */
  const filteredDoctors = useMemo(() => {
    if (!search) return doctors;

    const q = search.toLowerCase();

    return doctors.filter((d) =>
      [
        d.first_name,
        d.last_name,
        d.email,
        d.phone,
        d.specialization,
        d.bio,
        d.is_active ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [doctors, search]);

  /* ------------------ ERROR UI ------------------ */
  if (tableError) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-50 p-8">
        <h3 className="text-xl font-semibold text-red-800 mb-4">
          Database Setup Required
        </h3>
        <p className="text-red-700 mb-4">
          The doctors table does not exist. Run the migration before using this
          feature.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Refresh After Migration
        </button>
      </div>
    );
  }

  /* ------------------ RENDER ------------------ */
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredDoctors.length
            ? `${filteredDoctors.length} doctor${
                filteredDoctors.length === 1 ? "" : "s"
              } found`
            : "No doctors yet"}
        </p>

        <Link href="/admin/doctors/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Doctor
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <TableSearchBar
          value={search}
          onChange={setSearch}
          onSearch={() => {}}
          placeholder="Search doctors..."
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        
        <table className="min-w-full bg-card">
          <thead className="bg-[#333333] text-white">
            <tr>
              <th className="px-4 py-3 text-left">Avatar</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Specialization</th>
              <th className="px-4 py-3 text-left">Bio</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Manage</th>
            </tr>
          </thead>

          <tbody>
            {filteredDoctors.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  No doctors found.
                </td>
              </tr>
            )}

            {filteredDoctors.map((doctor) => (
              <tr
                key={doctor.id}
                className="border-b hover:bg-muted/30 transition"
              >
                <td className="px-4 py-3">
                  {doctor.avatar_url ? (
                    <Image
                      src={doctor.avatar_url}
                      alt="avatar"
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="font-semibold text-muted-foreground">
                        {doctor.first_name[0]}
                        {doctor.last_name[0]}
                      </span>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 font-semibold">
                  {doctor.first_name} {doctor.last_name}
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {doctor.email}
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {doctor.phone || "-"}
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {doctor.specialization || "-"}
                </td>

                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                  {doctor.bio || "-"}
                </td>

                <td className="px-4 py-3 text-center">
                  {doctor.is_active ? "Yes" : "No"}
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
                        onClick={() => handleEdit(doctor)}
                        className="text-blue-600"
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(doctor)}
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
