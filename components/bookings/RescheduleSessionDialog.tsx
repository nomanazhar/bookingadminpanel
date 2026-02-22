"use client"
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Reschedule Session {session?.session_number}</DialogTitle>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <Input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
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
