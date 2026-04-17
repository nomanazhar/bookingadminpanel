"use client"

import React, { useState, useRef, useEffect } from "react";
import CalendarGrid from "@/components/admin/calendar-grid";
import { useCalendarData } from "@/hooks/useCalendarData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/dist/client/link";
import { ArrowLeft } from "lucide-react";


export default function CalendarViewPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [filteredDoctorIds, setFilteredDoctorIds] = useState<string[]>([]);

  const { doctors, ordersByDoctor, timeSlots, loading } = useCalendarData(selectedDate, filteredDoctorIds);

  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const toggleDoctor = (id: string) => {
    setFilteredDoctorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDoctorDropdown(false);
      }
    }
    if (showDoctorDropdown) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showDoctorDropdown]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center justify-start gap-4">
           <Link href="/admin-dashboard">
                  <Button variant="primary" size="icon" className="h-6 w-10 ">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
          <h1 className="text-2xl font-bold">Calendar View</h1>
          <p className="text-sm text-muted-foreground">Day view of bookings for all therapists</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          <div className="space-y-1 relative" ref={dropdownRef}>
            <Label>Doctors</Label>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-md border bg-white text-sm text-muted-foreground hover:bg-slate-50"
                onClick={() => { setFilteredDoctorIds([]); setShowDoctorDropdown(false); }}
                title="Show all"
              >
                All
              </button>

              <button
                className="px-3 py-1 rounded-md border bg-white text-sm hover:bg-slate-50 flex items-center gap-2"
                onClick={() => setShowDoctorDropdown(v => !v)}
              >
                <span className="text-sm">{filteredDoctorIds.length === 0 ? 'Filter Doctors' : `${filteredDoctorIds.length} selected`}</span>
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>

              {showDoctorDropdown && (
                <div className="absolute right-0 top-0 mt-6 w-44 bg-white border rounded shadow-lg z-50 p-2 max-h-64 overflow-auto">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button className="text-xs text-muted-foreground hover:underline" onClick={() => setFilteredDoctorIds([])}>Clear</button>
                    <button className="text-xs text-muted-foreground hover:underline" onClick={() => setFilteredDoctorIds(doctors.map(d => d.id))}>Select All</button>
                  </div>
                  <div className="divide-y">
                    {doctors.map(d => (
                      <label key={d.id} className="flex items-center gap-2 py-2 px-1 text-sm hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={filteredDoctorIds.includes(d.id)} onChange={() => toggleDoctor(d.id)} className="w-4 h-4 accent-emerald-500" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">Dr. {d.first_name} {d.last_name}</div>
                          {d.specialization && <div className="text-xs text-muted-foreground truncate">{d.specialization}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button className="mt-6" variant="outline" onClick={() => setSelectedDate(today)}>Today</Button>
        </div>
      </div>

      <div>
        <CalendarGrid
          selectedDate={selectedDate}
          doctors={doctors}
          ordersByDoctor={ordersByDoctor}
          timeSlots={timeSlots}
          loading={loading}
        />
      </div>
    </div>
  );
}
