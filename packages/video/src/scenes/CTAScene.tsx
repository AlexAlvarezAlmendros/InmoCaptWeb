import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { fonts, useThemeColors } from "../theme";

/**
 * Scene 7: CTA Finale
 * Duration: 10s (300 frames @ 30fps)
 * Logo + tagline + URL prominent
 * All elements scaled up for video readability
 */
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = useThemeColors();

  // Background gradient animation
  const gradientRotation = interpolate(frame, [0, 300], [0, 60]);

  // Logo entrance
  const logoSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Divider line
  const lineWidth = spring({
    frame: frame - 30,
    fps,
    config: { damping: 20 },
  });
  const lineW = interpolate(lineWidth, [0, 1], [0, 260]);

  // CTA text
  const ctaSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 15 },
  });
  const ctaOpacity = interpolate(ctaSpring, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ctaY = interpolate(ctaSpring, [0, 1], [30, 0]);

  // URL
  const urlSpring = spring({
    frame: frame - 55,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const urlOpacity = interpolate(urlSpring, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });
  const urlScale = interpolate(urlSpring, [0, 1], [0.85, 1]);

  // URL glow pulse
  const urlGlow = interpolate(
    frame,
    [100, 140, 180, 220],
    [0.3, 0.7, 0.3, 0.7],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Features highlight pills
  const pillsDelay = [70, 78, 86];
  const pillTexts = [
    "Contactos directos",
    "Gestión de estados",
    "Actualizaciones diarias",
  ];

  // Final fade out
  const fadeOut = interpolate(frame, [270, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgDarker,
        fontFamily: fonts.family,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* Background gradient orbs */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `conic-gradient(from ${gradientRotation}deg, ${colors.primary}22, ${colors.accent}11, ${colors.primaryDark}22, ${colors.accent}11)`,
          filter: "blur(80px)",
          opacity: 0.4,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        >
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              color: colors.white,
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            Inmo<span style={{ color: colors.accent }}>Capt</span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: lineW,
            height: 3,
            backgroundColor: colors.accent,
            borderRadius: 2,
            opacity: 0.6,
          }}
        />

        {/* CTA text */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 46,
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: 8,
            }}
          >
            La herramienta profesional de captación
          </div>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 10,
          }}
        >
          {pillTexts.map((pill, i) => {
            const pillSpring = spring({
              frame: frame - pillsDelay[i],
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={i}
                style={{
                  padding: "12px 28px",
                  borderRadius: 24,
                  backgroundColor: `${colors.primary}44`,
                  border: `1px solid ${colors.primaryLight}44`,
                  color: colors.textSecondary,
                  fontSize: 18,
                  fontWeight: 500,
                  opacity: interpolate(pillSpring, [0, 0.3], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                  transform: `scale(${interpolate(pillSpring, [0, 1], [0.8, 1])})`,
                }}
              >
                {pill}
              </div>
            );
          })}
        </div>

        {/* URL – prominent */}
        <div
          style={{
            opacity: urlOpacity,
            transform: `scale(${urlScale})`,
            marginTop: 30,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: colors.accent,
              letterSpacing: "3px",
              textShadow: `0 0 ${30 * urlGlow}px ${colors.accent}88, 0 0 ${60 * urlGlow}px ${colors.accent}33`,
            }}
          >
            inmocapt.com
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
