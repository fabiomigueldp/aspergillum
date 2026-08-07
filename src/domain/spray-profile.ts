export interface SprayProfile {
  readonly id: string;
  readonly dropletCount: number;
  readonly pulseCount: number;
  readonly releaseDelayTicks: number;
  readonly actionDurationTicks: number;
  readonly steeringResponsiveness: number;
  readonly maximumTurnDegrees: number;
  readonly forwardOriginOffset: number;
  readonly rightOriginOffset: number;
  readonly verticalOriginOffset: number;
  readonly pitchedOriginOffset: number;
  readonly horizontalSpread: number;
  readonly verticalCenter: number;
  readonly verticalSpread: number;
  readonly minimumSpeed: number;
  readonly speedStep: number;
  readonly speedVariants: number;
  readonly minimumScale: number;
  readonly scaleStep: number;
  readonly scaleVariants: number;
}

export const STANDARD_SPRAY_PROFILE: SprayProfile = Object.freeze({
  id: "standard",
  dropletCount: 36,
  pulseCount: 6,
  releaseDelayTicks: 5,
  actionDurationTicks: 18,
  steeringResponsiveness: 0.8,
  maximumTurnDegrees: 30,
  forwardOriginOffset: 0.55,
  rightOriginOffset: 0.48,
  verticalOriginOffset: -0.15,
  pitchedOriginOffset: 0.2,
  horizontalSpread: 0.26,
  verticalCenter: 0.035,
  verticalSpread: 0.055,
  minimumSpeed: 12.7,
  speedStep: 0.32,
  speedVariants: 5,
  minimumScale: 0.78,
  scaleStep: 0.07,
  scaleVariants: 4,
});

export const PROCESSIONAL_SPRAY_PROFILE: SprayProfile = Object.freeze({
  ...STANDARD_SPRAY_PROFILE,
  id: "processional",
  steeringResponsiveness: 0.72,
  maximumTurnDegrees: 24,
  horizontalSpread: 0.34,
  verticalCenter: 0.03,
  verticalSpread: 0.06,
  minimumSpeed: 10.9,
  speedStep: 0.28,
  minimumScale: 0.82,
  scaleStep: 0.06,
});

export const CONTAINED_SPRAY_PROFILE: SprayProfile = Object.freeze({
  ...STANDARD_SPRAY_PROFILE,
  id: "contained",
  steeringResponsiveness: 0.86,
  horizontalSpread: 0.17,
  verticalCenter: 0.025,
  verticalSpread: 0.04,
  minimumSpeed: 13.35,
  speedStep: 0.3,
  minimumScale: 0.74,
  scaleStep: 0.065,
});

export const SPRAY_PROFILES = Object.freeze([
  STANDARD_SPRAY_PROFILE,
  PROCESSIONAL_SPRAY_PROFILE,
  CONTAINED_SPRAY_PROFILE,
] as const);

export type SprayProfileId = typeof SPRAY_PROFILES[number]["id"];

export function resolveSprayProfile(id: unknown): SprayProfile {
  return SPRAY_PROFILES.find((profile) => profile.id === id) ?? STANDARD_SPRAY_PROFILE;
}
