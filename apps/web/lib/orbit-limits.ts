/**
 * Chat VRM orbit window. Phi is the polar angle from straight up (+Y).
 * Theta is not clamped here — yaw stays a full 360°.
 *
 * camera.lookAt uses world +Y as up, so phi must stay off 0 and π or the
 * view rolls upside-down. 0.25 rad (~14°) of clearance keeps that stable.
 *
 * Previous window: PHI_MIN 1.08 (~28° above eye level), PHI_MAX 2.55 (~56° below).
 * This window: PHI_MIN 0.25 (~76° above — crown / near-top), PHI_MAX π−0.25
 * (~76° below — further toward the feet).
 */
export const PHI_MIN = 0.25;
export const PHI_MAX = Math.PI - 0.25;

/** Resting polar angle (CompanionCanvas HOME). Must sit inside the window. */
export const PHI_HOME = 1.53;
