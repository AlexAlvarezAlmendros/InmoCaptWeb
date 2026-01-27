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

// Admin list with full stats
export interface AdminList extends PropertyList {
  subscriberCount: number;
  totalProperties: number;
}

// Create/Update list inputs
export interface CreateListInput {
  name: string;
  location: string;
  priceCents: number;
  currency?: string;
}

export interface UpdateListInput {
  name?: string;
  location?: string;
  priceCents?: number;
  currency?: string;
}

// Property upload types
export interface PropertyInput {
  price: number;
  m2?: number;
  bedrooms?: number;
  phone?: string;
  ownerName?: string;
  sourceUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface UploadPropertiesInput {
  properties: PropertyInput[];
}

// Idealista raw property format
export interface IdealistaRawProperty {
  titulo?: string;
  precio: string; // "90.000€"
  ubicacion?: string;
  habitaciones?: string | null; // "3 hab." or null
  metros?: string | null; // "70 m²"
  url: string;
  descripcion?: string | null;
  anunciante?: string;
  fecha_scraping?: string;
}

// Idealista JSON upload format
export interface IdealistaUpload {
  timestamp?: string;
  url?: string;
  total?: number;
  particulares?: number;
  inmobiliarias?: number;
  viviendas: {
    todas: IdealistaRawProperty[];
  };
}

export interface UploadResult {
  success: boolean;
  listId: string;
  stats: {
    total: number;
    new: number;
    updated: number;
    duplicates: number;
    errors: number;
  };
  errors: Array<{
    index: number;
    message: string;
  }>;
}

// Property types
export type PropertyState = "new" | "contacted" | "captured" | "rejected";

export interface Property {
  id: string;
  listId: string;
  price: number;
  m2: number | null;
  bedrooms: number | null;
  phone: string | null;
  ownerName: string | null;
  sourceUrl: string | null;
  createdAt: string;
  // Agent-specific state
  state: PropertyState;
  comment: string | null;
  stateUpdatedAt: string | null;
  // Extracted from rawPayload (Idealista)
  title?: string;
  location?: string;
  description?: string;
}

// Subscription types
export type SubscriptionStatus = "active" | "canceled" | "past_due";

export interface UserSubscription {
  id: string;
  listId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  listName: string;
  listLocation: string;
  lastUpdatedAt: string | null;
  totalProperties: number;
  newPropertiesCount: number;
}

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
export type ListRequestStatus = "pending" | "approved" | "rejected";

export interface ListRequest {
  id: string;
  userId: string;
  location: string;
  notes: string;
  status: ListRequestStatus;
  createdListId?: string;
  createdAt: string;
}

// Admin list request with user info
export interface AdminListRequest extends ListRequest {
  userEmail?: string;
}

// Approve request input
export interface ApproveRequestInput {
  name: string;
  priceCents: number;
  currency?: string;
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
