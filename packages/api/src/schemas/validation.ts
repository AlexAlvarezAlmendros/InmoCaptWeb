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

// Schema for Fotocasa raw property format
export const fotocasaPropertySchema = z.object({
  titulo: z.string().optional(),
  precio: z.string(), // "60.000 €"
  ubicacion: z.string().optional(),
  habitaciones: z.string().nullable().optional(), // "3 habs" or null
  metros: z.string().nullable().optional(), // "65 m²" or null
  url: z.string().url(),
  descripcion: z.string().nullable().optional(),
  anunciante: z.string().optional(),
  fecha_scraping: z.string().optional(),
  telefono: z.string().optional(), // "+34636517189" or "636517189"
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

// Schema for Fotocasa JSON format (viviendas is a direct array)
export const fotocasaUploadSchema = z.object({
  timestamp: z.string().optional(),
  ubicacion: z.string().min(1), // This is both listName and location
  url: z.string().optional(),
  total: z.number().optional(),
  viviendas: z
    .array(fotocasaPropertySchema)
    .min(1, "At least one property is required"),
});

export type UploadPropertiesInput = z.infer<typeof uploadPropertiesSchema>;
export type IdealistaUploadInput = z.infer<typeof idealistaUploadSchema>;
export type IdealistaProperty = z.infer<typeof idealistaPropertySchema>;
export type FotocasaUploadInput = z.infer<typeof fotocasaUploadSchema>;
export type FotocasaProperty = z.infer<typeof fotocasaPropertySchema>;

export const listRequestActionSchema = z.object({
  listId: z.string().uuid().optional(), // For approve action
});

export type ListRequestActionInput = z.infer<typeof listRequestActionSchema>;

// ============================================
// Automation Routes
// ============================================

// Schema for automation upload - simplified format with list identification
export const automationUploadSimplifiedSchema = z
  .object({
    listId: z.string().uuid("Invalid list ID").optional(),
    listName: z.string().min(1).max(200).optional(),
    location: z.string().min(1).max(500).optional(),
    properties: z
      .array(propertyInputSchema)
      .min(1, "At least one property is required"),
  })
  .refine((data) => data.listId || (data.listName && data.location), {
    message: "Either listId or both listName and location are required",
  });

// Schema for automation upload - Idealista format with list identification
export const automationUploadIdealistaSchema = z
  .object({
    listId: z.string().uuid("Invalid list ID").optional(),
    listName: z.string().min(1).max(200).optional(),
    location: z.string().min(1).max(500).optional(),
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
  })
  .refine((data) => data.listId || (data.listName && data.location), {
    message: "Either listId or both listName and location are required",
  });

// Schema for automation upload - Fotocasa format (uses ubicacion as listName/location)
export const automationUploadFotocasaSchema = z.object({
  listId: z.string().uuid("Invalid list ID").optional(),
  timestamp: z.string().optional(),
  ubicacion: z.string().min(1).max(500), // Used as both listName and location
  url: z.string().optional(),
  total: z.number().optional(),
  viviendas: z
    .array(fotocasaPropertySchema)
    .min(1, "At least one property is required"),
});

export type AutomationUploadSimplifiedInput = z.infer<
  typeof automationUploadSimplifiedSchema
>;
export type AutomationUploadIdealistaInput = z.infer<
  typeof automationUploadIdealistaSchema
>;
export type AutomationUploadFotocasaInput = z.infer<
  typeof automationUploadFotocasaSchema
>;

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
