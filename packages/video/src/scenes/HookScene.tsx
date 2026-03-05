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
 * Scene 1: Hook – Logo reveal with animated gradient orb
 * Duration: 4s (120 frames @ 30fps)
 * Highly visual: pulsing gradient orb + logo spring entrance + tagline fade
 * At end: titles fade out and house icons start appearing for seamless transition to Scene 2
 */

const HOUSE_ICON = (color: string, size: number) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// Pre-house icons that start appearing at the end of this scene
const preHouses = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: Math.sin(i * 2.7) * 600 + (i % 3) * 80,
  y: Math.cos(i * 1.8) * 300 + (i % 2) * 60,
  rotation: Math.sin(i * 3.14) * 30 + (i % 4) * 12,
}));

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = useThemeColors();

  // Orb animation
  const orbScale = interpolate(frame, [0, 120], [0.6, 1.2], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const orbOpacity = interpolate(frame, [0, 30, 85, 110], [0, 0.6, 0.6, 0.2], {
    extrapolateRight: "clamp",
  });
  const orbRotation = interpolate(frame, [0, 120], [0, 45]);

  // Logo entrance
  const logoSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.3, 1]);
  const logoBaseOpacity = interpolate(logoSpring, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out titles near end of scene
  const titleFadeOut = interpolate(frame, [80, 105], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoOpacity = logoBaseOpacity * titleFadeOut;

  // Tagline fade in then out
  const taglineOpacity =
    interpolate(frame, [45, 60], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * titleFadeOut;
  const taglineY = interpolate(frame, [45, 60], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 200 + (i % 3) * 100;
    const speed = 0.3 + (i % 4) * 0.15;
    const x = Math.cos(angle + frame * speed * 0.02) * radius;
    const y = Math.sin(angle + frame * speed * 0.02) * radius;
    const size = 3 + (i % 3) * 2;
    const particleOpacity = interpolate(
      frame,
      [i * 2, i * 2 + 30],
      [0, 0.3 + (i % 3) * 0.15],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return { x, y, size, opacity: particleOpacity, key: i };
  });

  // House icons appear starting at frame 85
  const housesAppearProgress = interpolate(frame, [85, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgDarker,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: fonts.family,
        overflow: "hidden",
      }}
    >
      {/* Gradient Orb */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}88 0%, ${colors.accent}44 40%, transparent 70%)`,
          transform: `scale(${orbScale}) rotate(${orbRotation}deg)`,
          opacity: orbOpacity,
          filter: "blur(40px)",
        }}
      />

      {/* Secondary orb */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}66 0%, ${colors.primaryLight}33 50%, transparent 70%)`,
          transform: `scale(${orbScale * 0.8}) rotate(${-orbRotation * 1.5}deg) translate(100px, -50px)`,
          opacity: orbOpacity * 0.7,
          filter: "blur(60px)",
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor:
              p.key % 2 === 0 ? colors.accent : colors.primaryLight,
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Logo + Tagline centered together */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 130,
              fontWeight: 800,
              color: colors.white,
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            Inmo
            <span style={{ color: colors.accent }}>Capt</span>
          </div>
        </div>

        {/* Tagline directly below logo */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <div
            style={{
              fontSize: 38,
              color: colors.textSecondary,
              fontWeight: 400,
              letterSpacing: "1px",
              textAlign: "center",
            }}
          >
            Captación de particulares para agentes inmobiliarios
          </div>
        </div>
      </div>

      {/* Pre-appearing house icons for seamless transition to Scene 2 */}
      {preHouses.map((house) => {
        const houseDelay = 85 + house.id * 3;
        const houseOpacity = interpolate(
          frame,
          [houseDelay, houseDelay + 15],
          [0, 0.5],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const jitterX = Math.sin(frame * 0.15 + house.id * 2) * 4;
        const jitterY = Math.cos(frame * 0.12 + house.id * 3) * 3;
        return (
          <div
            key={house.id}
            style={{
              position: "absolute",
              transform: `translate(${house.x + jitterX}px, ${house.y + jitterY}px) rotate(${house.rotation}deg)`,
              opacity: houseOpacity * housesAppearProgress,
              zIndex: 5,
            }}
          >
            {HOUSE_ICON(colors.textMuted, 40)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
