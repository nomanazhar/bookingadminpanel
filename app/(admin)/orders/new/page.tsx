"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import type { Service, Doctor } from "@/types";

export default function CreateBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    searchParams?.get("doctor_id") || ""
  );
  const [selectedSessions, setSelectedSessions] = useState("1");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [customerType, setCustomerType] = useState("new");

  // User search (existing / returning customer)
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUserSearch, setLoadingUserSearch] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  // Debounced search value
  const debouncedUserSearch = useDebouncedValue(userSearch, 400);

  const duplicateOrderId = searchParams?.get("duplicate") || null;

  // Generate time slots: 09:00 – 18:00 every 15 min
  const timeOptions: string[] = [];
  for (let h = 9; h <= 18; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 18 && m > 0) break;
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  // User search debounce + fetch
  useEffect(() => {
    if (debouncedUserSearch.length < 2) {
      setUserResults([]);
      setShowUserDropdown(false);
      setLoadingUserSearch(false);
      return;
    }

    let ignore = false;

    const fetchUsers = async () => {
      try {
        setLoadingUserSearch(true);
        const res = await fetch(`/api/users?search=${encodeURIComponent(debouncedUserSearch)}`);
        if (!res.ok) throw new Error("Failed to search users");
        const data = await res.json();
        if (!ignore) {
          const results = data?.users || [];
          setUserResults(results);
          setShowUserDropdown(true);
        }
      } catch {
        if (!ignore) {
          setUserResults([]);
          setShowUserDropdown(true);
        }
      } finally {
        setLoadingUserSearch(false);
      }
    };

    fetchUsers();

    return () => {
      ignore = true;
    };
  }, [debouncedUserSearch]);

  // Autofill form when selecting existing user
  const handleUserSelect = (user: any) => {
    setCustomerName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
    setCustomerEmail(user.email || "");
    setCustomerPhone(user.phone || "");
    setAddress(user.address || "");
    setNotes((prev) => {
      let note = prev || "";
      if (user.gender) note += (note ? "\n" : "") + `Gender: ${user.gender}`;
      return note;
    });
    setShowUserDropdown(false);
    setUserResults([]);
  };

  // Handle Enter on name input: if dropdown visible use first result,
  // otherwise perform an immediate search and populate if a match is found.
  const handleNameKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    const currentName = customerName.trim();

    // If dropdown already has results, select the first one
    if (showUserDropdown && userResults.length > 0) {
      e.preventDefault();
      handleUserSelect(userResults[0]);
      return;
    }

    // Require at least 2 characters to perform a search
    if (currentName.length < 2) return;

    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(currentName)}`);
      if (!res.ok) return;
      const data = await res.json();
      const users = data?.users || [];

      if (users.length > 0) {
        e.preventDefault();
        // populate with the first matching user
        handleUserSelect(users[0]);
      }
    } catch (err) {
      // ignore errors and allow normal form behavior
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showUserDropdown]);

  // Duplicate order prefill
  useEffect(() => {
    if (!duplicateOrderId) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${duplicateOrderId}`);
        if (!res.ok) throw new Error("Failed to fetch order for duplication");
        const order = await res.json();

        setCustomerName(order.customer_name || "");
        setCustomerEmail(order.customer_email || "");
        setCustomerPhone(order.customer_phone || "");
        setAddress(order.address || "");
        setSelectedServiceId(order.service_id || "");
        setSelectedDoctorId(order.doctor_id || "");
        setSelectedSessions(String(order.session_count || 1));
        setBookingDate(order.booking_date || "");
        setBookingTime(order.booking_time?.slice(0, 5) || "");
        setNotes(order.notes || "");
      } catch (e: any) {
        toast({
          title: "Duplication Error",
          description: e.message,
          variant: "destructive",
        });
      }
    };

    fetchOrder();
  }, [duplicateOrderId, toast]);

  // Load services & doctors
  useEffect(() => {
    const loadData = async () => {
      setLoadingServices(true);
      setLoadingDoctors(true);

      try {
        const [servicesRes, doctorsRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/doctors"),
        ]);

        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(Array.isArray(data) ? data : []);
        }

        if (doctorsRes.ok) {
          const data = await doctorsRes.json();
          if (Array.isArray(data)) {
            setDoctors(data.filter((d: Doctor) => d.is_active));
          }
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setLoadingServices(false);
        setLoadingDoctors(false);
      }
    };

    loadData();
  }, []);

  // Auto-select doctor from URL param
  useEffect(() => {
    const doctorIdFromUrl = searchParams?.get("doctor_id");
    if (doctorIdFromUrl) {
      setSelectedDoctorId(doctorIdFromUrl);
    }
  }, [searchParams]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Parse session options safely
  const parseSessionOptions = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed;
      if (parsed?.options && Array.isArray(parsed.options)) return parsed.options;
    } catch {}
    return [];
  };

  const getMaxSessions = (): number => {
    if (!selectedService) return 10;
    const opts = parseSessionOptions(selectedService.session_options);
    if (opts.length === 0) return 10;

    let max = 1;
    opts.forEach((opt: string) => {
      const match = String(opt).match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    return Math.max(1, Math.min(10, max));
  };

  const maxSessions = getMaxSessions();
  const sessionsOptions = Array.from({ length: maxSessions }, (_, i) => String(i + 1));

  // Reset sessions if service changes and current value is invalid
  useEffect(() => {
    if (!selectedServiceId) return;
    const current = parseInt(selectedSessions, 10);
    if (current > maxSessions || current < 1) {
      setSelectedSessions("1");
    }
  }, [selectedServiceId, maxSessions, selectedSessions]);

  const getDiscount = (sessions: number): number => {
    switch (sessions) {
      case 3:
        return 0.25;
      case 6:
        return 0.35;
      case 10:
        return 0.45;
      default:
        return 0;
    }
  };

  const calculatePrice = () => {
    if (!selectedService) return 0;
    const base = Number(selectedService.base_price ?? 0);
    const count = parseInt(selectedSessions, 10);
    const discount = getDiscount(count);
    return Math.round((base * (1 - discount) * count) * 100) / 100;
  };

  const totalPrice = calculatePrice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !customerEmail) {
      toast({
        title: "Validation Error",
        description: "Please provide customer name and email",
        variant: "destructive",
      });
      return;
    }

    if (!selectedServiceId) {
      toast({
        title: "Validation Error",
        description: "Please select a service",
        variant: "destructive",
      });
      return;
    }

    if (!bookingDate || !bookingTime) {
      toast({
        title: "Validation Error",
        description: "Please select booking date and time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const service = services.find((s) => s.id === selectedServiceId)!;

      const sessionsNum = parseInt(selectedSessions, 10);
      const discount = getDiscount(sessionsNum);
      const basePrice = Number(service.base_price ?? 0);
      const unitPrice = Math.round((basePrice * (1 - discount)) * 100) / 100;
      const totalAmount = unitPrice * sessionsNum;

      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        service_id: selectedServiceId,
        doctor_id: selectedDoctorId || null,
        service_title: service.name || "",
        package: `${selectedSessions} session${selectedSessions !== "1" ? "s" : ""}`,
        sessions: sessionsNum,
        unit_price: unitPrice,
        discount_percent: Math.round(discount * 100),
        total_amount: totalAmount,
        booking_date: bookingDate,
        booking_time: bookingTime,
        address: address || null,
        notes: notes || null,
        customer_type: customerType,
      };

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      toast({
        title: "Success",
        description: "Booking created successfully",
      });

      router.push("/orders");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">Create New Booking</h1>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
          <CardDescription>Fill in the details to create a new booking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Customer Details
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customerName">Full Name *</Label>
                  <div className="relative" ref={userDropdownRef}>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setUserSearch(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => {
                        setShowUserDropdown(true);
                      }}
                      onKeyDown={handleNameKeyDown}
                      placeholder="Enter customer full name"
                      required
                      className="w-full"
                      autoComplete="off"
                    />

                    {showUserDropdown &&
                      (loadingUserSearch || userResults.length > 0 || debouncedUserSearch.length >= 2) && (
                        <div className="absolute z-10 left-0 right-0 bg-white border rounded shadow max-h-56 overflow-y-auto mt-1">
                          {loadingUserSearch ? (
                            <div className="px-4 py-2 text-sm text-muted-foreground">Searching...</div>
                          ) : userResults.length > 0 ? (
                            userResults.map((user) => (
                              <div
                                key={user.id}
                                className="px-4 py-2 cursor-pointer hover:bg-muted"
                                onMouseDown={() => handleUserSelect(user)}
                              >
                                <div className="font-medium">
                                  {user.first_name} {user.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.email}
                                  {user.phone ? ` • ${user.phone}` : ""}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-muted-foreground">No users found</div>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+44 123 456 7890"
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Service Details
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service">Service *</Label>
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                      Loading services...
                    </div>
                  ) : (
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId} required>
                      <SelectTrigger id="service">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - £{Number(service.base_price || 0).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor (Optional)</Label>
                  {loadingDoctors ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                      Loading doctors...
                    </div>
                  ) : (
                    <Select
                      value={selectedDoctorId || undefined}
                      onValueChange={(v) =>
                        setSelectedDoctorId(v === "__clear__" ? "" : v)
                      }
                    >
                      <SelectTrigger id="doctor">
                        <SelectValue placeholder="Select a doctor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDoctorId && (
                          <SelectItem value="__clear__" className="text-muted-foreground">
                            Clear selection
                          </SelectItem>
                        )}
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.first_name} {doctor.last_name}
                            {doctor.specialization && ` - ${doctor.specialization}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedService && (
                  <div className="space-y-2">
                    <Label htmlFor="sessions">Sessions *</Label>
                    <Select value={selectedSessions} onValueChange={setSelectedSessions} required>
                      <SelectTrigger id="sessions">
                        <SelectValue placeholder="Select number of sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionsOptions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s} {parseInt(s) === 1 ? "session" : "sessions"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSessions && totalPrice > 0 && (
                  <div className="md:col-span-2">
                    <div className="p-4 bg-muted rounded-md border">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">Total Amount:</span>
                        <span className="text-2xl font-bold">£{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Date & Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Booking Date & Time
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bookingDate">Date *</Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookingTime">Time *</Label>
                  <Select value={bookingTime} onValueChange={setBookingTime} required>
                    <SelectTrigger id="bookingTime">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerType">Customer Type *</Label>
                  <Select value={customerType} onValueChange={setCustomerType} required>
                    <SelectTrigger id="customerType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Customer</SelectItem>
                      <SelectItem value="returning">Returning Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Additional Details
              </h3>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Customer address (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes (optional)"
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !customerName ||
                  !customerEmail ||
                  !selectedServiceId ||
                  !bookingDate ||
                  !bookingTime
                }
              >
                {loading ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}