// User types
export interface User {
  id: string;
  email: string;
  createdAt: string;
  emailNotificationsOn: boolean;
}

// List types
export interface PropertyList {
  id: string;
  name: string;
  location: string;
  priceCents: number;
  currency: string;
  lastUpdatedAt: string;
  createdAt: string;
  totalProperties?: number;
  newPropertiesSinceLastUpdate?: number;
}

// Property types
export type PropertyState = 'new' | 'contacted' | 'captured' | 'rejected';

export interface Property {
  id: string;
  listId: string;
  price: number;
  m2: number;
  bedrooms: number;
  phone: string;
  ownerName: string;
  sourceUrl: string;
  createdAt: string;
  // Agent-specific state
  state?: PropertyState;
  comment?: string;
}

// Subscription types
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

export interface Subscription {
  id: string;
  userId: string;
  listId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  createdAt: string;
  list?: PropertyList;
}

// List request types
export type ListRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ListRequest {
  id: string;
  userId: string;
  location: string;
  notes: string;
  status: ListRequestStatus;
  createdListId?: string;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
  total: number;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}
