"use client";

import React from "react";
import { formatTime12h, getServiceColor } from "@/lib/calendar-utils";
import type { Order, Doctor } from "@/types";
import { useRouter } from "next/navigation";

interface Props {
  selectedDate: string;
  doctors: Doctor[];
  ordersByDoctor: Record<string, Order[]>;
  timeSlots: string[];
  loading?: boolean;
}

// Helper: parse HH:MM into minutes since midnight
function hhmmToMinutes(t?: string | null) {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

export default function CalendarGrid({ selectedDate, doctors, ordersByDoctor, timeSlots, loading }: Props) {
  const visibleDoctors = doctors || [];
  const router = useRouter();

  const dayStartMins = 9 * 60; // 9:00
  const dayEndMins = 18 * 60; // 18:00
  const slotInterval = 30; // minutes
  const slotHeight = 48; // px per slot
  // Compute container height from actual timeSlots length so labels align to grid
  const containerHeight = (timeSlots.length) * slotHeight;

  // Build explicit grid template so each doctor always gets its own column
  const columnsTemplate = `120px ${visibleDoctors.map(() => "minmax(180px, 1fr)").join(" ")}`;
  const dynamicMinWidth = `${120 + visibleDoctors.length * 200}px`;

  return (
    <div className="border rounded-md overflow-auto">
      <div style={{ minWidth: dynamicMinWidth }}>
        {/* Header */}
        <div className="items-center border-b bg-background" style={{ display: "grid", gridTemplateColumns: columnsTemplate }}>
          <div className="p-2 bg-muted font-medium">Time</div>
          {visibleDoctors.map((d) => (
            <div key={d.id} className="p-2 text-sm font-medium border-l">
              <div>Dr. {d.first_name} {d.last_name}</div>
              {d.specialization && <div className="text-xs text-muted-foreground">{d.specialization}</div>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="relative">
          <div style={{ display: "grid", gridTemplateColumns: columnsTemplate }}>
            {/* Time labels column */}
            <div className="relative border-r">
              <div style={{ height: containerHeight }} className="relative">
                {timeSlots.map((slot, idx) => (
                  <div key={slot} style={{ height: slotHeight }} className={`p-2 text-sm text-muted-foreground border-b ${idx % 2 === 0 ? '' : ''}`}>
                    {formatTime12h(slot)}
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor columns */}
            {visibleDoctors.map((d) => (
              <div key={d.id} className="relative border-l">
                <div style={{ height: containerHeight }} className="relative">
                  {/* Render booking blocks absolutely positioned */}
                  {(ordersByDoctor[d.id] || []).map((o) => {
                    const startM = hhmmToMinutes(o.booking_time);
                    const endM = hhmmToMinutes(o.booking_end_time) ?? (startM ? startM + (((o as any).duration_minutes) || 50) : null);
                    if (startM == null || endM == null) return null;
                    // clamp to day range
                    const topM = Math.max(startM, dayStartMins);
                    const bottomM = Math.min(endM, dayEndMins);
                    if (bottomM <= dayStartMins || topM >= dayEndMins) return null;

                    const topPx = ((topM - dayStartMins) / slotInterval) * slotHeight;
                    const heightPx = Math.max(24, ((bottomM - topM) / slotInterval) * slotHeight);

                    // Compute color by service id or title
                    const svcKey = o.service_id || o.service_title || o.id;
                    const baseColor = getServiceColor(String(svcKey), 70, 88);
                    const bg = o.status === 'completed' ? '#D1FAE5' : baseColor;
                    const borderColor = getServiceColor(String(svcKey), 75, 72);
                    return (
                      <div
                        key={o.id}
                        className="absolute left-2 right-2 px-3 py-2 rounded-md shadow hover:shadow-lg transition-transform hover:-translate-y-0.5 overflow-hidden cursor-pointer border"
                        style={{ top: topPx, height: heightPx, background: bg, borderLeft: `4px solid ${borderColor}`, borderColor: 'transparent' }}
                        title={`${o.customer_name} • ${o.service_title} • ${o.booking_time} - ${o.booking_end_time || ''}`}
                        onClick={() => router.push(`/orders/${o.id}/edit`)}
                      >
                        <div className="font-medium text-sm truncate text-foreground">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{o.service_title}</div>
                      </div>
                    );
                  })}

                  {/* Grid lines for slots */}
                  {timeSlots.map((slot) => (
                    <div key={slot} style={{ height: slotHeight }} className="border-b" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
