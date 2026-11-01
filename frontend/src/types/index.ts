export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'kitchen' | 'admin';
  studentId?: string;
  avatar?: string;
  accountStatus?: 'approved' | 'pending' | 'rejected';
  isActive?: boolean;
  createdAt?: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: 'Breakfast' | 'Lunch' | 'Snacks' | 'Beverages' | 'Dinner';
  emoji: string;
  image?: string;
  prepTime: number;
  calories: number;
  tags?: string[];
  isAvailable: boolean;
  isSpecial?: boolean;
  currentStock: number;
  maxStock: number;
  lowStockThreshold?: number;
  stockPercentage?: number;
  isLowStock?: boolean;
  orderCount?: number;
  todayOrderCount: number;
  rating?: number;
}

export interface OrderItem {
  menuItem?: string | MenuItem;
  name: string;
  price: number;
  quantity: number;
  prepTime?: number;
}

export interface StatusHistory {
  status: string;
  timestamp: string;
  updatedBy?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  qrToken: string;
  student: string | User;
  items: OrderItem[];
  status: 'payment_pending' | 'confirmed' | 'preparing' | 'quality_check' | 'ready' | 'picked_up' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentRef?: string;
  totalAmount: number;
  estimatedWaitTime: number;
  actualWaitTime?: number;
  qrVerified: boolean;
  qrVerifiedAt?: string;
  notes?: string;
  statusHistory?: StatusHistory[];
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  emoji: string;
  prepTime: number;
  quantity: number;
}

export interface Recommendation {
  item: MenuItem;
  reason: string;
}

export interface QueueStatus {
  queueLength: number;
  estimatedWait: number;
  confidence: number;
  kitchenOnline: boolean;
}

export interface BatchSuggestion {
  itemName: string;
  quantity: number;
  estimatedTimeSaved: string;
}

export interface PaymentConfig {
  upiId: string;
  qrImage?: string;
  phonePe?: string;
  contactName: string;
  instructions: string;
}

export interface AdminAnalytics {
  todayOrders: number;
  todayRevenue: number;
  topItems: { name: string; emoji: string; todayOrderCount: number; price: number }[];
  weeklyOrders: { _id: string; count: number; revenue: number }[];
  studentCount: number;
}
