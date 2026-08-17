export const CONTENT_WIDTH_EPSILON = 0.25;

export const resolveMeasuredContentWidth = (
  currentWidth: number,
  measuredWidth: number
): number => {
  if (!Number.isFinite(measuredWidth) || measuredWidth < 0) {
    return currentWidth;
  }

  return Math.abs(currentWidth - measuredWidth) > CONTENT_WIDTH_EPSILON
    ? measuredWidth
    : currentWidth;
};
