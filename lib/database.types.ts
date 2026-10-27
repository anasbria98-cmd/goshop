import type { HomeSlideRow } from "./home-slides";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "customer" | "staff" | "admin" | "super_admin";
export type ProductStatus = "draft" | "active" | "archived";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_navigation: boolean;
  show_in_top_navigation: boolean;
  show_in_all_categories: boolean;
  show_in_mobile_menu: boolean;
  navigation_label: string | null;
  navigation_column: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandRow = {
  show_in_featured_brands: boolean;
  display_order: number | null;
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  display_colors?: Json;
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  sku: string;
  manufacturer_reference: string | null;
  barcode: string | null;
  brand_id: string | null;
  status: ProductStatus;
  product_type: string;
  main_image_url: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  tax_rate: number;
  stock_tracking: boolean;
  allow_backorder: boolean;
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  is_on_sale: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  customer_note: string | null;
  admin_note: string | null;
  shipping_address_snapshot: Json;
  billing_address_snapshot: Json;
  created_at: string;
  updated_at: string;
};

export type PromotionRow = {
  id: string;
  name: string;
  code: string | null;
  type: "percentage" | "fixed";
  value: number;
  minimum_order_amount: number;
  maximum_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  status: "pending" | "approved" | "rejected";
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
};

type GenericRow = { id: string; [key: string]: unknown };

export type Database = {
  public: {
    Tables: {
      homepage_slides: Table<HomeSlideRow>;
      profiles: Table<ProfileRow>;
      categories: Table<CategoryRow>;
      brands: Table<BrandRow>;
      featured_brand_layout: Table<{ id: boolean; slot_count: number }>;
      products: Table<ProductRow>;
      product_categories: Table<{ product_id: string; category_id: string; is_primary: boolean }>;
      product_images: Table<GenericRow>;
      attributes: Table<GenericRow>;
      attribute_options: Table<GenericRow>;
      category_attributes: Table<GenericRow>;
      product_attribute_values: Table<GenericRow>;
      product_variants: Table<GenericRow>;
      inventory: Table<InventoryRow>;
      inventory_movements: Table<GenericRow>;
      addresses: Table<GenericRow>;
      carts: Table<GenericRow>;
      cart_items: Table<GenericRow>;
      favorites: Table<{ user_id: string; product_id: string; created_at: string }>;
      orders: Table<OrderRow>;
      order_items: Table<GenericRow>;
      payments: Table<GenericRow>;
      shipping_methods: Table<GenericRow>;
      shipments: Table<GenericRow>;
      promotions: Table<PromotionRow>;
      promotion_products: Table<GenericRow>;
      promotion_categories: Table<GenericRow>;
      promotion_redemptions: Table<GenericRow>;
      reviews: Table<ReviewRow>;
      store_settings: Table<{
        key: string;
        value: Json;
        group_name: string;
        is_public: boolean;
        description: string | null;
        updated_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      media_assets: Table<GenericRow>;
      admin_audit_logs: Table<GenericRow>;
    };
    Views: Record<string, never>;
    Functions: {
      save_featured_brand_layout: { Args: { p_expected: (string | null)[]; p_slots: (string | null)[] }; Returns: undefined };
      delete_product_safely: { Args: {p_product_id:string;p_name:string;p_sku:string;p_confirmed:boolean}; Returns:string };
      reorder_homepage_slides: { Args: { p_location: string; p_ids: string[] }; Returns: undefined };
      current_role: { Args: Record<string, never>; Returns: AppRole };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      category_descendants: { Args: { root_slug: string }; Returns: { id: string }[] };
      save_product_with_color_variants: {
        Args: { p_product_id: string | null; p_product: Json; p_category_ids: string[]; p_primary_category_id: string; p_stock: number; p_low_stock_threshold: number; p_variants: Json };
        Returns: string;
      };
      adjust_inventory: {
        Args: {
          inventory_id: string;
          quantity_delta: number;
          movement_type: string;
          movement_reason?: string | null;
          movement_reference?: string | null;
        };
        Returns: InventoryRow;
      };
      create_order_from_cart: {
        Args: {
          p_user_id: string | null;
          p_email: string;
          p_phone: string;
          p_items: Json;
          p_shipping_address: Json;
          p_billing_address: Json;
          p_customer_note?: string | null;
        };
        Returns: OrderRow;
      };
      admin_update_order_status: {
        Args: { p_order_id: string; p_status: OrderStatus; p_admin_note?: string | null };
        Returns: OrderRow;
      };
    };
    Enums: {
      app_role: AppRole;
      product_status: ProductStatus;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
