"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderTree,
  Sparkles,
  ShoppingCart,
  Mail,
  Users,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Doctor } from "@/types"

const sidebarLinks = [
  {
    title: "Dashboard",
    href: "/admin-dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
  },
  {
    title: "Treatments",
    href: "/admin-services",
    icon: Sparkles,
  },
  {
    title: "Doctors",
    href: "/doctors",
    icon: Stethoscope,
  },
  {
    title: "SearchBooking",
    href: "/searchbooking",
    icon: ShoppingCart, // or another icon if preferred
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
  },
]

function SidebarContent({ onLinkClick, isCollapsed }: { onLinkClick?: () => void, isCollapsed?: boolean }) {
  const pathname = usePathname()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [bookingsOpen, setBookingsOpen] = useState(false)

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch("/api/doctors")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setDoctors(data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch doctors:", error)
      }
    }
    fetchDoctors()
  }, [])

  // Check if current path is a bookings-related path
  const isBookingsActive = pathname?.startsWith("/admin-dashboard/orders")

  return (
    <>
      <div className={cn(
        "flex h-16 items-center justify-center border-b transition-all",
        isCollapsed ? "px-2" : "px-6"
      )}>
        <Link href="/admin-dashboard" onClick={onLinkClick}>
          <div
            className={cn(
              "rounded-lg transition-all",
              isCollapsed ? "p-2" : "px-4 py-2"
            )}
            style={{ backgroundColor: '#333333' }}
          >
            <Image
              src={isCollapsed ? "/logos/favicon.webp" : "/logos/logo.webp"}
              alt="Derma Solution"
              width={isCollapsed ? 40 : 120}
              height={isCollapsed ? 40 : 120}
              className="object-contain transition-all"
            />
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4 ">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              title={isCollapsed ? link.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#42E0CF] text-white shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center"
              )}
              style={isActive ? { backgroundColor: '#42E0CF', color: '#fff', borderRadius: '24px' } : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{link.title}</span>}
            </Link>
          )
        })}

        {/* Bookings Dropdown */}
        {!isCollapsed ? (
          <DropdownMenu open={bookingsOpen} onOpenChange={setBookingsOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isBookingsActive
                    ? "bg-[#42E0CF] text-white shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                style={isBookingsActive ? { backgroundColor: '#42E0CF', color: '#fff', borderRadius: '24px' } : undefined}
                title="Bookings"
              >
                <ShoppingCart className="h-5 w-5 flex-shrink-0" />
                <span>Bookings</span>
                <ChevronDown className={cn(
                  "h-4 w-4 ml-auto transition-transform",
                  bookingsOpen && "rotate-180"
                )} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 ml-2">
              <DropdownMenuItem asChild>
                <Link href="/orders" onClick={onLinkClick}>
                  All Bookings
                </Link>
              </DropdownMenuItem>
              {doctors.length > 0 && (
                <>
                  <DropdownMenuItem disabled className="opacity-70 text-xs">
                    By Doctor:
                  </DropdownMenuItem>
                  {doctors.map((doctor) => {
                    const isDoctorActive = pathname === `/orders/doctors/${doctor.id}`
                    return (
                      <DropdownMenuItem key={doctor.id} asChild>
                        <Link
                          href={`/orders/doctors/${doctor.id}`}
                          onClick={onLinkClick}
                          className={isDoctorActive ? "bg-accent" : ""}
                        >
                          <span className="truncate">
                            Dr. {doctor.first_name} {doctor.last_name}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/orders"
            onClick={onLinkClick}
            title="Bookings"
            className={cn(
              "flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isBookingsActive
                ? "bg-[#42E0CF] text-white shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            style={isBookingsActive ? { backgroundColor: '#42E0CF', color: '#fff', borderRadius: '24px' } : undefined}
          >
            <ShoppingCart className="h-5 w-5 flex-shrink-0" />
          </Link>
        )}
      </nav>
    </>
  )
}

export function AdminSidebar() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  return (
    <aside className={cn(
      "hidden md:flex flex-col border-r bg-background transition-all duration-300 relative",
      desktopCollapsed ? "w-16" : "w-48"
    )}>
      <SidebarContent isCollapsed={desktopCollapsed} />

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDesktopCollapsed(!desktopCollapsed)}
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
      >
        {desktopCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  )
}

