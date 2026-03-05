import React from "react";
import { lightColors, ThemeContext } from "./theme";
import { PromoVideo } from "./PromoVideo";

/**
 * Light theme variant of the Promo Video.
 * Wraps the same PromoVideo composition with a light color palette.
 */
export const PromoVideoLight: React.FC = () => (
  <ThemeContext.Provider value={lightColors}>
    <PromoVideo />
  </ThemeContext.Provider>
);
