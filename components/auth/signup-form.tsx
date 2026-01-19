"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function SignUpForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    agreeToTerms: false,
  })
  
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpRateLimit, setOtpRateLimit] = useState(false)

  const validatePhone = (phone: string): boolean => {
    // E.164 format: +[country code][number], total 10-15 digits after +
    const e164Regex = /^\+[1-9]\d{9,14}$/
    return e164Regex.test(phone)
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const email = formData.email.trim()
    const password = formData.password.trim()
    const phone = formData.phone.trim()

    if (!firstName || !lastName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "First name and last name are required",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      })
      return
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters",
      })
      return
    }

    if (!formData.agreeToTerms) {
      toast({
        variant: "destructive",
        title: "Terms Required",
        description: "Please agree to the Terms and Conditions",
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const payload = {
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role: 'customer',
          },
        },
      }

      const { data, error } = await supabase.auth.signUp(payload)

      if (error) {
        toast({ 
          variant: "destructive", 
          title: "Signup Failed", 
          description: error.message 
        })
        return
      }

      if (data.user) {
        toast({ 
          title: "Success", 
          description: "Account created! Please check your email to verify your account." 
        })
        
        // Check for pending booking
        let hasPending = false
        try {
          hasPending = typeof window !== 'undefined' && !!localStorage.getItem('pendingBooking')
        } catch {}

        if (hasPending) {
          try { localStorage.removeItem('prefillEmail') } catch {}
          router.push('/confirm-booking')
        } else {
          router.push('/dashboard')
        }
        router.refresh()
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "Something went wrong during signup",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    setOtpError("")
    
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const phone = formData.phone.trim()

    if (!firstName || !lastName) {
      setOtpError("First name and last name are required")
      return
    }

    if (!validatePhone(phone)) {
      setOtpError("Please enter a valid phone number in E.164 format (e.g. +923201234567)")
      return
    }

    if (!formData.agreeToTerms) {
      setOtpError("Please agree to the Terms and Conditions")
      return
    }

    if (otpRateLimit) {
      setOtpError("Too many attempts. Please wait before retrying.")
      return
    }

    setOtpLoading(true)
    const supabase = createClient()
    
    try {
      console.log("Sending OTP to:", phone)
      
      const { error } = await supabase.auth.signInWithOtp({ 
        phone,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'customer',
          }
        }
      })
      
      if (error) {
        console.error("OTP send error:", error)
        if (error.status === 429) {
          setOtpRateLimit(true)
          setTimeout(() => setOtpRateLimit(false), 60000)
          setOtpError("Too many attempts. Please wait a minute before retrying.")
        } else {
          setOtpError(error.message || "Failed to send OTP. Please try again.")
        }
        setOtpSent(false)
      } else {
        console.log("OTP sent successfully")
        setOtpSent(true)
        setOtpError("")
        toast({ 
          title: "OTP Sent", 
          description: "Check your phone for the verification code." 
        })
      }
    } catch (err: any) {
      console.error("Unexpected OTP error:", err)
      setOtpError(err?.message || "Unexpected error. Please try again.")
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError("")
    const phone = formData.phone.trim()
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const email = formData.email.trim() || undefined

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.")
      return
    }

    setOtpLoading(true)
    const supabase = createClient()
    
    try {
      console.log("Verifying OTP for:", phone)
      
      const { data, error } = await supabase.auth.verifyOtp({ 
        phone, 
        token: otp, 
        type: "sms" 
      })
      
      if (error) {
        console.error("OTP verification error:", error)
        setOtpError(error.message || "Invalid OTP. Please try again.")
        return
      }
      
      if (!data?.user) {
        console.error("No user returned after verification")
        setOtpError("Verification failed. Please try again.")
        return
      }

      console.log("User verified successfully:", data.user.id)

      // Update user metadata after successful verification
      try {
        const { error: updateError } = await supabase.auth.updateUser({ 
          data: { 
            first_name: firstName, 
            last_name: lastName, 
            email: email || null,
            phone,
            role: 'customer'
          } 
        })
        
        if (updateError) {
          console.warn("Profile update warning:", updateError.message)
        } else {
          console.log("User metadata updated successfully")
        }
      } catch (metaErr: any) {
        console.warn("Metadata update failed:", metaErr?.message)
      }

      toast({ 
        title: "Success", 
        description: "Account created successfully!" 
      })
      
      try { localStorage.removeItem('prefillEmail') } catch {}
      
      // Check for pending booking
      let hasPending = false
      try {
        hasPending = typeof window !== 'undefined' && !!localStorage.getItem('pendingBooking')
      } catch {}

      if (hasPending) {
        router.push('/confirm-booking')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err: any) {
      console.error("Unexpected verification error:", err)
      setOtpError(err?.message || "Unexpected error. Please try again.")
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <form onSubmit={handleEmailSignup} className="space-y-6">
      {/* Signup method selector */}
      <div className="flex space-x-2 mb-4">
        <Button 
          type="button" 
          variant={signupMethod === 'email' ? 'default' : 'outline'} 
          onClick={() => {
            setSignupMethod('email')
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
          variant={signupMethod === 'phone' ? 'default' : 'outline'} 
          onClick={() => {
            setSignupMethod('phone')
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

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            disabled={loading || otpLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            disabled={loading || otpLoading}
          />
        </div>
      </div>

      {/* Email signup fields */}
      {signupMethod === 'email' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
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
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+923001234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
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
        </>
      )}

      {/* Phone signup fields */}
      {signupMethod === 'phone' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone-signup">Phone (E.164 format) *</Label>
            <Input
              id="phone-signup"
              type="tel"
              placeholder="+923001234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={otpLoading || otpSent}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +92 for Pakistan)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-optional">Email (Optional)</Label>
            <Input
              id="email-optional"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={otpLoading}
            />
          </div>

          {!otpSent ? (
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleSendOtp} 
              disabled={otpLoading || otpRateLimit}
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
              >
                {otpLoading ? "Verifying..." : "Verify & Sign Up"}
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

      {/* Terms agreement */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={formData.agreeToTerms}
          onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
          disabled={loading || otpLoading}
        />
        <label htmlFor="terms" className="text-sm leading-relaxed">
          I agree to the{" "}
          <Link href="/terms" className="text-primary underline">
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
        </label>
      </div>

      {/* Submit button (only for email signup) */}
      {signupMethod === 'email' && (
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      )}

      {/* Sign in link */}
      {/* <div className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          Sign In
        </Link>
      </div> */}
    </form>
  )
}