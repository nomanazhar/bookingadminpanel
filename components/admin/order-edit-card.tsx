"use client";

import axios from "axios";
import React, { useState, useEffect } from "react";
import { parseBookingDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doctor } from "@/types/database";

interface Props {
  order: any; // ← improve to real Order type when possible
  onSaved?: (updatedOrder: any) => void;
}

export default function OrderEditCard({ order, onSaved }: Props) {
  // Form state
  const [customerName, setCustomerName] = useState(
    order?.customer_name ||
      `${order?.customer?.first_name || ""} ${order?.customer?.last_name || ""}`.trim() ||
      ""
  );
  const [customerEmail, setCustomerEmail] = useState(order?.customer_email || order?.customer?.email || "");
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone || "");
  const [address, setAddress] = useState(order?.address || "");
  const [serviceTitle, setServiceTitle] = useState(order?.service_title || "");
  const [sessionCount, setSessionCount] = useState(String(order?.session_count || 1));
  const [unitPrice, setUnitPrice] = useState(String(order?.unit_price || 0));
  const [discountPercent, setDiscountPercent] = useState(String(order?.discount_percent || 0));
  const [totalAmount, setTotalAmount] = useState(String(order?.total_amount || 0));
  const [status, setStatus] = useState(order?.status || "pending");
  const [bookingDate, setBookingDate] = useState(order?.booking_date || "");
  const [bookingTime, setBookingTime] = useState(order?.booking_time?.slice(0, 5) || "00:00");
  const [notes, setNotes] = useState(order?.notes || "");
  const [doctorId, setDoctorId] = useState(order?.doctor_id || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Fetch doctors
  useEffect(() => {
    axios
      .get("/api/doctors")
      .then(({ data }) => {
        if (Array.isArray(data)) setDoctors(data);
        setLoadingDoctors(false);
      })
      .catch(() => setLoadingDoctors(false));
  }, []);

  // Auto-calculate total
  useEffect(() => {
    const unit = parseFloat(unitPrice) || 0;
    const discount = parseFloat(discountPercent) || 0;
    const sessions = parseInt(sessionCount, 10) || 1;

    const discounted = unit * (1 - discount / 100);
    const total = discounted * sessions;

    setTotalAmount(total.toFixed(2));
  }, [unitPrice, discountPercent, sessionCount]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        customer_name: customerName.trim() || null,
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        address: address.trim() || null,
        service_title: serviceTitle.trim(),
        session_count: parseInt(sessionCount, 10) || 1,
        unit_price: parseFloat(unitPrice) || 0,
        discount_percent: parseFloat(discountPercent) || 0,
        total_amount: parseFloat(totalAmount) || 0,
        status,
        booking_date: bookingDate || null,
        booking_time: bookingTime ? `${bookingTime}:00` : null,
        notes: notes.trim() || null,
        doctor_id: doctorId || null,
      };

      const { data } = await axios.put(`/api/orders/${order.id}`, payload);

      if (data?.success === false) {
        throw new Error(data.error || "Update failed");
      }

      const updated = data?.data ?? data;
      onSaved?.(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data } = await axios.patch(`/api/orders/${order.id}`, { status: "cancelled" });

      if (data?.error) {
        throw new Error(data.error);
      }

      const updated = data?.data ?? data;
      onSaved?.(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to cancel booking");
    } finally {
      setSaving(false);
      setConfirmingCancel(false);
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-card shadow-sm">
      <div className="mb-2">
        <span className="inline-block bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          Edit Booking
        </span>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded border border-destructive/30">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-1">Customer</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="customerName">Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+92 ..."
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
              />
            </div>
          </div>
        </div>

        {/* Service & Booking */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-1">Service & Booking</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="serviceTitle">Service Title</Label>
              <Input
                id="serviceTitle"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sessionCount">Sessions</Label>
              <Input
                id="sessionCount"
                type="number"
                min={1}
                max={20}
                value={sessionCount}
                onChange={(e) => setSessionCount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bookingDate">Date</Label>
              <Input
                id="bookingDate"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bookingTime">Time</Label>
              <Input
                id="bookingTime"
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-1">Pricing</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="unitPrice">Unit Price (£)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total (£)</Label>
              <Input
                id="totalAmount"
                type="number"
                value={totalAmount}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto: Unit × (1 - Discount%) × Sessions
              </p>
            </div>
          </div>
        </div>

        {/* Status & Extras */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-1">Status & Notes</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Doctor (optional)</Label>
              {loadingDoctors ? (
                <div className="text-sm text-muted-foreground py-2">Loading doctors...</div>
              ) : (
                <Select
                  value={doctorId || undefined}
                  onValueChange={(val) => setDoctorId(val === "__clear__" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorId && (
                      <SelectItem value="__clear__" className="text-muted-foreground italic">
                        Clear doctor
                      </SelectItem>
                    )}
                    {doctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.first_name} {doc.last_name}
                        {doc.specialization && ` — ${doc.specialization}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, special requests..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-6 border-t">
        {!confirmingCancel ? (
          <>
            <Button variant="outline" onClick={() => setConfirmingCancel(true)}>
              Cancel Booking
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="destructive" onClick={handleCancel} disabled={saving}>
              {saving ? "Cancelling..." : "Confirm Cancel"}
            </Button>
            <Button variant="outline" onClick={() => setConfirmingCancel(false)} disabled={saving}>
              Back
            </Button>
          </>
        )}
      </div>
    </div>
  );
}