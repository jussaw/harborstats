export type ChartDialogSide = 'left' | 'right';

export interface ChartDialogPosition {
  side: ChartDialogSide;
  left: string;
  top: string;
  transform: string;
}

/**
 * Places a floating tooltip beside an anchor point inside an SVG chart.
 *
 * Coordinates are in the chart's viewBox units; `left`/`top` come back as
 * percentages so the tooltip tracks the anchor as the responsive SVG scales.
 * The tooltip flips to the left of the anchor when there is not enough room on
 * the right, so it never spills past the chart edge.
 */
export function getChartDialogPosition({
  anchorX,
  anchorY,
  width,
  height,
  dialogWidth = 240,
  gap = 18,
  padding = 16,
}: {
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  dialogWidth?: number;
  gap?: number;
  padding?: number;
}): ChartDialogPosition {
  const rightSpace = width - anchorX - padding;
  const leftSpace = anchorX - padding;
  const side: ChartDialogSide =
    rightSpace >= dialogWidth + gap || rightSpace >= leftSpace ? 'right' : 'left';

  return {
    side,
    left: `${(anchorX / width) * 100}%`,
    top: `${(anchorY / height) * 100}%`,
    transform:
      side === 'right' ? `translate(${gap}px, -18%)` : `translate(calc(-100% - ${gap}px), -18%)`,
  };
}
