export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'admin'

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  avatar_url?: string
  // Optional contact/profile fields that may be set in profile settings
  phone?: string
  phone_number?: string
  address?: string
  gender?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug?: string
  description?: string
  image_url?: string
  display_order: number
  is_active: boolean
  locations: string[]
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  category_id: string
  name: string
  slug: string
  description: string
  images?: Json // JSON array of image URLs
  thumbnail?: string
  base_price: number
  session_options?: Json // JSON array of session options
  duration_minutes?: number
  is_popular: boolean
  locations: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Order {
  id: string
  customer_id: string
  service_id: string | null
  doctor_id?: string | null
  service_title: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  address?: string
  session_count: number
  unit_price: number
  discount_percent?: number
  total_amount: number
  status: OrderStatus
  location: string[]
  booking_date: string
  booking_time: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  customer_id: string
  service_id: string
  order_id: string
  rating: number
  comment?: string
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface Doctor {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  specialization?: string
  bio?: string
  avatar_url?: string
  locations: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface ServiceWithCategory extends Service {
  category: Category
  subservices?: {
    id: string
    name: string
    price: number
    slug: string
  }[]
}

export interface OrderWithDetails extends Order {
  service: ServiceWithCategory
  customer: Profile
  doctor?: Doctor | null
}

export interface ReviewWithDetails extends Review {
  customer: Profile
  service: Service
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Review, 'id' | 'created_at' | 'updated_at'>>
      }
      doctors: {
        Row: Doctor
        Insert: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Doctor, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}

