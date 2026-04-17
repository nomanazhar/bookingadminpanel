import { Button } from "@/components/ui/button"
import { SignUpForm } from "@/components/auth/signup-form"
import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Sign Up | Derma Solution",
  description: "Create a new account",
}

export default function SignUpPage() {
  return (
    <div className="min-h-[93vh] flex" style={{ width: '100%' }}>
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-2">
          <div className="space-y-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 mb-4">
            <Button variant="primary" className="h-6 w-8 p-0">
              ←
              </Button>
               Back to dashboard
            </Link>

            <h1 className="text-3xl font-bold font-heading">Sign Up</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and password to sign up!
            </p>
          </div>

          <SignUpForm />

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-[#333333] items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <div className="flex justify-center">
            <Image
              src="/logos/logo.webp"
              alt="Derma Solution Logo"
              width={250}
              height={250}
              className="object-contain"
            />
          </div>
          <p className="text-lg text-white/80 leading-relaxed">
            Book appointments for professional aesthetic treatments and skin care services
          </p>
        </div>
      </div>
    </div>
  )
}
