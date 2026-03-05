import { createContext, useContext } from "react";

/**
 * Design tokens – mirrors the web app's design guide
 */
export const colors = {
  // Primary (Azul petróleo)
  primary: "#1E3A5F",
  primaryLight: "#2B4F7A",
  primaryDark: "#162B45",

  // Accent (Verde oportunidad)
  accent: "#3BB273",
  accentSoft: "#E6F6EE",

  // States
  stateNew: "#3B82F6",
  stateContacted: "#F59E0B",
  stateCaptured: "#10B981",
  stateRejected: "#EF4444",

  // Surfaces (dark mode style for video)
  bgDark: "#0F172A",
  bgDarker: "#020617",
  cardDark: "#0F172A",
  borderDark: "#1E293B",

  // Text
  textPrimary: "#E5E7EB",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  white: "#FFFFFF",

  // Backgrounds for UI mockups
  surfaceLight: "#F8FAFC",
  cardLight: "#FFFFFF",
  borderLight: "#E2E8F0",
  textDark: "#0F172A",

  // Theme-aware tokens
  cursorFill: "#FFFFFF",
  cursorStroke: "#020617",
  onAccent: "#FFFFFF",
  heroDimBg: "#000000",
};

export const lightColors: typeof colors = {
  // Primary (same)
  primary: "#1E3A5F",
  primaryLight: "#2B4F7A",
  primaryDark: "#162B45",

  // Accent (same)
  accent: "#3BB273",
  accentSoft: "#E6F6EE",

  // States (same)
  stateNew: "#3B82F6",
  stateContacted: "#F59E0B",
  stateCaptured: "#10B981",
  stateRejected: "#EF4444",

  // Surfaces (light mode)
  bgDark: "#F1F5F9",
  bgDarker: "#F8FAFC",
  cardDark: "#FFFFFF",
  borderDark: "#D1D5DB",

  // Text (light mode)
  textPrimary: "#1E293B",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  white: "#0F172A",

  // Backgrounds
  surfaceLight: "#F8FAFC",
  cardLight: "#FFFFFF",
  borderLight: "#E2E8F0",
  textDark: "#0F172A",

  // Theme-aware tokens
  cursorFill: "#1E3A5F",
  cursorStroke: "#FFFFFF",
  onAccent: "#FFFFFF",
  heroDimBg: "#FFFFFF",
};

export const ThemeContext = createContext(colors);
export const useThemeColors = () => useContext(ThemeContext);

export const fonts = {
  family: "Inter, system-ui, sans-serif",
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
