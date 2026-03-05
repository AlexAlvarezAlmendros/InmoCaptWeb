import { Composition } from "remotion";
import { PromoVideo } from "./PromoVideo";
import { PromoVideoLight } from "./PromoVideoLight";
import { loadFont } from "@remotion/google-fonts/Inter";

// Load Inter font globally
const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Total duration calculation:
 * Scenes:  120 + 180 + 210 + 270 + 150 + 120 + 150 = 1200 frames
 * Transitions: 18 + 20 + 22 + 18 + 15 + 20 = 113 frames overlap
 * Total: 1200 - 113 = 1087 frames ≈ 36.2s at 30fps
 */
const TOTAL_DURATION = 1387;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoVideoLight"
        component={PromoVideoLight}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoVideoVertical"
        component={PromoVideo}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PromoVideoVerticalLight"
        component={PromoVideoLight}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
