import { SignInForm } from "@/components/auth/signin-form"
import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Sign In | Derma Solution",
  description: "Sign in to your account",
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex" style={{ width: '100%' }}>
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 mb-8">
              ← Back to signup
            </Link>

            <h1 className="text-4xl font-bold font-heading">Sign In</h1>
            <p className="text-muted-foreground">
              Enter your email and password to sign in!
            </p>
          </div>

          <SignInForm />

          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-[#333333] items-center justify-center p-8">
        <div className="max-w-md space-y-8 text-center">
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
