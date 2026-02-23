"use client"
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ServiceDateSelector from "@/components/services/ServiceDateSelector";

export default function RescheduleSessionDialog({
  open,
  onClose,
  onSubmit,
  session,
  minDate,
  maxDate,
  loading
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (date: string, time: string) => void;
  session: any;
  minDate?: string;
  maxDate?: string;
  loading?: boolean;
}) {

  const [date, setDate] = useState(session?.scheduled_date || "");
  const [time, setTime] = useState(session?.scheduled_time || "");

  // Update fields when session changes (e.g., dialog opened for a different session)
  useEffect(() => {
    setDate(session?.scheduled_date || "");
    setTime(session?.scheduled_time || "");
  }, [session]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Reschedule Session {session?.session_number}</DialogTitle>
        <div className="space-y-4 mt-2">
          <ServiceDateSelector
            onChange={({ date: d, time: t }) => {
              setDate(d || "");
              setTime(t || "");
            }}
            // Optionally, you can pass allowedTabs/availableSlots here if needed
          />
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={() => onSubmit(date, time)} disabled={loading || !date || !time}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
