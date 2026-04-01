"use client"

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'

interface CreateCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated?: () => void
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCustomerCreated,
}: CreateCustomerDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
    address: '',
    role: 'customer' as 'customer' | 'admin' | 'doctor',
  })

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      gender: '',
      address: '',
      role: 'customer',
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.first_name.trim()) {
      return 'First name is required'
    }
    if (!formData.last_name.trim()) {
      return 'Last name is required'
    }
    if (!formData.email.trim()) {
      return 'Email is required'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address'
    }

    if (!formData.password) {
      return 'Password is required'
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent duplicate submissions
    if (isSubmitting || loading) {
      return
    }

    const validationError = validateForm()
    if (validationError) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validationError,
      })
      return
    }

    setIsSubmitting(true)
    setLoading(true)

    try {
      await axios.post('/api/admin/users', {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        address: formData.address.trim() || null,
        role: formData.role,
      })

      toast({
        title: 'Success',
        description: `Customer ${formData.first_name} ${formData.last_name} created successfully`,
      })

      // Call refresh callback before closing dialog
      if (onCustomerCreated) {
        await onCustomerCreated()
      }

      resetForm()
      handleOpenChange(false)
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Failed to create customer'

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-white p-0">
        <div className="bg-white p-6 space-y-6 min-h-screen">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold font-heading mb-2">Create New Customer</h1>
            </div>
          </div>

          <Card>
            <CardHeader>
             
              <CardDescription>Fill in the details for this new customer</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Personal Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="First name"
                      disabled={loading || isSubmitting}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      disabled={loading || isSubmitting}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="user@example.com"
                      disabled={loading}
                      required
                      autoComplete="off"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone"
                      disabled={loading || isSubmitting}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender || "not_specified"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          gender: value === "not_specified" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger id="gender" className="w-full bg-white" disabled={loading || isSubmitting}>
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="not_specified">Not specified</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Address"
                      disabled={loading || isSubmitting}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Account Setup Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Account Setup</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter secure password"
                      disabled={loading || isSubmitting}
                      required
                      autoComplete="new-password"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters required</p>
                  </div>
                </div>
              </div>

              {/* Role Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Role</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">User Role</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value: string) => {
                        if (value === 'customer' || value === 'doctor' ) {
                          setFormData((prev) => ({ ...prev, role: value }))
                        }
                      }}
                    >
                      <SelectTrigger id="role" className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[100]">
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="doctor">Therapist</SelectItem>
                     
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading || isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || isSubmitting || !formData.email}>
                  {loading ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </form>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
