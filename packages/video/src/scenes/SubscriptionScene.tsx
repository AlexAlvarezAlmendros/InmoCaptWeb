import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { fonts, useThemeColors } from "../theme";

/**
 * Scene 5: Subscription Zones – Carousel grid
 * Duration: 5s (150 frames @ 30fps)
 * Cards in neat rows, each row scrolls as a carousel (alternating L→R / R→L).
 * Hero card appears centered with cursor click at the end.
 */

interface CardData {
  name: string;
  price: string;
}

// 6 rows of cards – each row has 10 cards so the carousel can loop smoothly
const rows: CardData[][] = [
  [
    { name: "Madrid Centro", price: "29€/mes" },
    { name: "Barcelona", price: "29€/mes" },
    { name: "Valencia", price: "24€/mes" },
    { name: "Sevilla", price: "19€/mes" },
    { name: "Málaga", price: "19€/mes" },
    { name: "Bilbao", price: "24€/mes" },
    { name: "Cádiz", price: "19€/mes" },
    { name: "Castellón", price: "19€/mes" },
    { name: "Lleida", price: "19€/mes" },
    { name: "Teruel", price: "14€/mes" },
  ],
  [
    { name: "Zaragoza", price: "19€/mes" },
    { name: "Alicante", price: "24€/mes" },
    { name: "Murcia", price: "19€/mes" },
    { name: "Palma", price: "24€/mes" },
    { name: "Granada", price: "19€/mes" },
    { name: "Valladolid", price: "19€/mes" },
    { name: "Albacete", price: "14€/mes" },
    { name: "Badajoz", price: "14€/mes" },
    { name: "Cáceres", price: "14€/mes" },
    { name: "León", price: "19€/mes" },
  ],
  [
    { name: "Córdoba", price: "19€/mes" },
    { name: "San Sebastián", price: "29€/mes" },
    { name: "Salamanca", price: "19€/mes" },
    { name: "Santander", price: "24€/mes" },
    { name: "Tarragona", price: "19€/mes" },
    { name: "Jaén", price: "14€/mes" },
    { name: "Huesca", price: "14€/mes" },
    { name: "Girona", price: "24€/mes" },
    { name: "Ciudad Real", price: "14€/mes" },
    { name: "Pontevedra", price: "19€/mes" },
  ],
  [
    { name: "Huelva", price: "19€/mes" },
    { name: "Toledo", price: "19€/mes" },
    { name: "Burgos", price: "19€/mes" },
    { name: "Gijón", price: "24€/mes" },
    { name: "Vigo", price: "24€/mes" },
    { name: "Pamplona", price: "24€/mes" },
    { name: "Segovia", price: "14€/mes" },
    { name: "Guadalajara", price: "14€/mes" },
    { name: "Logroño", price: "19€/mes" },
    { name: "Vitoria", price: "19€/mes" },
  ],
  [
    { name: "Elche", price: "19€/mes" },
    { name: "Cartagena", price: "19€/mes" },
    { name: "Marbella", price: "29€/mes" },
    { name: "Jerez", price: "19€/mes" },
    { name: "Oviedo", price: "24€/mes" },
    { name: "Tenerife", price: "24€/mes" },
    { name: "Las Palmas", price: "24€/mes" },
    { name: "Lorca", price: "14€/mes" },
    { name: "Talavera", price: "14€/mes" },
    { name: "Algeciras", price: "14€/mes" },
  ],
  [
    { name: "Ferrol", price: "14€/mes" },
    { name: "Manresa", price: "14€/mes" },
    { name: "Aranjuez", price: "14€/mes" },
    { name: "Mérida", price: "14€/mes" },
    { name: "A Coruña", price: "24€/mes" },
    { name: "Ávila", price: "14€/mes" },
    { name: "Cuenca", price: "14€/mes" },
    { name: "Soria", price: "14€/mes" },
    { name: "Almería", price: "19€/mes" },
    { name: "Zamora", price: "14€/mes" },
  ],
];

const CARD_WIDTH = 290;
const CARD_GAP = 16;
const ROW_HEIGHT = 155;
const ROW_GAP = 14;
const TOP_OFFSET = 30; // cards start near top (no persistent title)
const SCROLL_SPEED = 0.8; // px per frame

// --- Timeline ---
// Phase 1: Title centered & large (frames 0–75)
const TITLE_IN_START = 5;
const TITLE_IN_END = 18;
const TITLE_OUT_START = 64;
const TITLE_OUT_END = 77;
// Phase 2: Carousel rows appear (frames ~70+)
const CAROUSEL_START_FRAME = 70;
// Phase 3: Hero card + click
const HERO_APPEAR_FRAME = 88;
const CURSOR_START_FRAME = 108;
const CLICK_FRAME = 130;

// Hero card
const heroCard = { name: "Madrid Centro", price: "29€/mes" };
const HERO_WIDTH = 360;
const HERO_HEIGHT = 280;

export const SubscriptionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const colors = useThemeColors();
  const isVertical = width < height;
  const centerX = width / 2;
  const centerY = height / 2;
  const topOffset = isVertical ? (height - 6 * (ROW_HEIGHT + ROW_GAP)) / 2 : TOP_OFFSET;

  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // --- Title animation (centered, large, then fades out) ---
  const titleIn = interpolate(frame, [TITLE_IN_START, TITLE_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOut = interpolate(
    frame,
    [TITLE_OUT_START, TITLE_OUT_END],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const titleOpacity = titleIn * titleOut;
  const titleScale = interpolate(
    spring({
      frame: frame - TITLE_IN_START,
      fps,
      config: { damping: 14, stiffness: 80 },
    }),
    [0, 1],
    [0.7, 1],
  );
  const titleSlideY = interpolate(titleOut, [0, 1], [-40, 0]);

  // --- Hero card spring ---
  const heroSpring = spring({
    frame: frame - HERO_APPEAR_FRAME,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const heroScale = interpolate(heroSpring, [0, 1], [0, 1]);
  const heroOpacity = interpolate(heroSpring, [0, 0.2], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Cursor
  const cursorVisible = frame >= CURSOR_START_FRAME;
  const btnCenterX = centerX;
  const btnCenterY = centerY + HERO_HEIGHT / 2 - 50;
  const cursorX = cursorVisible
    ? interpolate(
        frame,
        [CURSOR_START_FRAME, CLICK_FRAME - 5],
        [width + 420, btnCenterX + 30],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 1500;
  const cursorY = cursorVisible
    ? interpolate(
        frame,
        [CURSOR_START_FRAME, CLICK_FRAME - 5],
        [height * 0.6, btnCenterY + 10],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 800;
  const cursorOpacity = cursorVisible
    ? interpolate(frame, [CURSOR_START_FRAME, CURSOR_START_FRAME + 8], [0, 1], {
        extrapolateRight: "clamp",
      })
    : 0;

  // Click
  const isClicked = frame >= CLICK_FRAME;
  const clickBounce = isClicked
    ? spring({
        frame: frame - CLICK_FRAME,
        fps,
        config: { damping: 8, stiffness: 200 },
      })
    : 0;
  const cursorClickScale = isClicked
    ? interpolate(
        frame,
        [CLICK_FRAME, CLICK_FRAME + 4, CLICK_FRAME + 8],
        [1, 0.8, 1],
        {
          extrapolateRight: "clamp",
        },
      )
    : 1;
  const btnTransition = isClicked
    ? interpolate(frame, [CLICK_FRAME, CLICK_FRAME + 15], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const rippleScale = isClicked
    ? interpolate(frame, [CLICK_FRAME, CLICK_FRAME + 20], [0, 4], {
        extrapolateRight: "clamp",
      })
    : 0;
  const rippleOpacity = isClicked
    ? interpolate(frame, [CLICK_FRAME, CLICK_FRAME + 20], [0.5, 0], {
        extrapolateRight: "clamp",
      })
    : 0;

  // Dim background when hero appears
  const bgDim =
    frame >= HERO_APPEAR_FRAME
      ? interpolate(
          frame,
          [HERO_APPEAR_FRAME, HERO_APPEAR_FRAME + 15],
          [1, 0.4],
          {
            extrapolateRight: "clamp",
          },
        )
      : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgDarker,
        fontFamily: fonts.family,
        overflow: "hidden",
        opacity: sceneOpacity,
      }}
    >
      {/* Centered title – appears first, then fades out */}
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
            fontSize: 22,
            color: colors.accent,
            fontWeight: 600,
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Elige tus zonas
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 700,
            color: colors.white,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Suscríbete a las zonas que te interesan
        </div>
      </div>

      {/* Carousel rows – appear after the title fades out */}
      <div style={{ opacity: bgDim, position: "absolute", inset: 0 }}>
        {rows.map((row, rowIndex) => {
          const rowStartFrame = CAROUSEL_START_FRAME + rowIndex * 4;
          // Alternating direction: even rows → right, odd rows → left
          const direction = rowIndex % 2 === 0 ? 1 : -1;
          const scrollOffset =
            Math.max(0, frame - rowStartFrame) * SCROLL_SPEED * direction;

          // Row entrance stagger (delayed)
          const rowSpring = spring({
            frame: frame - rowStartFrame,
            fps,
            config: { damping: 18, stiffness: 90 },
          });
          const rowOpacity = interpolate(rowSpring, [0, 0.3], [0, 1], {
            extrapolateRight: "clamp",
          });
          const rowSlideY = interpolate(rowSpring, [0, 1], [40, 0]);

          // Total width of all cards in a row (duplicated for seamless loop)
          const singleSetWidth = row.length * (CARD_WIDTH + CARD_GAP);

          // We render the cards twice for seamless looping
          const allCards = [...row, ...row];

          return (
            <div
              key={rowIndex}
              style={{
                position: "absolute",
                top: topOffset + rowIndex * (ROW_HEIGHT + ROW_GAP),
                left: 0,
                width: "100%",
                height: ROW_HEIGHT,
                overflow: "hidden",
                opacity: rowOpacity,
                transform: `translateY(${rowSlideY}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: CARD_GAP,
                  transform: `translateX(${(scrollOffset % singleSetWidth) - (direction > 0 ? 0 : singleSetWidth)}px)`,
                  willChange: "transform",
                }}
              >
                {allCards.map((card, cardIndex) => (
                  <div
                    key={cardIndex}
                    style={{
                      flex: "0 0 auto",
                      width: CARD_WIDTH,
                      borderRadius: 14,
                      border: `1.5px solid ${colors.borderDark}`,
                      backgroundColor: `${colors.bgDark}ee`,
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: ROW_HEIGHT - 8,
                      boxSizing: "border-box",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: colors.white,
                          marginBottom: 4,
                        }}
                      >
                        {card.name}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: colors.accent,
                        }}
                      >
                        {card.price}
                      </div>
                    </div>
                    {/* Subscribe button */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "8px 16px",
                        borderRadius: 10,
                        backgroundColor: `${colors.accent}18`,
                        border: `1px solid ${colors.accent}44`,
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.accent,
                      }}
                    >
                      <svg
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={colors.accent}
                        strokeWidth={2.5}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      Suscribirse
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dark overlay when hero appears */}
      {frame >= HERO_APPEAR_FRAME && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: colors.heroDimBg,
            opacity: interpolate(
              frame,
              [HERO_APPEAR_FRAME, HERO_APPEAR_FRAME + 15],
              [0, 0.45],
              { extrapolateRight: "clamp" },
            ),
            zIndex: 30,
          }}
        />
      )}

      {/* Hero card – centered */}
      <div
        style={{
          position: "absolute",
          left: centerX - HERO_WIDTH / 2,
          top: centerY - HERO_HEIGHT / 2 - 20,
          width: HERO_WIDTH,
          zIndex: 40,
          transform: `scale(${heroScale})`,
          opacity: heroOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -30,
            borderRadius: 24,
            backgroundColor: colors.accent,
            opacity: 0.15,
            filter: "blur(30px)",
          }}
        />
        <div
          style={{
            borderRadius: 20,
            border: `2px solid ${colors.accent}`,
            backgroundColor: colors.bgDark,
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: `0 12px 60px ${colors.accent}33`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                color: colors.textMuted,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Zona Premium
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: colors.white,
                marginBottom: 8,
              }}
            >
              {heroCard.name}
            </div>
            <div
              style={{ fontSize: 36, fontWeight: 800, color: colors.accent }}
            >
              {heroCard.price}
            </div>
          </div>
          <div
            style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.5 }}
          >
            87 inmuebles · Actualizada hace 2h
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px 28px",
              borderRadius: 14,
              backgroundColor:
                btnTransition > 0.5 ? colors.stateCaptured : colors.accent,
              color: colors.white,
              fontSize: 20,
              fontWeight: 700,
              boxShadow: `0 4px 20px ${btnTransition > 0.5 ? colors.stateCaptured : colors.accent}55`,
              transform: `scale(${1 + clickBounce * 0.05})`,
            }}
          >
            {btnTransition > 0.5 ? (
              <>
                <svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={3}
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    strokeDasharray={24}
                    strokeDashoffset={interpolate(
                      btnTransition,
                      [0.5, 1],
                      [24, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                    )}
                  />
                </svg>
                ¡Suscrito!
              </>
            ) : (
              "Suscribirse"
            )}
          </div>
        </div>
        {isClicked && (
          <div
            style={{
              position: "absolute",
              left: HERO_WIDTH / 2,
              bottom: 35,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `2px solid ${colors.accent}`,
              transform: `translate(-50%, 50%) scale(${rippleScale})`,
              opacity: rippleOpacity,
            }}
          />
        )}
      </div>

      {/* Mouse cursor */}
      {cursorVisible && (
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: cursorY,
            zIndex: 60,
            opacity: cursorOpacity,
            transform: `scale(${cursorClickScale})`,
            transformOrigin: "top left",
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
