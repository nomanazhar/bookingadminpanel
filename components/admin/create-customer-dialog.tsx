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
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
// role is fixed to 'customer' for this dialog; keep Select for gender only
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'

import type { Profile } from '@/types'

interface CreateCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // callback after create OR edit
  onSaved?: () => void
  // when editing, pass initial data and user id
  initialData?: Partial<Profile> | null
  mode?: 'create' | 'edit'
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onSaved,
  initialData = null,
  mode = 'create',
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
    role: '' as '' | 'customer' | 'admin' | 'doctor',
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
      role: '',
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
      if (mode === 'edit' && initialData) {
        setFormData((prev) => ({
          ...prev,
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          email: initialData.email || '',
          // do not prefill password
          password: '',
          phone: (initialData.phone as string) || '',
          gender: (initialData.gender as string) || '',
          address: (initialData.address as string) || '',
          // preserve existing role when editing; do not overwrite here
          role: (initialData.role as any) || '',
        }))
      } else {
        resetForm()
      }
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

    // For edit mode, password is optional. For create, require password.
    if (mode === 'create') {
      if (!formData.password) {
        return 'Password is required'
      }
      if (formData.password.length < 6) {
        return 'Password must be at least 6 characters'
      }
    } else {
      if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
        return 'Password must be at least 6 characters'
      }
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
      if (mode === 'edit' && initialData?.id) {
        const payload: any = {
          email: formData.email.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim() || null,
          gender: formData.gender || null,
          address: formData.address.trim() || null,
          // do not include role on update unless explicitly changed
        }
        // Note: password changes are not handled by the profiles PUT endpoint.
        // If you need to change the auth password, implement a dedicated
        // admin endpoint. For now, update profile fields only.
        await axios.put(`/api/admin/users/${initialData.id}`, payload)
        } else {
        await axios.post('/api/admin/users', {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim() || null,
          gender: formData.gender || null,
          address: formData.address.trim() || null,
            role: 'customer',
        })
      }

      toast({
        title: 'Success',
        description: mode === 'edit'
          ? `User ${formData.first_name} ${formData.last_name} updated successfully`
          : `Customer ${formData.first_name} ${formData.last_name} created successfully`,
      })

      // Call refresh callback before closing dialog
      if (onSaved) {
        await onSaved()
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

  const headerTitle = mode === 'edit' ? 'Edit User' : 'Create New Customer'
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Customer'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto bg-white p-0">
          <div className="bg-white p-4 space-y-2 min-h-screen">
            <SheetHeader>
              <SheetTitle className="text-3xl font-bold font-heading mb-2">{headerTitle}</SheetTitle>
              <SheetDescription>
                {mode === 'edit' ? 'Update the user profile details' : 'Fill in the details for this new customer'}
              </SheetDescription>
            </SheetHeader>

          <Card>
            <CardHeader>
             
              <CardDescription>Fill in the details for this new customer</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      onValueChange={(value: string) =>
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
                      placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Enter secure password'}
                      disabled={loading || isSubmitting}
                      required={mode === 'create'}
                      autoComplete={mode === 'create' ? 'new-password' : 'new-password'}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters required</p>
                  </div>
                </div>
              </div>

              {/* Role is fixed to customer for this dialog; no UI control shown */}

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
                  {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : submitLabel}
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
