import { z } from "zod";

// ============================================
// Me Routes
// ============================================

export const updatePreferencesSchema = z.object({
  emailNotificationsOn: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// ============================================
// Billing Routes
// ============================================

export const checkoutSessionSchema = z.object({
  listId: z.string().uuid("Invalid list ID"),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

// ============================================
// Lists Routes
// ============================================

export const listIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID"),
});

export const propertyIdParamSchema = z.object({
  listId: z.string().uuid("Invalid list ID"),
  propertyId: z.string().uuid("Invalid property ID"),
});

export const propertiesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export type PropertiesQuery = z.infer<typeof propertiesQuerySchema>;

export const propertyStateSchema = z.object({
  state: z.enum(["new", "contacted", "captured", "rejected"], {
    errorMap: () => ({
      message: "State must be one of: new, contacted, captured, rejected",
    }),
  }),
});

export type PropertyStateInput = z.infer<typeof propertyStateSchema>;

export const propertyCommentSchema = z.object({
  comment: z.string().max(2000, "Comment must be 2000 characters or less"),
});

export type PropertyCommentInput = z.infer<typeof propertyCommentSchema>;

// ============================================
// List Requests Routes
// ============================================

export const createListRequestSchema = z.object({
  location: z
    .string()
    .min(1, "Location is required")
    .max(500, "Location too long"),
  notes: z
    .string()
    .max(2000, "Notes must be 2000 characters or less")
    .optional(),
});

export type CreateListRequestInput = z.infer<typeof createListRequestSchema>;

// ============================================
// Admin Routes
// ============================================

export const updateListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().min(1).max(500).optional(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
});

export type UpdateListInput = z.infer<typeof updateListSchema>;

export const createListSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  location: z.string().min(1, "Location is required").max(500),
  priceCents: z.number().int().min(0, "Price must be positive"),
  currency: z.string().length(3).default("EUR"),
});

export type CreateListInput = z.infer<typeof createListSchema>;

// Schema for simplified/internal property format
export const propertyInputSchema = z.object({
  price: z.number().int().min(0),
  m2: z.number().int().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  phone: z.string().max(50).optional(),
  ownerName: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

// Schema for Idealista raw property format
export const idealistaPropertySchema = z.object({
  titulo: z.string().optional(),
  precio: z.string(), // "90.000€"
  ubicacion: z.string().optional(),
  habitaciones: z.string().nullable().optional(), // "3 hab." or null
  metros: z.string().nullable().optional(), // "70 m²" or null
  url: z.string().url(),
  descripcion: z.string().nullable().optional(),
  anunciante: z.string().optional(),
  fecha_scraping: z.string().optional(),
});

// Schema for Idealista JSON format
export const idealistaUploadSchema = z.object({
  timestamp: z.string().optional(),
  url: z.string().optional(),
  total: z.number().optional(),
  particulares: z.number().optional(),
  inmobiliarias: z.number().optional(),
  viviendas: z.object({
    todas: z
      .array(idealistaPropertySchema)
      .min(1, "At least one property is required"),
  }),
});

// Schema for simplified/internal format
export const uploadPropertiesSchema = z.object({
  properties: z
    .array(propertyInputSchema)
    .min(1, "At least one property is required"),
});

export type UploadPropertiesInput = z.infer<typeof uploadPropertiesSchema>;
export type IdealistaUploadInput = z.infer<typeof idealistaUploadSchema>;
export type IdealistaProperty = z.infer<typeof idealistaPropertySchema>;

export const listRequestActionSchema = z.object({
  listId: z.string().uuid().optional(), // For approve action
});

export type ListRequestActionInput = z.infer<typeof listRequestActionSchema>;

// ============================================
// Helper for Fastify validation
// ============================================

export function zodValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessage = result.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");

  return { success: false, error: errorMessage };
}
