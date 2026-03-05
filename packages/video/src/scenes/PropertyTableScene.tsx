import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors as staticColors, fonts, useThemeColors } from "../theme";

/**
 * Scene 4: Property Detail – the core feature
 * Duration: 9s (270 frames @ 30fps)
 * Desktop: Header nav + 7-column data table
 * Mobile/Vertical: Header with hamburger + stacked property cards (matching web app)
 * Rows/cards stagger in, state badges change, comment gets typed
 */

interface PropertyRow {
  price: string;
  m2: string;
  beds: string;
  phone: string;
  owner: string;
  state: string;
  stateColor: string;
}

const properties: PropertyRow[] = [
  {
    price: "285.000€",
    m2: "110 m²",
    beds: "3",
    phone: "+34 612 345 678",
    owner: "María García",
    state: "Nuevo",
    stateColor: staticColors.stateNew,
  },
  {
    price: "195.000€",
    m2: "85 m²",
    beds: "2",
    phone: "+34 634 567 890",
    owner: "Carlos López",
    state: "Contactado",
    stateColor: staticColors.stateContacted,
  },
  {
    price: "420.000€",
    m2: "150 m²",
    beds: "4",
    phone: "+34 678 901 234",
    owner: "Ana Martínez",
    state: "Captado",
    stateColor: staticColors.stateCaptured,
  },
  {
    price: "165.000€",
    m2: "65 m²",
    beds: "1",
    phone: "+34 645 678 901",
    owner: "Pedro Ruiz",
    state: "Nuevo",
    stateColor: staticColors.stateNew,
  },
  {
    price: "310.000€",
    m2: "120 m²",
    beds: "3",
    phone: "+34 656 789 012",
    owner: "Laura Fernández",
    state: "Rechazado",
    stateColor: staticColors.stateRejected,
  },
  {
    price: "225.000€",
    m2: "95 m²",
    beds: "2",
    phone: "+34 623 456 789",
    owner: "Jorge Sánchez",
    state: "Nuevo",
    stateColor: staticColors.stateNew,
  },
  {
    price: "380.000€",
    m2: "140 m²",
    beds: "4",
    phone: "+34 667 890 123",
    owner: "Elena Díaz",
    state: "Contactado",
    stateColor: staticColors.stateContacted,
  },
];

// ── Table mode (desktop) ──
const columns = [
  "Precio",
  "M²",
  "Hab.",
  "Teléfono",
  "Propietario",
  "Estado",
  "Comentario",
];
const colWidths = [250, 130, 90, 270, 290, 200, 420];

// ── Timeline constants ──
const ROW_STAGGER = 3;
const WP_FRAMES = [42, 55, 75, 88, 130, 143, 163, 176];
// Desktop cursor waypoints
const WP_X = [1800, 1185, 1185, 1345, 1345, 1185, 1185, 1345];
const WP_Y = [750, 355, 355, 465, 465, 520, 520, 355];
// Action frames
const CLICK_1_FRAME = 58; // Row 0: Nuevo → Contactado
const COMMENT_1_START = 92; // Row 2: start typing
const CLICK_2_FRAME = 146; // Row 3: Nuevo → Captado
const COMMENT_2_START = 180; // Row 0: start typing

// Highlight ranges: [startFrame, fadeInEnd, fadeOutStart, endFrame]
const HIGHLIGHT_RANGES: Array<{
  row: number;
  col: "estado" | "comment";
  color: string;
  range: [number, number, number, number];
}> = [
  {
    row: 0,
    col: "estado",
    color: staticColors.stateContacted,
    range: [53, 56, 70, 73],
  },
  {
    row: 2,
    col: "comment",
    color: staticColors.accent,
    range: [86, 89, 127, 130],
  },
  {
    row: 3,
    col: "estado",
    color: staticColors.stateCaptured,
    range: [141, 144, 158, 161],
  },
  {
    row: 0,
    col: "comment",
    color: staticColors.accent,
    range: [174, 177, 209, 212],
  },
];

// ── Mobile card layout ──
const MOBILE_CARD_H = 250;
const MOBILE_CARD_GAP = 18;
const MOBILE_CARD_PAD = 24;
const MOBILE_HEADER_H = 80;
const MOBILE_TITLE_AREA = 170;
const MOBILE_TOP_PAD = 20;
const MOBILE_CARDS_TOP = MOBILE_HEADER_H + MOBILE_TOP_PAD + MOBILE_TITLE_AREA;

const mobileCardTop = (i: number) =>
  MOBILE_CARDS_TOP + i * (MOBILE_CARD_H + MOBILE_CARD_GAP);

export const PropertyTableScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const colors = useThemeColors();

  const isVertical = width < height;
  const contentPad = isVertical ? 40 : 48;

  // ── Mobile cursor targets ──
  const vBadgeX = width - contentPad - MOBILE_CARD_PAD - 70;
  const vBadgeY = (ci: number) => mobileCardTop(ci) + MOBILE_CARD_PAD + 24;
  const vCommentX = contentPad + MOBILE_CARD_PAD + 100;
  const vCommentY = (ci: number) => mobileCardTop(ci) + MOBILE_CARD_H - 30;
  const V_WP_X = [
    width + 50,
    vBadgeX,
    vBadgeX,
    vCommentX,
    vCommentX,
    vBadgeX,
    vBadgeX,
    vCommentX,
  ];
  const V_WP_Y = [
    height / 2,
    vBadgeY(0),
    vBadgeY(0),
    vCommentY(2),
    vCommentY(2),
    vBadgeY(3),
    vBadgeY(3),
    vCommentY(0),
  ];

  // ── Header ──
  const headerSpring = spring({ frame, fps, config: { damping: 20 } });
  const headerOpacity = interpolate(headerSpring, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── Title ──
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── Table header (desktop) ──
  const tableHeaderSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 15 },
  });

  // ── Mouse cursor ──
  const cursorShow = frame >= 42;
  const wpX = isVertical ? V_WP_X : WP_X;
  const wpY = isVertical ? V_WP_Y : WP_Y;
  const cursorX = interpolate(frame, WP_FRAMES, wpX, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, WP_FRAMES, wpY, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorOpacity = cursorShow
    ? interpolate(frame, [42, 48, 215, 225], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Click scale bounce (two clicks)
  const inClick1 = frame >= CLICK_1_FRAME && frame < CLICK_1_FRAME + 10;
  const inClick2 = frame >= CLICK_2_FRAME && frame < CLICK_2_FRAME + 10;
  const cursorClickScale =
    inClick1 || inClick2
      ? interpolate(
          frame - (inClick1 ? CLICK_1_FRAME : CLICK_2_FRAME),
          [0, 3, 6, 10],
          [1, 0.78, 1.05, 1],
          { extrapolateRight: "clamp" },
        )
      : 1;

  // ── State changes ──
  const state1 =
    frame >= CLICK_1_FRAME
      ? interpolate(frame, [CLICK_1_FRAME, CLICK_1_FRAME + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const state2 =
    frame >= CLICK_2_FRAME
      ? interpolate(frame, [CLICK_2_FRAME, CLICK_2_FRAME + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // ── Comment typing ──
  const comment1Text = "Muy interesado, llamar mañana";
  const comment1Chars = Math.min(
    comment1Text.length,
    Math.max(0, Math.floor((frame - COMMENT_1_START) * 0.8)),
  );
  const comment2Text = "Interesada en visita";
  const comment2Chars = Math.min(
    comment2Text.length,
    Math.max(0, Math.floor((frame - COMMENT_2_START) * 0.8)),
  );

  // Text cursor blink
  const isTyping1 =
    frame >= COMMENT_1_START &&
    frame < COMMENT_1_START + comment1Text.length / 0.8 + 8;
  const isTyping2 =
    frame >= COMMENT_2_START &&
    frame < COMMENT_2_START + comment2Text.length / 0.8 + 8;
  const textCursorBlink =
    (isTyping1 || isTyping2) && Math.floor(frame / 6) % 2 === 0;

  // ── Active cell / card highlight ──
  const getActiveHighlight = (
    rowIndex: number,
    col: "estado" | "comment",
  ): { opacity: number; color: string } | null => {
    for (const h of HIGHLIGHT_RANGES) {
      if (
        h.row === rowIndex &&
        h.col === col &&
        frame >= h.range[0] &&
        frame <= h.range[3]
      ) {
        const op = interpolate(
          frame,
          [h.range[0], h.range[1], h.range[2], h.range[3]],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        return { opacity: op, color: h.color };
      }
    }
    return null;
  };

  // ── Shared state display helpers ──
  const getDisplayState = (rowIndex: number, prop: PropertyRow) => {
    let displayState = prop.state;
    let displayStateColor = prop.stateColor;
    if (rowIndex === 0 && state1 > 0.5) {
      displayState = "Contactado";
      displayStateColor = colors.stateContacted;
    }
    if (rowIndex === 3 && state2 > 0.5) {
      displayState = "Captado";
      displayStateColor = colors.stateCaptured;
    }
    return { displayState, displayStateColor };
  };

  const getCommentContent = (rowIndex: number) => {
    if (rowIndex === 2 && comment1Chars > 0) {
      return {
        text: comment1Text.slice(0, comment1Chars),
        showCursor: isTyping1 && textCursorBlink,
      };
    }
    if (rowIndex === 0 && comment2Chars > 0) {
      return {
        text: comment2Text.slice(0, comment2Chars),
        showCursor: isTyping2 && textCursorBlink,
      };
    }
    return null;
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgDarker,
        fontFamily: fonts.family,
        overflow: "hidden",
      }}
    >
      {/* ── Header Nav Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: isVertical ? MOBILE_HEADER_H : 72,
          padding: `0 ${contentPad}px`,
          backgroundColor: colors.bgDark,
          borderBottom: `1px solid ${colors.borderDark}`,
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            fontSize: isVertical ? 32 : 28,
            fontWeight: 800,
            color: colors.white,
          }}
        >
          Inmo<span style={{ color: colors.accent }}>Capt</span>
        </div>
        {isVertical ? (
          /* Hamburger menu icon (mobile nav pattern) */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 28,
                height: 3,
                backgroundColor: colors.textSecondary,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: 28,
                height: 3,
                backgroundColor: colors.textSecondary,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: 28,
                height: 3,
                backgroundColor: colors.textSecondary,
                borderRadius: 2,
              }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
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

      {/* ── Content Area ── */}
      <div
        style={{
          padding: `${isVertical ? MOBILE_TOP_PAD : 32}px ${contentPad}px 0`,
          height: isVertical ? height - MOBILE_HEADER_H : undefined,
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Breadcrumb + title */}
        <div
          style={{
            opacity: titleOpacity,
            marginBottom: isVertical ? 16 : 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isVertical ? 8 : 10,
              fontSize: isVertical ? 22 : 20,
              color: colors.textMuted,
              marginBottom: isVertical ? 10 : 14,
            }}
          >
            <span>Mis Listas</span>
            <span>›</span>
            <span style={{ color: colors.accent }}>Madrid Centro</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: isVertical ? "flex-start" : "center",
              justifyContent: "space-between",
              flexDirection: isVertical ? "column" : "row",
              gap: isVertical ? 8 : 0,
            }}
          >
            <h2
              style={{
                fontSize: isVertical ? 38 : 40,
                fontWeight: 700,
                color: colors.white,
                margin: 0,
              }}
            >
              Madrid Centro
            </h2>
            <div
              style={{
                display: "flex",
                gap: isVertical ? 8 : 10,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: isVertical ? 18 : 20,
                  color: colors.textMuted,
                  padding: isVertical ? "8px 16px" : "9px 20px",
                  borderRadius: 8,
                  border: `1px solid ${colors.borderDark}`,
                }}
              >
                87 inmuebles
              </div>
              <div
                style={{
                  fontSize: isVertical ? 18 : 20,
                  color: colors.stateCaptured,
                  backgroundColor: `${colors.stateCaptured}15`,
                  padding: isVertical ? "8px 16px" : "9px 20px",
                  borderRadius: 8,
                }}
              >
                +12 nuevos
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            gap: isVertical ? 10 : 10,
            marginBottom: isVertical ? 16 : 20,
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {["Todos", "Nuevo", "Contactado", "Captado", "Rechazado"].map(
            (filter, i) => (
              <div
                key={i}
                style={{
                  padding: isVertical ? "8px 18px" : "9px 22px",
                  borderRadius: 8,
                  fontSize: isVertical ? 18 : 19,
                  fontWeight: 500,
                  backgroundColor:
                    i === 0 ? `${colors.primary}66` : "transparent",
                  color: i === 0 ? colors.white : colors.textMuted,
                  border: i === 0 ? "none" : `1px solid ${colors.borderDark}`,
                }}
              >
                {filter}
              </div>
            ),
          )}
        </div>

        {/* ── Desktop: Data Table ── */}
        {!isVertical && (
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${colors.borderDark}`,
              overflow: "hidden",
              backgroundColor: colors.bgDark,
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${colors.borderDark}`,
                backgroundColor: colors.bgDarker,
                opacity: tableHeaderSpring,
              }}
            >
              {columns.map((col, i) => (
                <div
                  key={i}
                  style={{
                    width: colWidths[i],
                    padding: "18px 22px",
                    fontSize: 17,
                    fontWeight: 600,
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Table Rows */}
            {properties.map((prop, rowIndex) => {
              const rowSpring = spring({
                frame: frame - 12 - rowIndex * ROW_STAGGER,
                fps,
                config: { damping: 18 },
              });
              const rowX = interpolate(rowSpring, [0, 1], [60, 0]);
              const rowOpacity = interpolate(rowSpring, [0, 0.3], [0, 1], {
                extrapolateRight: "clamp",
              });

              const { displayState, displayStateColor } = getDisplayState(
                rowIndex,
                prop,
              );
              const estadoHL = getActiveHighlight(rowIndex, "estado");
              const commentHL = getActiveHighlight(rowIndex, "comment");
              const comment = getCommentContent(rowIndex);
              const isEvenRow = rowIndex % 2 === 0;

              return (
                <div
                  key={rowIndex}
                  style={{
                    display: "flex",
                    borderBottom:
                      rowIndex < properties.length - 1
                        ? `1px solid ${colors.borderDark}33`
                        : "none",
                    backgroundColor: isEvenRow
                      ? "transparent"
                      : `${colors.bgDarker}33`,
                    transform: `translateX(${rowX}px)`,
                    opacity: rowOpacity,
                  }}
                >
                  <div
                    style={{
                      width: colWidths[0],
                      padding: "16px 22px",
                      fontSize: 22,
                      fontWeight: 600,
                      color: colors.primary,
                    }}
                  >
                    {prop.price}
                  </div>
                  <div
                    style={{
                      width: colWidths[1],
                      padding: "16px 22px",
                      fontSize: 22,
                      color: colors.textSecondary,
                    }}
                  >
                    {prop.m2}
                  </div>
                  <div
                    style={{
                      width: colWidths[2],
                      padding: "16px 22px",
                      fontSize: 22,
                      color: colors.textSecondary,
                    }}
                  >
                    {prop.beds}
                  </div>
                  <div
                    style={{
                      width: colWidths[3],
                      padding: "16px 22px",
                      fontSize: 22,
                      color: colors.stateNew,
                    }}
                  >
                    {prop.phone}
                  </div>
                  <div
                    style={{
                      width: colWidths[4],
                      padding: "16px 22px",
                      fontSize: 22,
                      color: colors.textPrimary,
                    }}
                  >
                    {prop.owner}
                  </div>

                  {/* Estado cell with highlight */}
                  <div
                    style={{
                      width: colWidths[5],
                      padding: "16px 22px",
                      position: "relative",
                    }}
                  >
                    {estadoHL && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 4,
                          borderRadius: 10,
                          border: `2px solid ${estadoHL.color}`,
                          backgroundColor: `${estadoHL.color}12`,
                          boxShadow: `0 0 18px ${estadoHL.color}33`,
                          opacity: estadoHL.opacity,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "inline-flex",
                        padding: "6px 18px",
                        borderRadius: 20,
                        fontSize: 18,
                        fontWeight: 600,
                        backgroundColor: `${displayStateColor}22`,
                        color: displayStateColor,
                        transform:
                          (rowIndex === 0 && state1 > 0 && state1 < 1) ||
                          (rowIndex === 3 && state2 > 0 && state2 < 1)
                            ? `scale(${1.2 - Math.abs(0.5 - (rowIndex === 0 ? state1 : state2)) * 0.4})`
                            : "scale(1)",
                      }}
                    >
                      {displayState}
                    </div>
                  </div>

                  {/* Comment cell with highlight */}
                  <div
                    style={{
                      width: colWidths[6],
                      padding: "16px 22px",
                      fontSize: 20,
                      color: colors.textMuted,
                      position: "relative",
                    }}
                  >
                    {commentHL && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 4,
                          borderRadius: 10,
                          border: `2px solid ${commentHL.color}`,
                          backgroundColor: `${commentHL.color}12`,
                          boxShadow: `0 0 18px ${commentHL.color}33`,
                          opacity: commentHL.opacity,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {comment ? (
                      <span>
                        <span style={{ color: colors.textSecondary }}>
                          {comment.text}
                        </span>
                        {comment.showCursor && (
                          <span style={{ color: colors.accent }}>|</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Mobile: Property Cards (matching web app PropertyCard) ── */}
        {isVertical && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: MOBILE_CARD_GAP,
            }}
          >
            {properties.map((prop, rowIndex) => {
              const cardSpring = spring({
                frame: frame - 10 - rowIndex * ROW_STAGGER,
                fps,
                config: { damping: 18 },
              });
              const cardY = interpolate(cardSpring, [0, 1], [40, 0]);
              const cardOpacity = interpolate(cardSpring, [0, 0.3], [0, 1], {
                extrapolateRight: "clamp",
              });

              const { displayState, displayStateColor } = getDisplayState(
                rowIndex,
                prop,
              );
              const estadoHL = getActiveHighlight(rowIndex, "estado");
              const commentHL = getActiveHighlight(rowIndex, "comment");
              const comment = getCommentContent(rowIndex);

              return (
                <div
                  key={rowIndex}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${colors.borderDark}`,
                    backgroundColor: colors.bgDark,
                    padding: MOBILE_CARD_PAD,
                    transform: `translateY(${cardY}px)`,
                    opacity: cardOpacity,
                    position: "relative",
                  }}
                >
                  {/* Row 1: Price + State badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: colors.primary,
                      }}
                    >
                      {prop.price}
                    </div>
                    <div style={{ position: "relative" }}>
                      {estadoHL && (
                        <div
                          style={{
                            position: "absolute",
                            inset: -6,
                            borderRadius: 16,
                            border: `2px solid ${estadoHL.color}`,
                            backgroundColor: `${estadoHL.color}12`,
                            boxShadow: `0 0 18px ${estadoHL.color}33`,
                            opacity: estadoHL.opacity,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <div
                        style={{
                          padding: "6px 18px",
                          borderRadius: 10,
                          fontSize: 18,
                          fontWeight: 600,
                          backgroundColor: `${displayStateColor}22`,
                          color: displayStateColor,
                          border: `1px solid ${displayStateColor}44`,
                          transform:
                            (rowIndex === 0 && state1 > 0 && state1 < 1) ||
                            (rowIndex === 3 && state2 > 0 && state2 < 1)
                              ? `scale(${1.15 - Math.abs(0.5 - (rowIndex === 0 ? state1 : state2)) * 0.3})`
                              : "scale(1)",
                        }}
                      >
                        {displayState}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Details (m², bedrooms) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        color: colors.textSecondary,
                      }}
                    >
                      {prop.m2}
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        color: colors.textMuted,
                      }}
                    >
                      ·
                    </span>
                    <span
                      style={{
                        fontSize: 20,
                        color: colors.textSecondary,
                      }}
                    >
                      {prop.beds} hab.
                    </span>
                  </div>

                  {/* Row 3: Contact (owner + phone) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        color: colors.textPrimary,
                      }}
                    >
                      {prop.owner}
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        color: colors.stateNew,
                      }}
                    >
                      {prop.phone}
                    </span>
                  </div>

                  {/* Separator */}
                  <div
                    style={{
                      height: 1,
                      backgroundColor: colors.borderDark,
                      marginBottom: 14,
                    }}
                  />

                  {/* Row 4: Comment */}
                  <div
                    style={{
                      position: "relative",
                      minHeight: 30,
                    }}
                  >
                    {commentHL && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -8,
                          borderRadius: 10,
                          border: `2px solid ${commentHL.color}`,
                          backgroundColor: `${commentHL.color}12`,
                          boxShadow: `0 0 18px ${commentHL.color}33`,
                          opacity: commentHL.opacity,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {comment ? (
                      <span style={{ fontSize: 20 }}>
                        <span
                          style={{
                            color: colors.textSecondary,
                          }}
                        >
                          {comment.text}
                        </span>
                        {comment.showCursor && (
                          <span style={{ color: colors.accent }}>|</span>
                        )}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 18,
                          color: colors.textMuted,
                        }}
                      >
                        Añadir comentario...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mouse cursor overlay ── */}
      {cursorShow && (
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: cursorY,
            zIndex: 60,
            opacity: cursorOpacity,
            transform: `scale(${cursorClickScale})`,
            transformOrigin: "top left",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          }}
        >
          <svg width={32} height={40} viewBox="0 0 24 30" fill="none">
            <path
              d="M2 2L2 22L8 16L14 28L18 26L12 14L20 14L2 2Z"
              fill={colors.cursorFill}
              stroke={colors.cursorStroke}
              strokeWidth={1.5}
            />
          </svg>
        </div>
      )}
    </AbsoluteFill>
  );
};
