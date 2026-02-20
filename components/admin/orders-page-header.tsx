"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Import } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { BookingsImportExportDialog } from "@/components/admin/bookings-import-export-dialog";

export default function OrdersPageHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [status, setStatus] = useState<string>(
    searchParams?.get("status") || "all"
  );
  const [importExportOpen, setImportExportOpen] = useState(false);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    const params = new URLSearchParams(
      Array.from(searchParams?.entries() || [])
    );
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Placeholder import/export logic
  const handleImport = async (rows: any[]) => {
    // TODO: Send rows to backend API for import
    // Example: await fetch('/api/admin/orders/import', { method: 'POST', body: JSON.stringify(rows) })
    return Promise.resolve();
  };
  const handleExport = async () => {
    // TODO: Fetch all bookings and trigger Excel download
    // Example: await fetch('/api/admin/orders/export')
    return Promise.resolve();
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-bold font-heading mb-2">Bookings</h1>
        <p className="text-muted-foreground">Manage customer bookings</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setImportExportOpen(true)}
          className="gap-2"
        >
          <Import className="h-4 w-4" />
          Import/Export
        </Button>

        <BookingsImportExportDialog
          open={importExportOpen}
          onOpenChange={setImportExportOpen}
        />

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter Type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">Show All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => router.push("/orders/new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>
    </div>
  );
}
