"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface LocationContextType {
  location: string | null;
  setLocation: (loc: string | null) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedLocation");
      setLocationState(stored);
      const update = () => setLocationState(localStorage.getItem("selectedLocation"));
      window.addEventListener("location-changed", update);
      return () => window.removeEventListener("location-changed", update);
    }
  }, []);

  const setLocation = (loc: string | null) => {
    setLocationState(loc);
    if (typeof window !== "undefined") {
      if (loc) localStorage.setItem("selectedLocation", loc);
      else localStorage.removeItem("selectedLocation");
      window.dispatchEvent(new Event("location-changed"));
    }
  };

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within a LocationProvider");
  return ctx;
}
