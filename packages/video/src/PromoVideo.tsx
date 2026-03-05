import React from "react";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { PropertyTableScene } from "./scenes/PropertyTableScene";
import { SubscriptionScene } from "./scenes/SubscriptionScene";
import { NotificationsScene } from "./scenes/NotificationsScene";
import { CTAScene } from "./scenes/CTAScene";

/**
 * Main Promo Video Composition
 *
 * Scene flow with seamless transitions:
 * 1. Hook (4s)       → slide right
 * 2. Problem (6s)    → wipe
 * 3. Dashboard (7s)  → slide left
 * 4. Table (9s)      → fade
 * 5. Subscriptions (5s) → slide bottom
 * 6. Notifications (4s) → fade
 * 7. CTA (5s)
 *
 * Total: ~40s at 30fps
 * Transitions overlap by 15-20 frames each
 */
export const PromoVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Hook / Logo Intro – 4s */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <HookScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      {/* Scene 2: Problem → Solution – 6s */}
      <TransitionSeries.Sequence durationInFrames={180}>
        <ProblemScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      {/* Scene 3: Dashboard Cards – 7s */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <DashboardScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: 22,
        })}
      />

      {/* Scene 4: Property Table – 9s */}
      <TransitionSeries.Sequence durationInFrames={270}>
        <PropertyTableScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 18 })}
      />

      {/* Scene 5: Subscription Zones – 7s */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <SubscriptionScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 22 })}
      />

      {/* Scene 6: Notifications – 7s */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <NotificationsScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      {/* Scene 7: CTA Finale – 10s */}
      <TransitionSeries.Sequence durationInFrames={300}>
        <CTAScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
