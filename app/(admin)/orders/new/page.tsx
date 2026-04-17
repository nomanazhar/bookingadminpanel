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
import { calculateSessionPricing, extractSessionCount, getSessionPackageLabels } from "@/lib/utils";

// Helper: convert 12h time (e.g., "10:15 am") to 24h (e.g., "10:15")
function time12hTo24h(time12h: string): string {
  const [time, ampm] = time12h.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// Helper: generate time slots based on duration
function generateTimeSlots(durationMinutes: number = 15): string[] {
  const slots: string[] = [];
  const interval = durationMinutes || 15;

  for (let min = 9 * 60; min <= 18 * 60 - interval; min += 15) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hour = h.toString().padStart(2, "0");
    const minute = m.toString().padStart(2, "0");
    slots.push(`${hour}:${minute}`);
  }

  return slots;
}

export default function CreateBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  // MULTI-SERVICE: Support both selectedServiceId (legacy) and selectedServiceIds (new)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    searchParams?.get("service_id") ? [searchParams.get("service_id")!] : []
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    searchParams?.get("doctor_id") || ""
  );
  const [selectedSessions, setSelectedSessions] = useState("1");
  const [bookingDate, setBookingDate] = useState(
    searchParams?.get("booking_date") || ""
  );
  const [bookingTime, setBookingTime] = useState(
    searchParams?.get("booking_time") || ""
  );
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [customerType, setCustomerType] = useState("new");
  // Admin pricing adjustments (direct numbers, not percentages). Use strings so inputs
  // can be empty while typing (prevents persistent leading zero behavior).
  const [extraAmount, setExtraAmount] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("");

  // User search (existing / returning customer)
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUserSearch, setLoadingUserSearch] = useState(false);
  const nameDropdownRef = useRef<HTMLDivElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const [activeSearchField, setActiveSearchField] = useState<"name" | "phone" | null>(null);
  // Debounced search value
  const debouncedUserSearch = useDebouncedValue(userSearch, 400);

  const duplicateOrderId = searchParams?.get("duplicate") || null;

  // Fetch available time slots when date + service(s) are selected
  useEffect(() => {
    if (!bookingDate || selectedServiceIds.length === 0) {
      setAvailableTimeSlots([]);
      return;
    }

    let ignore = false;

    const fetchAvailableTimes = async () => {
      try {
        setLoadingTimeSlots(true);

        // If doctor is selected, fetch filtered availability from API
        if (selectedDoctorId) {
          // Use first service for API call (for backward compat), but calculate total duration
          const serviceId = selectedServiceIds[0];
          const res = await fetch(
            `/api/available-timeslots?date=${bookingDate}&doctorId=${selectedDoctorId}&serviceId=${serviceId}`
          );
          if (!res.ok) throw new Error("Failed to fetch available times");
          const data = await res.json();

          if (!ignore) {
            // Convert 12h format to 24h format (e.g., "10:15 am" → "10:15")
            const slots24h = (data.slots || []).map((slot: string) => time12hTo24h(slot));
            setAvailableTimeSlots(slots24h);
          }
        } else {
          // If no doctor selected, generate all possible slots based on total duration of selected services
          const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
          const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 50), 0);
          const slots = generateTimeSlots(totalDuration);

          if (!ignore) {
            setAvailableTimeSlots(slots);
          }
        }
      } catch (err) {
        console.error("Failed to fetch time slots:", err);
        if (!ignore) {
          // Fallback: generate all slots based on total duration
          const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
          const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 50), 0);
          setAvailableTimeSlots(generateTimeSlots(totalDuration));
        }
      } finally {
        if (!ignore) {
          setLoadingTimeSlots(false);
        }
      }
    };

    fetchAvailableTimes();

    return () => {
      ignore = true;
    };
  }, [bookingDate, selectedServiceIds, selectedDoctorId, services]);

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
    setActiveSearchField(null);
    setUserResults([]);
  };

  // Handle Enter on name or phone input: if dropdown visible use first result,
  // otherwise perform an immediate search and populate if a match is found.
  const handleSearchKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    const query = (e.currentTarget.value || userSearch).trim();

    // If dropdown already has results, select the first one
    if (showUserDropdown && userResults.length > 0) {
      e.preventDefault();
      handleUserSelect(userResults[0]);
      return;
    }

    // Require at least 2 characters to perform a search
    if (query.length < 2) return;

    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
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
      const target = e.target as Node;
      const clickedOutsideName = nameDropdownRef.current && !nameDropdownRef.current.contains(target);
      const clickedOutsidePhone = phoneDropdownRef.current && !phoneDropdownRef.current.contains(target);

      // If both refs exist, only close when click is outside the active field's wrapper
      if (activeSearchField === "name") {
        if (nameDropdownRef.current && !nameDropdownRef.current.contains(target)) setShowUserDropdown(false);
      } else if (activeSearchField === "phone") {
        if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(target)) setShowUserDropdown(false);
      } else {
        // fallback: if click is outside both wrappers, close
        if (
          (nameDropdownRef.current && !nameDropdownRef.current.contains(target)) &&
          (phoneDropdownRef.current && !phoneDropdownRef.current.contains(target))
        ) {
          setShowUserDropdown(false);
        }
      }
    }

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showUserDropdown, activeSearchField]);

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
        // Support both legacy service_id and new service_ids
        const serviceIds = order.service_ids && order.service_ids.length > 0
          ? order.service_ids
          : (order.service_id ? [order.service_id] : []);
        setSelectedServiceIds(serviceIds);
        setSelectedDoctorId(order.doctor_id || "");
        setSelectedSessions(String(order.session_count || 1));
        setBookingDate(order.booking_date || "");
        setBookingTime(order.booking_time?.slice(0, 5) || "");
        setNotes(order.notes || "");
        // Prefill admin adjustments if present (use empty string when zero/undefined to keep inputs empty)
        setExtraAmount(order.extra_amount != null ? String(order.extra_amount) : "");
        setDiscountAmount(order.discount_amount != null ? String(order.discount_amount) : "");
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

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));

  // For session packages: use the first service for now (can be extended for multi-service packages)
  const primaryService = selectedServices.length > 0 ? selectedServices[0] : undefined;
  const sessionPackageLabels = getSessionPackageLabels(primaryService?.session_options);
  const sessionsOptions = Array.from(
    new Set(sessionPackageLabels.map((label) => String(extractSessionCount(label))))
  ).sort((a, b) => Number(a) - Number(b));

  // Reset sessions if service changes and current value is invalid
  useEffect(() => {
    if (selectedServiceIds.length === 0) return;
    if (!sessionsOptions.includes(selectedSessions)) {
      setSelectedSessions(sessionsOptions[0] || "1");
    }
  }, [selectedServiceIds, selectedSessions, sessionsOptions]);

  useEffect(() => {
    if (!bookingTime) return;
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(bookingTime)) {
      setBookingTime("");
    }
  }, [availableTimeSlots, bookingTime]);

  const calculatePrice = () => {
    if (selectedServices.length === 0) return 0;

    // Calculate aggregate price for all selected services
    let totalPrice = 0;
    selectedServices.forEach(service => {
      const base = Number(service.base_price ?? 0);
      const pricing = calculateSessionPricing(base, service.session_options, selectedSessions);
      totalPrice += pricing.totalAmount;
    });

    return totalPrice;
  };

  const totalPrice = calculatePrice();
  const parsedExtra = parseFloat(extraAmount || "0") || 0;
  const parsedDiscount = parseFloat(discountAmount || "0") || 0;
  const adjustedTotal = Math.max(0, totalPrice + parsedExtra - parsedDiscount);

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

    if (selectedServiceIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one service",
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
      // Calculate aggregate pricing for all selected services
      let totalUnitPrice = 0;
      let totalDiscount = 0;
      let aggregateDiscount = 0;

      selectedServices.forEach(service => {
        const basePrice = Number(service.base_price ?? 0);
        const pricing = calculateSessionPricing(basePrice, service.session_options, selectedSessions);
        totalUnitPrice += pricing.unitPrice;
        totalDiscount += (pricing.unitPrice * pricing.discountPercent) / 100;
        aggregateDiscount = Math.max(aggregateDiscount, pricing.discountPercent);
      });

      const totalAmount = totalUnitPrice - (totalUnitPrice * aggregateDiscount / 100);
      const finalAmount = Math.max(0, totalAmount + Number(extraAmount || 0) - Number(discountAmount || 0));
      const primaryServiceName = selectedServices.map(s => s.name).join(" + ");

      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        service_ids: selectedServiceIds, // Send multiple service IDs
        doctor_id: selectedDoctorId || null,
        service_title: primaryServiceName,
        sessions: parseInt(selectedSessions, 10),
        unit_price: totalUnitPrice,
        discount_percent: aggregateDiscount,
        extra_amount: Number(extraAmount || 0),
        discount_amount: Number(discountAmount || 0),
        total_amount: finalAmount,
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
    <div className="px-6 py-4 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="primary" size="icon" className="h-6 w-10 ">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold font-heading ">Create New Booking</h2>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardDescription>Fill in the details to create a new booking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Customer Details
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                {/* Full Name - spans 2 columns because of dropdown/search */}
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="customerName">Full Name</Label>
                  <div className="relative" ref={nameDropdownRef}>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setUserSearch(e.target.value);
                        setActiveSearchField("name");
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => {
                        setActiveSearchField("name");
                        setShowUserDropdown(true);
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Enter customer full name"
                      required
                      className="w-full"
                      autoComplete="off"
                    />

                    {showUserDropdown && activeSearchField === "name" &&
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

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                </div>

                {/* Phone - moves to next row on mobile, but in row 2 on md+ */}
                <div className="space-y-2 md:col-start-3">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <div className="relative" ref={phoneDropdownRef}>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setUserSearch(e.target.value);
                        setActiveSearchField("phone");
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => {
                        setActiveSearchField("phone");
                        setShowUserDropdown(true);
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="+44 123 456 7890"
                    />

                    {showUserDropdown && activeSearchField === "phone" &&
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
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Service Details
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                {/* Services - Multi-select */}
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <Label>Services <span className="text-destructive italic text-xs">(Select one or more)</span> </Label>
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                      Loading services...
                    </div>
                  ) : (
                    <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto bg-background">
                      {services.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No services available</div>
                      ) : (
                        services.map((service) => (
                          <label
                            key={service.id}
                            className="flex items-start gap-3 p-2 hover:bg-muted rounded cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedServiceIds.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServiceIds([...selectedServiceIds, service.id]);
                                } else {
                                  setSelectedServiceIds(
                                    selectedServiceIds.filter((id) => id !== service.id)
                                  );
                                }
                              }}
                              className="mt-1 w-4 h-4 rounded border-input"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{service.name}</div>
                              <div className="text-xs text-muted-foreground">
                                £{Number(service.base_price || 0).toFixed(2)}
                                {service.duration_minutes && ` • ${service.duration_minutes} min`}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {selectedServiceIds.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedServiceIds.length} service{selectedServiceIds.length !== 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>

                <div>
                  {/* Doctor (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor</Label>
                    {loadingDoctors ? (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border rounded-md">
                        Loading Therapists...
                      </div>
                    ) : (
                      <Select
                        value={selectedDoctorId || undefined}
                        onValueChange={(v) => setSelectedDoctorId(v === "__clear__" ? "" : v)}
                      >
                        <SelectTrigger id="doctor">
                          <SelectValue placeholder="Select a Therapist (optional)" />
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

                  {/* Sessions */}
                  {selectedServices.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="sessions">Sessions </Label>
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

                <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="bookingDate">Date</Label>
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
                    <Label htmlFor="bookingTime">Time </Label>
                    {!bookingDate ? (
                      <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                        Select a date first
                      </div>
                    ) : selectedServiceIds.length === 0 ? (
                      <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                        Select service(s) first
                      </div>
                    ) : loadingTimeSlots ? (
                      <div className="flex items-center justify-center py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                        Loading available times...
                      </div>
                    ) : availableTimeSlots.length === 0 ? (
                      <div className="flex items-center justify-center py-2 text-sm text-destructive border rounded-md bg-muted">
                        No available times for this date{selectedDoctorId ? " and therapist" : ""}
                      </div>
                    ) : (
                      <Select value={bookingTime} onValueChange={setBookingTime} required>
                        <SelectTrigger id="bookingTime">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                
                {/* Total Amount - full width */}
                {selectedSessions && selectedServices.length > 0 && totalPrice >= 0 && (
                  <div className="md:col-span-3">
                    <div className="p-4 bg-muted rounded-md border">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium">Selected Services:</span>
                        </div>

                        <div className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-4">
                            <span className="text-sm">{selectedServices.map(s => s.name).join(", ")}</span>
                          </div>

                          <div className="flex gap-8 items-center">
                            <div className="flex items-center gap-2">
                              <label className="text-sm">Extra</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={extraAmount}
                                onChange={(e) => setExtraAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                                placeholder="0"
                                className="w-24 rounded-md border px-2 py-1 text-sm"
                                aria-label="Extra amount"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-sm">Discount</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                                placeholder="0"
                                className="w-24 rounded-md border px-2 py-1 text-sm"
                                aria-label="Discount amount"
                              />
                            </div>

                            <div className="text-sm font-medium">Total Amount:</div>
                            <div className="text-2xl font-bold">{adjustedTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Actions */}
            <div className="flex justify-end gap-4  ">
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
                  selectedServiceIds.length === 0 ||
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