import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors, fonts, useThemeColors } from "../theme";

/**
 * Scene 6: Real-time Notifications
 * Duration: 7s (210 frames @ 30fps)
 * Centered title intro → Bell animation + notification cards sliding in + badge counter
 * All elements scaled up for video readability
 */

// ── Title timing ───────────────────────────────────────────────
const TITLE_IN_START = 5;
const TITLE_IN_END = 18;
const TITLE_OUT_START = 62;
const TITLE_OUT_END = 72;

// ── Content timing (after title fades) ─────────────────────────
const CONTENT_START = 65;

interface Notification {
  title: string;
  body: string;
  icon: string;
  delay: number;
  accent: string;
}

const notifications: Notification[] = [
  {
    title: "Madrid Centro actualizada",
    body: "+12 nuevos inmuebles disponibles",
    icon: "🏠",
    delay: CONTENT_START + 20,
    accent: colors.stateCaptured,
  },
  {
    title: "Nueva lista disponible",
    body: "Alicante Costa — 19€/mes",
    icon: "📍",
    delay: CONTENT_START + 45,
    accent: colors.stateNew,
  },
  {
    title: "Captación confirmada",
    body: "María García — Madrid Centro",
    icon: "✅",
    delay: CONTENT_START + 70,
    accent: colors.accent,
  },
];

export const NotificationsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const colors = useThemeColors();
  const isVertical = width < height;
  // ── Title animation (centered intro) ──────────────────────────
  const titleIn = interpolate(frame, [TITLE_IN_START, TITLE_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOut = interpolate(
    frame,
    [TITLE_OUT_START, TITLE_OUT_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const titleOpacity = titleIn * (1 - titleOut);
  const titleY = interpolate(titleOut, [0, 1], [0, -40]);

  // ── Content opacity (appears as title fades) ──────────────────
  const contentOpacity = interpolate(
    frame,
    [CONTENT_START, CONTENT_START + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Bell animation (offset by CONTENT_START)
  const bellFrame = Math.max(0, frame - CONTENT_START);
  const bellSpring = spring({
    frame: bellFrame,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const bellScale = interpolate(bellSpring, [0, 1], [0, 1]);
  const bellRotation =
    bellFrame < 30 ? Math.sin(bellFrame * 0.8) * 15 * (1 - bellFrame / 30) : 0;

  // Badge counter animation
  const badgeCount =
    frame < CONTENT_START + 20
      ? 0
      : frame < CONTENT_START + 45
        ? 1
        : frame < CONTENT_START + 70
          ? 2
          : 3;
  const badgeSpring = spring({
    frame: frame - (CONTENT_START + 15),
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  // Phone frame
  const phoneSpring = spring({
    frame: frame - (CONTENT_START + 5),
    fps,
    config: { damping: 15 },
  });
  const phoneScale = interpolate(phoneSpring, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgDarker,
        fontFamily: fonts.family,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* ── Centered intro title ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            color: colors.white,
            textAlign: "center",
            lineHeight: 1.25,
          }}
        >
          Recibe notificaciones
        </div>
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            color: colors.accent,
            textAlign: "center",
            lineHeight: 1.25,
          }}
        >
          en tiempo real
        </div>
      </div>

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accent}15 0%, transparent 70%)`,
          filter: "blur(40px)",
          opacity: contentOpacity,
        }}
      />

      {/* Split layout: bell + notifications */}
      <div
        style={{
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: "center",
          gap: isVertical ? 60 : 140,
          opacity: contentOpacity,
        }}
      >
        {/* Left: Bell icon with badge */}
        <div
          style={{
            position: "relative",
            transform: `scale(${bellScale})`,
          }}
        >
          <div
            style={{
              transform: `rotate(${bellRotation}deg)`,
              transformOrigin: "top center",
            }}
          >
            <svg
              width={200}
              height={200}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          {/* Badge */}
          {badgeCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: colors.stateRejected,
                color: colors.onAccent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                transform: `scale(${badgeSpring})`,
                boxShadow: `0 2px 10px ${colors.stateRejected}66`,
              }}
            >
              {badgeCount}
            </div>
          )}

          {/* Ripple rings */}
          {[0, 1, 2].map((ring) => {
            const ringFrame = frame - ring * 10;
            const ringOpacity =
              ringFrame > 0
                ? interpolate(ringFrame % 60, [0, 30, 60], [0.4, 0.1, 0], {
                    extrapolateRight: "clamp",
                  })
                : 0;
            const ringScale =
              ringFrame > 0
                ? interpolate(ringFrame % 60, [0, 60], [1, 2.5], {
                    extrapolateRight: "clamp",
                  })
                : 0;
            return (
              <div
                key={ring}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  border: `2px solid ${colors.accent}`,
                  opacity: ringOpacity,
                  transform: `translate(-50%, -50%) scale(${ringScale})`,
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>

        {/* Right: Notification cards stacked */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            width: 560,
            transform: `scale(${phoneScale})`,
          }}
        >
          {notifications.map((notif, i) => {
            const notifSpring = spring({
              frame: frame - notif.delay,
              fps,
              config: { damping: 14, stiffness: 80 },
            });
            const notifX = interpolate(notifSpring, [0, 1], [120, 0]);
            const notifOpacity = interpolate(notifSpring, [0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "22px 28px",
                  borderRadius: 16,
                  backgroundColor: colors.bgDark,
                  border: `1px solid ${colors.borderDark}`,
                  transform: `translateX(${notifX}px)`,
                  opacity: notifOpacity,
                  boxShadow: `0 2px 12px rgba(0,0,0,0.3)`,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: `${notif.accent}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    flexShrink: 0,
                  }}
                >
                  {notif.icon}
                </div>
                {/* Text */}
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: colors.white,
                      marginBottom: 4,
                    }}
                  >
                    {notif.title}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      color: colors.textMuted,
                    }}
                  >
                    {notif.body}
                  </div>
                </div>
                {/* Accent dot */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: notif.accent,
                    marginLeft: "auto",
                    flexShrink: 0,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
