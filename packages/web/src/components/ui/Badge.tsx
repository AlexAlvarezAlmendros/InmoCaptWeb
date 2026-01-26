import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { PropertyState } from "@/types";

export type BadgeVariant =
  | "default"
  | "new"
  | "contacted"
  | "captured"
  | "rejected"
  | "success"
  | "warning"
  | "error"
  | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  new: "bg-state-new/10 text-state-new",
  contacted: "bg-state-contacted/10 text-state-contacted",
  captured: "bg-state-captured/10 text-state-captured",
  rejected: "bg-state-rejected/10 text-state-rejected",
  success: "bg-accent/10 text-accent",
  warning: "bg-state-contacted/10 text-state-contacted",
  error: "bg-state-rejected/10 text-state-rejected",
  info: "bg-primary/10 text-primary",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

// Helper to get badge variant from property state
export function getStateVariant(state: PropertyState): BadgeVariant {
  return state;
}

// Helper to get state label in Spanish
export function getStateLabel(state: PropertyState): string {
  const labels: Record<PropertyState, string> = {
    new: "Nuevo",
    contacted: "Contactado",
    captured: "Captado",
    rejected: "Rechazado",
  };
  return labels[state];
}
