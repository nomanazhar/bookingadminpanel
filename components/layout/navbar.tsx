"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { DropdownMenu as LocationDropdownMenu, DropdownMenuTrigger as LocationDropdownMenuTrigger, DropdownMenuContent as LocationDropdownMenuContent, DropdownMenuItem as LocationDropdownMenuItem } from "@/components/ui/dropdown-menu"
import { MapPin } from "lucide-react"
// Helper to get all unique locations from categories in localStorage or fallback
function getAllLocations() {
  if (typeof window !== 'undefined') {
    const cats = localStorage.getItem('categories')
    if (cats) {
      try {
        const parsed = JSON.parse(cats)
        const locs = parsed.flatMap((cat: any) => cat.locations || [])
        return Array.from(new Set(locs)).filter(Boolean)
      } catch {}
    }
  }
  // Fallback demo locations
  return ["New York", "New Castle", "Stay Here"]
}
import { createClient } from "@/lib/supabase/client"
import { LogOut, User, Menu, LayoutDashboard, ShoppingBag } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Profile } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useLocation } from "../providers/location-provider"
import { LOCATIONS } from "../providers/locations"

interface NavbarProps {
  user: Profile | null
  title?: string
  action?: React.ReactNode
}

export function Navbar({ user, action }: NavbarProps) {
  const { location: selectedLocation, setLocation: setSelectedLocation } = useLocation();
  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // localUser mirrors the `user` prop so we can immediately hide user UI
  // on sign-out before the server component revalidates.
  const [localUser, setLocalUser] = useState<Profile | null>(user);

  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createClient()
    // Clear the client session first
    try { await supabase.auth.signOut() } catch {}

    // Also call the server-side signout endpoint so server cookies
    // (including ds_role) are cleared immediately and server components
    // will observe the signed-out state on refresh.
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' })
    } catch (e) {
      // non-blocking
    }
    // Immediately update local UI
    setLocalUser(null)

    toast({ title: "Signed out", description: "You have been signed out successfully" })
    // navigate and revalidate server components so parent server props update
    try {
      // replace current route to ensure server components re-run and then refresh
      const currentPath = (pathname ?? '/') + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      await router.replace(currentPath)
    } catch {}
    router.refresh()
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U"
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section - Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-52">
                <SheetHeader>
                  <SheetTitle>
                    <div 
                      className="px-4 py-2 rounded-lg inline-block"
                      style={{ backgroundColor: '#333333' }}
                    >
                      <Image
                        src="/logos/logo.webp"
                        alt="Derma Solution"
                        width={120}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                  <Link
                    href="/treatments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    Treatments
                  </Link>
                  {action && (
                    <div className="pt-4 border-t">
                      {action}
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo - Hidden on mobile when menu is available */}
            <Link href="/dashboard" className="hidden md:block">
              <div 
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: '#333333' }}
              >
                <Image
                  src="/logos/logo.webp"
                  alt="Derma Solution"
                  width={120}
                  height={40}
                  className="object-contain"
                />
              </div>
            </Link>

            {/* Desktop Action Button */}
            <div className="hidden lg:block">
              {action}
            </div>
          </div>

          {/* Center Section - Dashboard and Treatments links */}
          <div className="hidden md:flex flex-1 justify-center gap-2">
            <Link href="/" className="text-md font-semibold text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-full">
              Dashboard
            </Link>
            <Link href="/treatments" className="text-md font-semibold text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-full">
              Treatments
            </Link>
          </div>

          {/* Right Section - User Menu, Book Consultation & Theme */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Location Dropdown */}
            <LocationDropdownMenu>
              <LocationDropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <MapPin className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Select location</span>
                </Button>
              </LocationDropdownMenuTrigger>
              <LocationDropdownMenuContent align="end">
                {LOCATIONS.map((loc) => {
                  const isSelected = selectedLocation && loc.toLowerCase() === selectedLocation.toLowerCase();
                  return (
                    <LocationDropdownMenuItem
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      className={isSelected ? 'bg-[#42E0CF] text-white font-bold' : ''}
                    >
                      {loc}
                    </LocationDropdownMenuItem>
                  );
                })}
                <LocationDropdownMenuItem
                  key="stay-here"
                  onClick={() => setSelectedLocation(null)}
                  className={!selectedLocation ? 'bg-[#42E0CF] text-white font-bold' : ''}
                >
                  Stay here
                </LocationDropdownMenuItem>
              </LocationDropdownMenuContent>
            </LocationDropdownMenu>
            <ThemeToggle />
             

            {localUser && (
              <DropdownMenu >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 gap-2 px-2 "
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={localUser?.avatar_url} alt={localUser?.first_name} />
                      <AvatarFallback>
                        {getInitials(localUser?.first_name, localUser?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-100 px-2">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {localUser?.first_name} {localUser?.last_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {localUser?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span className="cursor-pointer">Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/book-consultation')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    <span className="cursor-pointer">My Bookings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/treatments')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    <span className="cursor-pointer">My Treatmens</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile-settings')}>
                    <User className="mr-2 h-4 w-4" />
                    <span className="cursor-pointer">Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="cursor-pointer">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Desktop-only actions: show Sign In + Book Consultation when not logged in */}
            {!localUser && (
              <div className="hidden lg:flex items-center gap-2">
                <Link href="/signin" className="text-black">
                  <Button variant="primary" size="default" >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" className="text-black">
                  <Button variant="primary" size="default">
                   Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
