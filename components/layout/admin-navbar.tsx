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
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { LogOut, User, Settings, Menu, LayoutDashboard, Package, FolderTree, ShoppingCart, MessageSquare, Stethoscope } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Profile } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

interface AdminNavbarProps {
  user: Profile | null
}

export function AdminNavbar({ user }: AdminNavbarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    try { await supabase.auth.signOut() } catch {}
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' })
    } catch {}
    toast({ title: "Signed out", description: "You have been signed out successfully" })
    router.push('/')
    router.refresh()
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U"
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/services", icon: Package, label: "Services" },
    { href: "/categories", icon: FolderTree, label: "Categories" },
    { href: "/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/doctors", icon: Stethoscope, label: "Doctors" },
    { href: "/reviews", icon: MessageSquare, label: "Reviews" },
  ]

  return (
    <nav className=" sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-16 items-center justify-between px-4">
        {/* Mobile Hamburger Menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center border-b px-6">
                  <div
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#333333' }}
                  >
                    <Image
                      src="/logos/logo.webp"
                      alt="Logo"
                      width={120}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Footer */}
                <div className="border-t p-4">
                  <p className="text-xs text-muted-foreground">
                    © 2024 Admin Panel
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Centered Logo (Mobile) */}
        <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
          <div
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#333333' }}
          >
            <Image
              src="/logos/logo.webp"
              alt="Logo"
              width={100}
              height={32}
              className="object-contain"
            />
          </div>
        </div>

        {/* Desktop - Empty space or title */}
        <div className="hidden md:block">
          {/* Can add page title here if needed */}
        </div>

        {/* Right Section - Theme Toggle + User Menu */}
        <div className="flex items-center gap-3 ml-auto">
          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 gap-2 px-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={user.first_name} />
                    <AvatarFallback>
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
              
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-100 px-2">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="cursor-pointer">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}

