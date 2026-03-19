"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import type { Session } from "@/types/database";

interface SessionRowProps {
  session: Session;
  isUpcoming: boolean;
  doctorName?: string;
  onEdit?: () => void;
}

export function SessionRow({
  session,
  isUpcoming,
  doctorName,
  onEdit,
}: SessionRowProps) {
  const statusIcon = session.status === "completed" ? (
    <CheckCircle2 className="w-5 h-5 text-green-600" />
  ) : (
    <Clock className="w-5 h-5 text-orange-600" />
  );

  return (
    <div
      className={`border rounded-lg p-2 flex items-center justify-between ${
        session.status === "completed"
          ? "bg-green-50 border-green-200"
          : isUpcoming
            ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
            : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2 min-w-fit">
          {statusIcon}
          <span className="font-semibold text-sm">Session {session.session_number}</span>
        </div>

        <div className="flex-1 flex items-center gap-6 text-sm">
          <div className="min-w-fit">
            <span className="text-muted-foreground">Date:</span>
            <div className="font-medium">
              {session.status === "completed" && session.attended_date
                ? format(new Date(`${session.attended_date}T00:00`), "MMM dd, yyyy")
                : session.scheduled_date
                  ? format(new Date(`${session.scheduled_date}T00:00`), "MMM dd, yyyy")
                  : "-"}
            </div>
          </div>
          <div className="min-w-fit">
            <span className="text-muted-foreground">Time:</span>
            <div className="font-medium">
              {session.status === "completed" && session.attended_time
                ? session.attended_time
                : session.scheduled_time || "-"}
            </div>
          </div>
          {doctorName && (
            <div className="min-w-fit">
              <span className="text-muted-foreground">Doctor:</span>
              <div className="font-medium">{doctorName}</div>
            </div>
          )}
          <div className="min-w-fit">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              session.status === "completed"
                ? "bg-green-200 text-green-900"
                : "bg-orange-200 text-orange-900"
            }`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {isUpcoming && session.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
