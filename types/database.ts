export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "organizer" | "staff";

export type EventCategory =
  | "music"
  | "comedy"
  | "sports"
  | "conferences"
  | "parties"
  | "other";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  venue: string;
  city: string;
  event_date: string; // ISO date, e.g. "2026-09-12"
  event_time: string; // e.g. "19:00"
  poster_url: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  created_at: string;
}

export interface EventWithTicketTypes extends EventRow {
  ticket_types: TicketTypeRow[];
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export interface OrderRow {
  id: string;
  user_id: string;
  event_id: string;
  total_amount: number;
  status: OrderStatus;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  qr_code: string | null;
  scanned_at: string | null;
  scanned_by: string | null;
  wristband_id: string | null;
  created_at: string;
}

export interface OrderItemWithTicketType extends OrderItemRow {
  ticket_types: Pick<TicketTypeRow, "name"> | null;
}

export interface OrderWithDetails extends OrderRow {
  events: Pick<EventRow, "title" | "slug" | "event_date" | "event_time" | "venue" | "city"> | null;
  order_items: OrderItemWithTicketType[];
}

export type ScanResultKind =
  | "success"
  | "already_scanned"
  | "not_paid"
  | "invalid";

export interface ScanTicketPayload {
  result: ScanResultKind;
  event_title?: string;
  ticket_type_name?: string;
  holder_name?: string;
  quantity?: number;
  scanned_at?: string;
  wristband_id?: string;
}

/**
 * Minimal Database type for the Supabase client generics. Hand-written to
 * match supabase/schema.sql — regenerate with the Supabase CLI
 * (`supabase gen types typescript`) once the project is linked, and swap
 * this out.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      events: {
        Row: EventRow;
        Insert: Omit<EventRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<EventRow>;
      };
      ticket_types: {
        Row: TicketTypeRow;
        Insert: Omit<TicketTypeRow, "id" | "created_at" | "sold"> & {
          id?: string;
          sold?: number;
        };
        Update: Partial<TicketTypeRow>;
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "id" | "created_at" | "updated_at">;
        Update: Partial<OrderRow>;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Omit<OrderItemRow, "id" | "created_at">;
        Update: Partial<OrderItemRow>;
      };
    };
    Functions: {
      create_order: {
        Args: { p_event_id: string; p_items: Json };
        Returns: string;
      };
      scan_ticket: {
        Args: { p_qr_code: string };
        Returns: Json;
      };
      expire_pending_orders: {
        Args: { p_older_than_minutes?: number };
        Returns: number;
      };
    };
  };
}
