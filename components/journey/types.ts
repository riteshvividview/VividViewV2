export type JourneyState = {
  progress: number;
  hero: number;
  x: number;
  y: number;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
  open: number;
  dark: number;
  glow: number;
  head: number;
  headDissolve: number;
  liquidX: number;
  liquidY: number;
  liquidScale: number;
  liquidTurn: number;
  /* Hero entrance (drop, bounce, hop). Offsets are added to the scroll pose and all return to neutral,
     so the scroll choreography is untouched once the entrance ends. */
  introX: number;
  introY: number;
  introRx: number;
  introRy: number;
  introRz: number;
  /** Squash and stretch: vertical scale and the matching horizontal bulge, pivoting on the box's base. */
  squash: number;
  bulge: number;
  /** 0..1 gate for velocity-based motion blur on the foreground box. */
  blur: number;
  /** 0..1 strength of the contact shadow on the landing ground. */
  shadow: number;
  /** 0..1 multiplier on the liquid's size while it swells in after the impact. */
  liquidIntro: number;
};

export const initialJourney: JourneyState = {
  progress: 0, hero: 0, x: .23, y: .015, scale: 1.12,
  rx: .3, ry: -.55, rz: -.05, open: 0, dark: 0, glow: 0, head: 0, headDissolve: 0,
  liquidX: -.08, liquidY: -.23, liquidScale: 1, liquidTurn: -.15,
  introX: 0, introY: 0, introRx: 0, introRy: 0, introRz: 0, squash: 1, bulge: 1, blur: 0, shadow: 0, liquidIntro: 1,
};

export type JourneyRef = { current: JourneyState };
