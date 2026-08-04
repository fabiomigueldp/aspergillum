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
  releaseDelayTicks: 4,
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
