import { describe, expect, it } from 'vitest';
import { getChartDialogPosition } from '@/lib/chart-dialog-position';

describe('getChartDialogPosition', () => {
  it('places the dialog to the right when there is room', () => {
    const position = getChartDialogPosition({
      anchorX: 100,
      anchorY: 120,
      width: 480,
      height: 280,
    });

    expect(position.side).toBe('right');
    expect(position.left).toBe(`${(100 / 480) * 100}%`);
    expect(position.top).toBe(`${(120 / 280) * 100}%`);
    expect(position.transform).toBe('translate(18px, -18%)');
  });

  it('flips to the left near the right edge', () => {
    const position = getChartDialogPosition({
      anchorX: 460,
      anchorY: 120,
      width: 480,
      height: 280,
    });

    expect(position.side).toBe('left');
    expect(position.transform).toBe('translate(calc(-100% - 18px), -18%)');
  });

  it('honors a custom gap in the transform', () => {
    const right = getChartDialogPosition({
      anchorX: 50,
      anchorY: 50,
      width: 480,
      height: 280,
      gap: 24,
    });

    expect(right.transform).toBe('translate(24px, -18%)');
  });
});
