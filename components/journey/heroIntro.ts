/** Shared constants for the hero entrance, used by the GSAP timeline and the WebGL impact effects. */

/** Fired on every landing. `strength` 1 = first impact, smaller for the bounces. */
export const IMPACT_EVENT = 'vv:box-impact';
export type ImpactDetail = { strength: number };

/** The box lands facing the viewer, tipped forward slightly so the top edge reads as a 3D box. */
export const LAND_TILT = .16;

/** Landing height as a fraction of viewport height (0 = centre): slightly below centre; lower still on mobile, under the headline. */
export const landY = (small: boolean) => (small ? -.13 : -.07);

/** Half the box's edge in local units (BoxGeometry is 1.9). */
export const BOX_HALF = .95;

/** Same per-breakpoint scale factor CardboardBox applies on top of motion.scale. */
export const boxScaleFactor = (small: boolean) => (small ? .75 : 1.1);

export function emitImpact(strength: number) {
  window.dispatchEvent(new CustomEvent<ImpactDetail>(IMPACT_EVENT, { detail: { strength } }));
}
