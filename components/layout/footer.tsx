import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-background w-full overflow-hidden">
      <div className="container px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {/* Company Info */}
          <div className="space-y-3 md:space-y-4">
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
            <p className="text-xs md:text-sm text-muted-foreground">
              Aesthetic Skin Clinic
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Professional aesthetic treatments and skin care services with
              industry&apos;s longest experience.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-semibold font-heading">Quick Links</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/treatments"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Treatments
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-semibold font-heading">Legal</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-semibold font-heading">Contact Us</h4>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  Copenhagen, Denmark
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a
                  href="tel:+45123456789"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  +45 12 34 56 78
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a
                  href="mailto:info@dermasolution.com"
                  className="text-muted-foreground hover:text-primary transition-colors break-all"
                >
                  info@dermasolution.com
                </a>
              </li>
            </ul>

            {/* Social Media */}
            <div className="flex gap-3 pt-2">
              <Link
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-xs md:text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Derma Solution. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
