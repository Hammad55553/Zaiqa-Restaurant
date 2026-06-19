// Shared types for the Kitchen module

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface OrderItem {
  id: number;
  order_id: number;
  item_id: number | null;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string;
  status: string;
  created_at?: string;
}

export interface KitchenOrder {
  id: number;
  table_number: string;
  area: string;
  customer_name: string;
  remarks?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total_amount: number;
  created_at: string;
  time: string;
  has_new_updates?: number;
  admin_edit_remark?: string;
  items: OrderItem[];
}
