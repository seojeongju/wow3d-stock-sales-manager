// Cloudflare Bindings 타입
export type Bindings = {
  DB: D1Database;
}

// 상품 타입
export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_alert: number;
  supplier?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 고객 타입
export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  grade: string;
  notes?: string;
  total_purchase_amount: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
}

// 판매 타입
export interface Sale {
  id: number;
  customer_id?: number;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string;
  notes?: string;
  status: string;
  shipping_address?: string;
  tracking_number?: string;
  courier?: string;
  created_at: string;
  updated_at: string;
}

// 반품/교환 타입
export interface Claim {
  id: number;
  sale_id: number;
  type: 'return' | 'exchange';
  status: 'requested' | 'approved' | 'completed' | 'rejected';
  reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimItem {
  id: number;
  claim_id: number;
  product_id: number;
  quantity: number;
  condition?: string;
  created_at: string;
}

// 판매 상세 타입
export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

// 재고 이동 타입
export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  reason?: string;
  reference_id?: number;
  notes?: string;
  created_at: string;
}

// API 요청 타입
export interface CreateProductRequest {
  sku: string;
  name: string;
  category: string;
  description?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_alert?: number;
  supplier?: string;
}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  description?: string;
  purchase_price?: number;
  selling_price?: number;
  min_stock_alert?: number;
  supplier?: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  grade?: string;
  notes?: string;
}

export interface CreateSaleRequest {
  customer_id?: number;
  items: {
    product_id: number;
    quantity: number;
  }[];
  discount_amount?: number;
  payment_method: string;
  notes?: string;
}

export interface StockMovementRequest {
  product_id: number;
  movement_type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface UpdateShippingRequest {
  shipping_address?: string;
  tracking_number?: string;
  courier?: string;
  status?: string;
}

export interface CreateClaimRequest {
  sale_id: number;
  type: 'return' | 'exchange';
  reason?: string;
  items: {
    product_id: number;
    quantity: number;
    condition?: string;
  }[];
}

export interface UpdateClaimStatusRequest {
  status: 'approved' | 'completed' | 'rejected';
  admin_notes?: string;
}
