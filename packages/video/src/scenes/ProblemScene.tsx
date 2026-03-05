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
 * Scene 2: Problem → Solution visualization
 * Duration: 6s (180 frames @ 30fps)
 * Visual: Scattered chaotic house icons → organized into a clean grid
 * Minimal text, maximum visual storytelling
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

const PHONE_ICON = (color: string, size: number) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const SEARCH_ICON = (color: string, size: number) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

interface HouseItem {
  id: number;
  chaosX: number;
  chaosY: number;
  chaosRotation: number;
  gridX: number;
  gridY: number;
  delay: number;
}

const houses: HouseItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  chaosX: Math.sin(i * 2.7) * 700 + (i % 3) * 100,
  chaosY: Math.cos(i * 1.8) * 350 + (i % 2) * 80,
  chaosRotation: Math.sin(i * 3.14) * 40 + (i % 4) * 15,
  gridX: (i % 4) * 190 - 285,
  gridY: Math.floor(i / 4) * 190 - 190,
  delay: i * 2,
}));

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = useThemeColors();

  // Phase 1 (0-60): chaos + centered title
  // Phase 2 (60-110): transition to order (title fades out just before)
  // Phase 3 (110-180): organized + labels appear

  const transitionProgress = interpolate(frame, [60, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // --- Centered title (appears at start, fades out before houses organize) ---
  const titleIn = interpolate(frame, [5, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOut = interpolate(frame, [62, 72], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = titleIn * titleOut;
  const titleScale = interpolate(
    spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 80 } }),
    [0, 1],
    [0.7, 1],
  );
  const titleSlideY = interpolate(titleOut, [0, 1], [-40, 0]);

  // Question mark / search icon phase
  const searchOpacity = interpolate(frame, [10, 30, 55, 70], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const searchScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12 },
  });

  // "?" bounce during chaos
  const chaosShake = Math.sin(frame * 0.3) * 3;

  // Organized grid appearance
  const gridOpacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge/label appearance for organized phase
  const labelsSpring = spring({
    frame: frame - 120,
    fps,
    config: { damping: 15 },
  });

  // Connecting lines that appear during organization
  const lineProgress = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Background gradient shift
  const bgGradientOpacity = interpolate(frame, [60, 110], [0, 0.15], {
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
      {/* Background gradient that transitions from red-ish to green */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            transitionProgress < 0.5
              ? `radial-gradient(circle at center, ${colors.stateRejected}22 0%, transparent 60%)`
              : `radial-gradient(circle at center, ${colors.accent}22 0%, transparent 60%)`,
          opacity: bgGradientOpacity + 0.05,
        }}
      />

      {/* Centered title – appears during chaos, fades before organization */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          opacity: titleOpacity,
          transform: `scale(${titleScale}) translateY(${titleSlideY}px)`,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            color: colors.white,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Todos los particulares,
        </div>
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            color: colors.accent,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.15,
            marginTop: 8,
          }}
        >
          organizados para ti
        </div>
      </div>

      {/* Search icon during chaos */}
      <div
        style={{
          position: "absolute",
          top: 120,
          opacity: searchOpacity,
          transform: `scale(${searchScale}) translateX(${chaosShake}px)`,
          zIndex: 20,
        }}
      >
        {SEARCH_ICON(colors.textSecondary, 80)}
      </div>

      {/* Houses - chaos → grid */}
      {houses.map((house) => {
        const x = interpolate(
          transitionProgress,
          [0, 1],
          [house.chaosX, house.gridX],
        );
        const y = interpolate(
          transitionProgress,
          [0, 1],
          [house.chaosY, house.gridY],
        );
        const rotation = interpolate(
          transitionProgress,
          [0, 1],
          [house.chaosRotation, 0],
        );
        const houseOpacity = interpolate(
          frame,
          [house.delay, house.delay + 15],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        // Jitter during chaos
        const jitterX =
          transitionProgress < 1
            ? Math.sin(frame * 0.15 + house.id * 2) *
              (4 * (1 - transitionProgress))
            : 0;
        const jitterY =
          transitionProgress < 1
            ? Math.cos(frame * 0.12 + house.id * 3) *
              (3 * (1 - transitionProgress))
            : 0;

        const houseColor =
          transitionProgress > 0.8
            ? house.id % 4 === 0
              ? colors.stateNew
              : house.id % 4 === 1
                ? colors.stateContacted
                : house.id % 4 === 2
                  ? colors.stateCaptured
                  : colors.accent
            : colors.textMuted;

        return (
          <div
            key={house.id}
            style={{
              position: "absolute",
              transform: `translate(${x + jitterX}px, ${y + jitterY}px) rotate(${rotation}deg)`,
              opacity: houseOpacity,
            }}
          >
            <div
              style={{
                width: 150,
                height: 150,
                borderRadius: 14,
                backgroundColor:
                  transitionProgress > 0.5
                    ? `${colors.borderDark}`
                    : "transparent",
                border:
                  transitionProgress > 0.5
                    ? `1px solid ${colors.borderDark}`
                    : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: 8,
              }}
            >
              {HOUSE_ICON(houseColor, 52)}
              {transitionProgress > 0.9 && (
                <div
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    opacity: labelsSpring,
                    textAlign: "center",
                    lineHeight: 1,
                  }}
                >
                  {house.id % 3 === 0
                    ? "250.000€"
                    : house.id % 3 === 1
                      ? "180.000€"
                      : "320.000€"}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Connecting grid lines */}
      <svg
        width={800}
        height={620}
        style={{
          position: "absolute",
          opacity: lineProgress * 0.3,
          pointerEvents: "none",
        }}
        viewBox="-400 -310 800 620"
      >
        {/* Horizontal lines */}
        {[0, 1, 2].map((row) => (
          <line
            key={`h-${row}`}
            x1={-380}
            y1={row * 190 - 190}
            x2={interpolate(lineProgress, [0, 1], [-380, 380])}
            y2={row * 190 - 190}
            stroke={colors.borderDark}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}
        {/* Vertical lines */}
        {[0, 1, 2, 3].map((col) => (
          <line
            key={`v-${col}`}
            x1={col * 190 - 285}
            y1={-285}
            x2={col * 190 - 285}
            y2={interpolate(lineProgress, [0, 1], [-285, 285])}
            stroke={colors.borderDark}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
