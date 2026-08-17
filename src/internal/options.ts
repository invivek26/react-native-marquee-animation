import type { MarqueeInteraction } from '../types';

export const DEFAULT_INTERACTION = {
  deceleration: 0.9985,
  maxFlingVelocity: 3_200,
  pauseOnPress: true,
  resumeDelay: 0,
} as const;

const requireNonnegative = (value: number, name: string): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite nonnegative number.`);
  }
  return value;
};

export const resolveInteraction = (interaction?: MarqueeInteraction) => {
  const deceleration =
    interaction?.deceleration ?? DEFAULT_INTERACTION.deceleration;
  if (
    !Number.isFinite(deceleration) ||
    deceleration <= 0 ||
    deceleration >= 1
  ) {
    throw new RangeError(
      'interaction.deceleration must be greater than 0 and below 1.'
    );
  }

  return {
    deceleration,
    maxFlingVelocity: requireNonnegative(
      interaction?.maxFlingVelocity ?? DEFAULT_INTERACTION.maxFlingVelocity,
      'interaction.maxFlingVelocity'
    ),
    pauseOnPress: interaction?.pauseOnPress ?? DEFAULT_INTERACTION.pauseOnPress,
    resumeDelay: requireNonnegative(
      interaction?.resumeDelay ?? DEFAULT_INTERACTION.resumeDelay,
      'interaction.resumeDelay'
    ),
  };
};

export const resolveSpeed = (speed: number): number =>
  requireNonnegative(speed, 'speed');

export const resolveSpacing = (spacing: number): number =>
  requireNonnegative(spacing, 'spacing');
