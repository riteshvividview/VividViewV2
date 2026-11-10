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
};

export const initialJourney: JourneyState = {
  progress: 0, hero: 0, x: .23, y: .015, scale: 1.12,
  rx: .3, ry: -.55, rz: -.05, open: 0, dark: 0, glow: 0, head: 0, headDissolve: 0,
  liquidX: -.08, liquidY: -.23, liquidScale: 1, liquidTurn: -.15,
};

export type JourneyRef = { current: JourneyState };
