"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SessionRow } from "./session-row";
import type { Session } from "@/types/database";
import type { OrderWithDetails } from "@/types";

interface SessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails;
  sessions: Session[];
  doctorName?: string;
}

export function SessionsModal({
  open,
  onOpenChange,
  order,
  sessions,
  doctorName,
}: SessionsModalProps) {
  const router = useRouter();

  // Sort sessions by session_number
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.session_number - b.session_number),
    [sessions]
  );

  // Find the next upcoming session (first non-completed)
  const nextUpcomingSession = useMemo(
    () => sortedSessions.find((s) => s.status !== "completed"),
    [sortedSessions]
  );

  const handleEditSession = useCallback((session: Session) => {
    // Navigate to order edit page
    router.push(`/orders/${order.id}/edit?sessionId=${session.id}`);
    onOpenChange(false);
  }, [order.id, router, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-2xl overflow-y-auto rounded-2xl shadow-2xl border-0 bg-white">
        <SheetHeader>
          <SheetTitle>Sessions</SheetTitle>
          <SheetDescription>
            {order.customer_name} • {order.service?.name || "Service"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-2">
          {sortedSessions.map((session) => {
            const isUpcoming = session.id === nextUpcomingSession?.id;

            return (
              <SessionRow
                key={session.id}
                session={session}
                isUpcoming={isUpcoming}
                doctorName={doctorName}
                onEdit={() => handleEditSession(session)}
              />
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
