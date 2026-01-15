import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import NavbarWrapper from "@/components/layout/navbar-wrapper";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Derma Solution - Aesthetic Skin Clinic",
  description: "Book appointments for professional aesthetic treatments and skin care services",
  icons: {
    icon: '/logos/favicon.webp',
    shortcut: '/logos/favicon.webp',
    apple: '/logos/favicon.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} font-sans antialiased overflow-x-hidden`}
      >
        <div className="min-h-screen w-full overflow-x-hidden">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <React.Suspense fallback={null}>
              <NavbarWrapper />
            </React.Suspense>
            {children}
            <Toaster />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
