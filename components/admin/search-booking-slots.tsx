"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Doctor {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface SearchBookingSlotsProps {
  doctors: Doctor[];
  services: Service[];
  onSearch: (params: {
    from: string;
    to: string;
    doctorIds: string[];
    startTime: string;
    endTime: string;
    serviceId: string;
  }) => void;
  loading?: boolean;
}

const timeOptions = [
  "08:00", "08:15", "08:30", "08:45", "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00"
];

function SearchBookingSlots({ doctors, services, onSearch, loading }: SearchBookingSlotsProps) {
  // Get current date in yyyy-mm-dd format
  const getToday = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };
  // All fields optional for flexible search
  const [from, setFrom] = useState<string | "">("");
  const [to, setTo] = useState<string | "">("");
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [allChecked, setAllChecked] = useState(false);
  const [startTime, setStartTime] = useState<string | "">("");
  const [endTime, setEndTime] = useState<string | "">("");
  const [serviceId, setServiceId] = useState<string>("");

  useEffect(() => {
    if (allChecked) {
      setSelectedDoctors(doctors.map((d: Doctor) => d.id));
    } else if (selectedDoctors.length === doctors.length && doctors.length > 0) {
      setAllChecked(true);
    }
  }, [allChecked, doctors, selectedDoctors.length]);

  const handleDoctorChange = (id: string) => {
    if (selectedDoctors.includes(id)) {
      setSelectedDoctors(selectedDoctors.filter((d: string) => d !== id));
      setAllChecked(false);
    } else {
      const newSelected = [...selectedDoctors, id];
      setSelectedDoctors(newSelected);
      if (newSelected.length === doctors.length) setAllChecked(true);
    }
  };

  const handleAllChange = () => {
    if (allChecked) {
      setSelectedDoctors([]);
      setAllChecked(false);
    } else {
      setSelectedDoctors(doctors.map((d: Doctor) => d.id));
      setAllChecked(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      alert("Please select a service");
      return;
    }
    // Provide default values for all required fields
    onSearch({
      from: from || getToday(),
      to: to || from || getToday(),
      doctorIds: selectedDoctors.length > 0 ? selectedDoctors : doctors.map((d: Doctor) => d.id),
      startTime: startTime || "",
      endTime: endTime || "",
      serviceId
    });
  };

  return (
    <form className="bg-white rounded shadow p-6 flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-2 min-w-[220px]">
          <label className="font-medium">Service</label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((svc: Service) => (
                <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
          <label className="font-medium">Search From</label>
          <div className="flex gap-2 items-center">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            {from && <Button type="button" size="sm" variant="outline" onClick={() => setFrom("")}>Clear</Button>}
          </div>
          <label className="font-medium">Search To</label>
          <div className="flex gap-2 items-center">
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            {to && <Button type="button" size="sm" variant="outline" onClick={() => setTo("")}>Clear</Button>}
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-[180px]">
          <label className="font-medium">Start Time</label>
          <div className="flex gap-2 items-center">
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {startTime && <Button type="button" size="sm" variant="outline" onClick={() => setStartTime("")}>Clear</Button>}
          </div>
          <label className="font-medium">End Time</label>
          <div className="flex gap-2 items-center">
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {endTime && <Button type="button" size="sm" variant="outline" onClick={() => setEndTime("")}>Clear</Button>}
          </div>
        </div>
        <div className="flex flex-col mt-8 ml-12 gap-2 min-w-[220px]">
          {doctors.map((doctor: Doctor) => (
            <label key={doctor.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedDoctors.includes(doctor.id)}
                onChange={() => handleDoctorChange(doctor.id)}
              />
              {doctor.name}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allChecked} onChange={handleAllChange} />
            All
          </label>
        </div>
      </div>
      <div>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded" disabled={loading}>
          {loading ? "Searching..." : "Search Slot"}
        </Button>
      </div>
    </form>
  );
}
export default SearchBookingSlots;
