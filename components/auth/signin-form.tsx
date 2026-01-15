"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function SignInForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const pre = localStorage.getItem('prefillEmail')
      if (pre) {
        // intentionally do not auto-fill; leave for manual entry
        localStorage.removeItem('prefillEmail')
      }
    } catch {}
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form inputs
    if (!formData.email || !formData.email.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please enter your email address" })
      return
    }
    
    if (!formData.password || !formData.password.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please enter your password" })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please enter a valid email address" })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      // Log the request for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.debug('Attempting sign in for:', formData.email.trim())
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })
      
      // Log response for debugging
      if (process.env.NODE_ENV === 'development') {
        console.debug('Sign in response:', { 
          success: !error, 
          hasUser: !!data?.user, 
          error: error ? {
            message: error.message,
            status: (error as any).status,
            name: error.name,
          } : null 
        })
      }

      if (error) {
        console.error('Sign in error:', error)
        
        // Extract error message and status
        const errorMessage = error.message || String(error)
        const errorStatus = (error as any).status || (error as any).statusCode
        
        // Handle specific error cases
        if (errorStatus === 400 || errorMessage.toLowerCase().includes('invalid_grant')) {
          // Invalid credentials or email not confirmed
          if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('confirm')) {
            toast({ 
              variant: 'destructive', 
              title: 'Email Not Confirmed', 
              description: 'Please check your inbox and confirm your email address before signing in.' 
            })
          } else if (errorMessage.toLowerCase().includes('invalid login')) {
            toast({ 
              variant: 'destructive', 
              title: 'Invalid Credentials', 
              description: 'The email or password you entered is incorrect. Please try again.' 
            })
          } else {
            toast({ 
              variant: 'destructive', 
              title: 'Sign In Failed', 
              description: errorMessage || 'Invalid email or password. If you just signed up, please confirm your email first.' 
            })
          }
        } else if (errorStatus === 429) {
          // Rate limiting
          toast({ 
            variant: 'destructive', 
            title: 'Too Many Attempts', 
            description: 'Please wait a moment before trying again.' 
          })
        } else {
          // Generic error
          toast({ 
            variant: "destructive", 
            title: "Sign In Error", 
            description: errorMessage || 'An unexpected error occurred. Please try again.' 
          })
        }
        return
      }

      if (!data?.user) {
        toast({ variant: "destructive", title: "Error", description: "Sign in failed. Please try again." })
        return
      }

      // Wait a moment for session to be fully established and cookies to be set
      await new Promise(resolve => setTimeout(resolve, 200))

      // Get user role from profile
      // Default to 'customer' role if profile fetch fails or doesn't exist
      let userRole: string = 'customer'
      
      try {
        // Refresh the session to ensure cookies are properly set
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (sessionData?.session) {
          const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
            .maybeSingle()

          if (!profileError && profileData) {
            userRole = profileData.role || 'customer'
          } else {
            // Profile doesn't exist - this can happen for users created before the trigger
            // The trigger should create profiles, but if it failed, use default role
            console.warn('Profile not found for user:', data.user.id, profileError)
            // Note: Profile creation should be handled by the database trigger or admin
            // Client-side profile creation will fail due to RLS policies
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        // Continue with default customer role
      }

      toast({
        title: "Success",
        description: "Signed in successfully!",
      })

      // Resume pending booking if the booking flow saved a `pendingBooking` item.
      // Do not send admins to the booking flow.
      const hasPending = typeof window !== 'undefined' && localStorage.getItem('pendingBooking')
      if (hasPending && userRole !== 'admin') {
        try { localStorage.removeItem('prefillEmail') } catch {}
        router.push('/confirm-booking')
        router.refresh()
        return
      }

      // Redirect based on role
      if (userRole === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="info@gmail.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={formData.rememberMe}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, rememberMe: checked as boolean })
            }
          />
          <label
            htmlFor="remember"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Keep me logged in
          </label>
        </div>

        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? "Signing in..." : "Sign In"}
      </Button>
      </form>
  )
}

