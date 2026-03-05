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
 * Scene 3: Dashboard – Animated subscription cards
 * Duration: 7s (210 frames @ 30fps)
 * Shows 3 list cards appearing with stagger + animated counters
 * Header nav (matching web app), cursor clicks on first card
 */

interface ListCardData {
  name: string;
  location: string;
  totalProperties: number;
  newCount: number;
  updated: string;
}

const lists: ListCardData[] = [
  {
    name: "Madrid Centro",
    location: "Madrid, España",
    totalProperties: 87,
    newCount: 12,
    updated: "Hace 2 horas",
  },
  {
    name: "Barcelona Eixample",
    location: "Barcelona, España",
    totalProperties: 64,
    newCount: 8,
    updated: "Hace 1 día",
  },
  {
    name: "Valencia Ruzafa",
    location: "Valencia, España",
    totalProperties: 43,
    newCount: 5,
    updated: "Hace 3 horas",
  },
];

const AnimatedNumber: React.FC<{
  value: number;
  frame: number;
  startFrame: number;
  fps: number;
}> = ({ value, frame, startFrame, fps }) => {
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 30, stiffness: 80 },
  });
  const displayValue = Math.round(value * progress);
  return <>{displayValue}</>;
};

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const colors = useThemeColors();
  const isVertical = width < height;

  // Header animation
  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 20 },
  });
  const headerOpacity = interpolate(headerSpring, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(headerSpring, [0, 1], [-30, 0]);

  // Title animation
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [10, 25], [-15, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Cursor: starts from right side, moves to center of first card, clicks
  const cardWidth = isVertical ? Math.min(width - 128, 460) : 460;
  const firstCardCenterX = isVertical ? 64 + cardWidth / 2 : 350;
  const firstCardCenterY = isVertical ? 470 : 480;

  const cursorAppear = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(
    frame,
    [0, 30, 100, 130],
    [width * 0.75, width * 0.6, width * 0.4, firstCardCenterX],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  const cursorY = interpolate(
    frame,
    [0, 30, 100, 130],
    [height * 0.2, height * 0.28, height * 0.32, firstCardCenterY],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  // Click effect at frame 135
  const clickScale =
    frame >= 135 && frame <= 145
      ? interpolate(frame, [135, 140, 145], [1, 0.8, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  // Card highlight after click
  const cardHighlight =
    frame >= 140
      ? interpolate(frame, [140, 155], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgDarker,
        fontFamily: fonts.family,
        overflow: "hidden",
      }}
    >
      {/* Header Nav Bar (matching web app) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: isVertical ? 56 : 72,
          padding: `0 ${isVertical ? 28 : 48}px`,
          backgroundColor: colors.bgDark,
          borderBottom: `1px solid ${colors.borderDark}`,
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: isVertical ? 24 : 28,
            fontWeight: 800,
            color: colors.white,
          }}
        >
          Inmo<span style={{ color: colors.accent }}>Capt</span>
        </div>

        {isVertical ? (
          /* Hamburger menu icon (mobile nav) */
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ width: 22, height: 2, backgroundColor: colors.textSecondary, borderRadius: 1 }} />
            <div style={{ width: 22, height: 2, backgroundColor: colors.textSecondary, borderRadius: 1 }} />
            <div style={{ width: 22, height: 2, backgroundColor: colors.textSecondary, borderRadius: 1 }} />
          </div>
        ) : (
          /* Desktop nav items */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
            }}
          >
            {[
              { label: "Mis Listas", active: true },
              { label: "Suscripciones", active: false },
              { label: "Cuenta", active: false },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  fontSize: 16,
                  fontWeight: item.active ? 600 : 400,
                  color: item.active ? colors.accent : colors.textSecondary,
                  paddingBottom: 4,
                  borderBottom: item.active
                    ? `2px solid ${colors.accent}`
                    : "none",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ padding: isVertical ? "24px 28px" : "48px 64px" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontSize: isVertical ? 28 : 38,
              fontWeight: 700,
              color: colors.white,
              margin: 0,
            }}
          >
            Mis Listas
          </h2>
          <p
            style={{
              fontSize: isVertical ? 16 : 20,
              color: colors.textSecondary,
              margin: "10px 0 0 0",
            }}
          >
            Accede a tus listados de particulares suscritos
          </p>
        </div>

        {/* Cards Grid */}
        <div
          style={{
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          {lists.map((list, index) => {
            const cardSpring = spring({
              frame: frame - 20 - index * 12,
              fps,
              config: { damping: 12, stiffness: 80 },
            });
            const cardScale = interpolate(cardSpring, [0, 1], [0.8, 1]);
            const cardOpacity = interpolate(cardSpring, [0, 0.5], [0, 1], {
              extrapolateRight: "clamp",
            });

            const isHighlighted = index === 0 && cardHighlight > 0;
            const highlightBorder = isHighlighted
              ? colors.accent
              : colors.borderDark;
            const highlightShadow = isHighlighted
              ? `0 0 ${30 * cardHighlight}px ${colors.accent}33`
              : "none";

            return (
              <div
                key={index}
                style={{
                  width: cardWidth,
                  backgroundColor: colors.bgDark,
                  border: `1.5px solid ${highlightBorder}`,
                  borderRadius: 16,
                  padding: 32,
                  transform: `scale(${cardScale})`,
                  opacity: cardOpacity,
                  boxShadow: highlightShadow,
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 24,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: colors.white,
                        marginBottom: 6,
                      }}
                    >
                      {list.name}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        color: colors.textMuted,
                      }}
                    >
                      {list.location}
                    </div>
                  </div>
                  {/* Active badge */}
                  <div
                    style={{
                      backgroundColor: `${colors.stateCaptured}22`,
                      color: colors.stateCaptured,
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "5px 14px",
                      borderRadius: 20,
                    }}
                  >
                    Activa
                  </div>
                </div>

                {/* Stats */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 18,
                    }}
                  >
                    <span style={{ color: colors.textMuted }}>
                      Inmuebles totales
                    </span>
                    <span style={{ color: colors.white, fontWeight: 600 }}>
                      <AnimatedNumber
                        value={list.totalProperties}
                        frame={frame}
                        startFrame={30 + index * 12}
                        fps={fps}
                      />
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 18,
                    }}
                  >
                    <span style={{ color: colors.textMuted }}>Nuevos</span>
                    <div
                      style={{
                        backgroundColor: `${colors.stateCaptured}22`,
                        color: colors.stateCaptured,
                        fontSize: 15,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 12,
                      }}
                    >
                      +
                      <AnimatedNumber
                        value={list.newCount}
                        frame={frame}
                        startFrame={40 + index * 12}
                        fps={fps}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 18,
                    }}
                  >
                    <span style={{ color: colors.textMuted }}>Actualizado</span>
                    <span style={{ color: colors.textSecondary }}>
                      {list.updated}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated Cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          opacity: cursorAppear,
          transform: `scale(${clickScale})`,
          zIndex: 100,
          pointerEvents: "none",
        }}
      >
        <svg
          width={28}
          height={32}
          viewBox="0 0 24 24"
          fill={colors.cursorFill}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
        >
          <path d="M5.65 2.05L18.3 14.7H11.7L16.72 22.72L14.38 24.01L9.42 15.87L5.65 19.64V2.05Z" />
        </svg>
      </div>

      {/* Click ripple effect */}
      {frame >= 135 && frame <= 155 && (
        <div
          style={{
            position: "absolute",
            left: firstCardCenterX - 20,
            top: firstCardCenterY - 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `2px solid ${colors.accent}`,
            opacity: interpolate(frame, [135, 155], [0.8, 0], {
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(frame, [135, 155], [0.5, 2.5], {
              extrapolateRight: "clamp",
            })})`,
            zIndex: 99,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
