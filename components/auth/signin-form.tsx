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
  
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')
  const [phone, setPhone] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpRateLimit, setOtpRateLimit] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const pre = localStorage.getItem('prefillEmail')
      if (pre) {
        localStorage.removeItem('prefillEmail')
      }
    } catch {}
  }, [])

  const validatePhone = (phone: string): boolean => {
    const e164Regex = /^\+[1-9]\d{9,14}$/
    return e164Regex.test(phone)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const email = formData.email.trim()
    const password = formData.password.trim()

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter both email and password",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
         
          title: "Sign In Failed",
          description: error.message,
        })
        return
      }

      if (data.user) {
        toast({
          title: "Success",
          description: "Signed in successfully!",
        })

        // Fetch profile to check role
        let userRole = 'customer';
        try {
          const supabaseProfile = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          userRole = supabaseProfile?.data?.role || 'customer';
        } catch {}

        // Check for pending booking
        let hasPending = false;
        try {
          hasPending = typeof window !== 'undefined' && !!localStorage.getItem('pendingBooking');
        } catch {}

        if (hasPending) {
          router.push('/confirm-booking');
        } else if (userRole === 'admin') {
          router.push('/admin-dashboard');
        } else {
          router.push('/');
        }
        router.refresh();
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "Something went wrong during sign in",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    setOtpError("")
    
    if (otpRateLimit) {
      setOtpError("Too many attempts. Please wait before retrying.")
      return
    }

    const phoneNumber = phone.trim()
    
    if (!validatePhone(phoneNumber)) {
      setOtpError("Please enter a valid phone number in E.164 format (e.g. +923001234567)")
      return
    }

    setOtpLoading(true)
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber })
      
      if (error) {
        if (error.status === 429) {
          setOtpRateLimit(true)
          setTimeout(() => setOtpRateLimit(false), 60000)
          setOtpError("Too many attempts. Please wait a minute before retrying.")
        } else {
          setOtpError(error.message || "Failed to send OTP. Please try again.")
        }
        setOtpSent(false)
      } else {
        setOtpSent(true)
        setOtpError("")
        toast({ 
          title: "OTP Sent", 
          description: "Check your phone for the verification code." 
        })
      }
    } catch (err) {
      setOtpError("Unexpected error. Please try again.")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError("")
    const phoneNumber = phone.trim()

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.")
      return
    }

    setOtpLoading(true)
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({ 
        phone: phoneNumber, 
        token: otp, 
        type: "sms" 
      })
      
      if (error) {
        setOtpError(error.message || "Invalid OTP. Please try again.")
        return
      }
      
      if (!data?.user) {
        setOtpError("Verification failed. Please try again.")
        return
      }

      toast({ 
        title: "Success", 
        description: "Signed in successfully!" 
      })
      
      // Check for pending booking
      let hasPending = false
      try {
        hasPending = typeof window !== 'undefined' && !!localStorage.getItem('pendingBooking')
      } catch {}

      if (hasPending) {
        router.push('/confirm-booking');
      } else {
        // Fetch profile to check role
        let userRole = 'customer';
        try {
          const supabaseProfile = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          userRole = supabaseProfile?.data?.role || 'customer';
        } catch {}
        if (userRole === 'admin') {
          router.push('/admin-dashboard');
        } else {
          router.push('/');
        }
      }
      router.refresh();
    } catch (err) {
      setOtpError("Unexpected error. Please try again.")
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Login method selector */}
      <div className="flex space-x-2 mb-4">
        <Button 
          type="button" 
          variant={loginMethod === 'email' ? 'default' : 'outline'} 
          onClick={() => {
            setLoginMethod('email')
            setOtpSent(false)
            setOtp("")
            setOtpError("")
          }} 
          disabled={loading || otpLoading}
          className="flex-1"
        >
          Email
        </Button>
        <Button 
          type="button" 
          variant={loginMethod === 'phone' ? 'default' : 'outline'} 
          onClick={() => {
            setLoginMethod('phone')
            setOtpSent(false)
            setOtp("")
            setOtpError("")
          }} 
          disabled={loading || otpLoading}
          className="flex-1"
        >
          Phone
        </Button>
      </div>

      {/* Email/Password Login */}
      {loginMethod === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => setFormData({ ...formData, rememberMe: checked as boolean })}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Keep me logged in
              </label>
            </div>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      )}

      {/* Phone OTP Login */}
      {loginMethod === 'phone' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (E.164 format) *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+923001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={otpLoading || otpRateLimit || otpSent}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +92 for Pakistan)
            </p>
          </div>

          {!otpSent ? (
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleSendOtp} 
              disabled={otpLoading || otpRateLimit}
              size="lg"
            >
              {otpLoading ? "Sending OTP..." : "Send OTP"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-Digit Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={otpLoading}
                />
              </div>
              <Button 
                type="button" 
                className="w-full" 
                onClick={handleVerifyOtp} 
                disabled={otpLoading}
                size="lg"
              >
                {otpLoading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="w-full" 
                onClick={() => {
                  setOtpSent(false)
                  setOtp("")
                  setOtpError("")
                }}
                disabled={otpLoading}
              >
                Resend OTP
              </Button>
            </div>
          )}

          {otpError && (
            <div className="text-destructive text-sm mt-2 p-3 bg-destructive/10 rounded-md">
              {otpError}
            </div>
          )}
        </div>
      )}

      {/* Sign up link */}
      {/* <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link href="/sign-up" className="text-primary font-medium hover:underline">
          Sign Up
        </Link>
      </div> */}
    </div>
  )
}