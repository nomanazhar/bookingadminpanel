"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface BookingsImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingsImportExportDialog({ open, onOpenChange }: BookingsImportExportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'options' | 'preview' | 'importing' | 'done'>('options');
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFileKey, setUploadedFileKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(0);
    setUploadedFileKey(null);
    setImportErrors([]);
    // Preview Excel rows before upload
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setImportRows(rows);
      } catch (err) {
        setImportErrors(["Failed to parse Excel file."]);
      }
    };
    reader.readAsArrayBuffer(file);
    // Upload file to backend with progress
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/orders/import-upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          setUploadedFileKey(res.fileKey);
          setStep("preview");
        } catch (err) {
          setImportErrors(["Upload succeeded but response was invalid."]);
        }
      } else {
        setImportErrors([`Upload failed: ${xhr.statusText}`]);
      }
    };
    xhr.onerror = () => {
      setImportErrors(["Upload failed: network error"]);
    };
    xhr.send(formData);
    setStep("importing");
  };

  const handleImportConfirm = async () => {
    setStep("importing");
    try {
      if (!uploadedFileKey) throw new Error("No uploaded file reference");
      // Tell backend to process the uploaded file
      const res = await fetch("/api/admin/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: uploadedFileKey }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Import failed");
      }
      // Show import result (success/skipped/errors)
      let msg = `Imported: ${result.imported || 0}`;
      if (result.skipped && result.skipped.length > 0) {
        msg += `, Skipped: ${result.skipped.length}`;
      }
      toast({ title: "Import successful", description: msg });
      setStep("done");
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
      setStep("options");
    }
  };

  // Export logic: ask for export type, fetch, generate Excel, trigger download
  const [exportType, setExportType] = useState<'orders'|'legacy'|'both'>('orders');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const handleExport = async () => {
    setShowExportOptions(true);
  };
  const doExport = async () => {
    try {
      const res = await fetch(`/api/admin/orders/export?type=${exportType}`);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const bookings = await res.json();
      if (!Array.isArray(bookings) || bookings.length === 0) throw new Error("No bookings found");
      // Map to Excel columns
      const excelRows = bookings.map((b, idx) => {
        // Split customer_name into first/last name
        let firstName = '', lastName = '';
        if (b.customer_name) {
          const parts = b.customer_name.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        // Format date as DD-MM-YYYY
        let date = b.booking_date || '';
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [y, m, d] = date.split('-');
          date = `${d}-${m}-${y}`;
        }
        // Format time as HH:mm
        const fmtTime = (t: string | undefined) => t ? String(t).slice(0,5) : '';
        return {
          "Sr.No": idx + 1,
          "Date": date,
          "Start Time": fmtTime(b.booking_time),
          "End Time": fmtTime(b.booking_end_time),
          "First Name": firstName,
          "Last Name": lastName,
          "Treatment": b.service_title || '',
          "Customer Type": b.customer_type === 'returning' ? 'Returning customer' : 'New customer',
          "Telephone No": b.customer_phone || '',
          "Email": b.customer_email || '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings_export_${exportType}_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      setShowExportOptions(false);
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
      setShowExportOptions(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-lg w-full bg-white">
        <SheetHeader>
          <SheetTitle>Import/Export Bookings</SheetTitle>
          <SheetDescription>
            Import bookings from Excel or export all bookings as Excel file.
          </SheetDescription>
        </SheetHeader>
        {step === "options" && (
          <div className="flex flex-col gap-4 mt-4">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Import Booking Database
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                <div className="text-xs mt-1">Uploading: {uploadProgress}%</div>
              </div>
            )}
            <Button onClick={handleExport}>Export Booking Database</Button>
            {showExportOptions && (
              <div className="flex flex-col gap-2 mt-2 p-2 border rounded bg-gray-50">
                <div className="font-semibold mb-1">Export Options:</div>
                <label className="flex items-center gap-2">
                  <input type="radio" name="exportType" value="orders" checked={exportType==='orders'} onChange={()=>setExportType('orders')} />
                  Only Orders
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="exportType" value="legacy" checked={exportType==='legacy'} onChange={()=>setExportType('legacy')} />
                  Only Legacy Orders
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="exportType" value="both" checked={exportType==='both'} onChange={()=>setExportType('both')} />
                  Both Combined
                </label>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={doExport}>Export</Button>
                  <Button size="sm" variant="outline" onClick={()=>setShowExportOptions(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
        {step === "preview" && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Preview Import</h3>
            {importErrors.length > 0 ? (
              <div className="text-red-500 mb-2">
                {importErrors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            ) : (
              <div className="max-h-48 overflow-auto border rounded mb-2">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      {Object.keys(importRows[0] || {}).map((col) => (
                        <th key={col} className="px-2 py-1 border-b">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-2 py-1 border-b">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 5 && <div className="text-xs text-muted-foreground">...and {importRows.length - 5} more rows</div>}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setStep("options")}>Cancel</Button>
              <Button disabled={importErrors.length > 0} onClick={handleImportConfirm}>Confirm Import</Button>
            </div>
          </div>
        )}
        {step === "importing" && (
          <div className="mt-4 flex flex-col items-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className="bg-blue-600 h-2 animate-pulse w-full"></div>
            </div>
            <div className="text-sm text-muted-foreground">Processing import, please wait...</div>
            <div className="mt-2">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => { setStep("options"); }}>Cancel</Button>
          </div>
        )}
        {step === "done" && (
          <div className="mt-4">Import complete!</div>
        )}
        <SheetFooter className="mt-8">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
