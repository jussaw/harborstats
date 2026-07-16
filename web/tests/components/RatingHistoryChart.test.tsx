import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RatingHistoryChart } from '@/components/RatingHistoryChart';
import { PlayerTier } from '@/lib/player-tier';
import type { PlayerRating, RatingHistoryPoint } from '@/lib/rating';

function point(overrides: Partial<RatingHistoryPoint> & { sequence: number }): RatingHistoryPoint {
  return {
    gameId: overrides.sequence + 1,
    playedAt: `2026-03-0${overrides.sequence + 1}T00:00:00.000Z`,
    rating: 1500,
    change: 0,
    participated: true,
    ...overrides,
  };
}

function player(
  playerId: number,
  name: string,
  history: RatingHistoryPoint[],
): PlayerRating {
  return {
    playerId,
    name,
    tier: PlayerTier.Standard,
    rating: history.at(-1)?.rating ?? 1500,
    displayRating: Math.round(history.at(-1)?.rating ?? 1500),
    peakRating: Math.max(1500, ...history.map((entry) => entry.rating)),
    lastGameChange: history.at(-1)?.change ?? 0,
    gamesPlayed: history.filter((entry) => entry.participated).length,
    provisional: history.filter((entry) => entry.participated).length < 5,
    history,
  };
}

// Ada leads at game 1 (index 1); Bea trails. Two games so both draw a line.
const ada = player(1, 'Ada', [
  point({ sequence: 0, rating: 1500 }),
  point({ sequence: 1, rating: 1512, change: 12 }),
]);
const bea = player(2, 'Bea', [
  point({ sequence: 0, rating: 1500 }),
  point({ sequence: 1, rating: 1488, change: -12 }),
]);

function chartGroup() {
  return screen.getByRole('group', { name: 'Multiplayer Elo rating history' });
}

describe('RatingHistoryChart', () => {
  it('renders an accessible empty state', () => {
    render(<RatingHistoryChart players={[]} rosterPlayerIds={[]} />);
    expect(screen.getByText('No rated multiplayer games yet.')).toBeInTheDocument();
  });

  it('drives a crosshair with the keyboard and ranks the tooltip by rating', () => {
    const { container } = render(
      <RatingHistoryChart players={[ada, bea]} rosterPlayerIds={[1, 2]} />,
    );

    fireEvent.keyDown(chartGroup(), { key: 'End' });

    expect(container.querySelector('[data-testid="rating-crosshair"]')).toBeInTheDocument();
    const dialog = container.querySelector('[data-side]') as HTMLElement;
    expect(within(dialog).getByText('Mar 2')).toBeInTheDocument();
    const names = [...dialog.querySelectorAll('li')].map((item) => item.textContent);
    expect(names[0]).toContain('Ada');
    expect(names[0]).toContain('1512');
    expect(names[1]).toContain('Bea');
    expect(names[1]).toContain('1488');
    expect(screen.getByText('Mar 2 — Ada 1512, Bea 1488')).toBeInTheDocument();
  });

  it('jumps with Home/End and clears with Escape', () => {
    const { container } = render(
      <RatingHistoryChart players={[ada, bea]} rosterPlayerIds={[1, 2]} />,
    );
    const group = chartGroup();

    fireEvent.keyDown(group, { key: 'Home' });
    expect(within(container.querySelector('[data-side]') as HTMLElement).getByText('Mar 1')).toBeInTheDocument();

    fireEvent.keyDown(group, { key: 'End' });
    expect(within(container.querySelector('[data-side]') as HTMLElement).getByText('Mar 2')).toBeInTheDocument();

    fireEvent.keyDown(group, { key: 'Escape' });
    expect(container.querySelector('[data-testid="rating-crosshair"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-side]')).not.toBeInTheDocument();
  });

  it('toggles a line off and on from the legend', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RatingHistoryChart players={[ada, bea]} rosterPlayerIds={[1, 2]} />,
    );

    expect(container.querySelectorAll('polyline')).toHaveLength(2);
    const beaButton = screen.getByRole('button', { name: 'Bea' });

    await user.click(beaButton);
    expect(beaButton).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelectorAll('polyline')).toHaveLength(1);

    // Hidden player drops out of the crosshair tooltip.
    fireEvent.keyDown(chartGroup(), { key: 'End' });
    const dialog = container.querySelector('[data-side]') as HTMLElement;
    expect(within(dialog).queryByText(/Bea/)).not.toBeInTheDocument();
    expect(within(dialog).getByText('Ada')).toBeInTheDocument();

    await user.click(beaButton);
    expect(beaButton).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('dims the other lines when a legend entry is hovered', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RatingHistoryChart players={[ada, bea]} rosterPlayerIds={[1, 2]} />,
    );

    const groups = [...container.querySelectorAll('svg > g')].filter((node) =>
      node.querySelector('polyline'),
    );
    expect(groups).toHaveLength(2);

    await user.hover(screen.getByRole('button', { name: 'Ada' }));

    const opacities = groups.map((node) => (node as HTMLElement).style.opacity);
    expect(opacities).toContain('1');
    expect(opacities).toContain('0.25');

    await user.unhover(screen.getByRole('button', { name: 'Ada' }));
    expect(groups.every((node) => (node as HTMLElement).style.opacity === '1')).toBe(true);
  });

  it('colors lines by full-roster ordinal, not the filtered cohort', () => {
    const seven = player(7, 'Gus', [point({ sequence: 0 }), point({ sequence: 1, rating: 1510 })]);
    const nine = player(9, 'Ivy', [point({ sequence: 0 }), point({ sequence: 1, rating: 1490 })]);
    const { container } = render(
      <RatingHistoryChart players={[seven, nine]} rosterPlayerIds={[3, 7, 9]} />,
    );

    const strokes = [...container.querySelectorAll('polyline')].map((line) =>
      line.getAttribute('stroke'),
    );
    // Roster [3,7,9] -> ordinals 0,1,2 -> player 7 = color-2, player 9 = color-3.
    expect(strokes).toContain('var(--player-color-2)');
    expect(strokes).toContain('var(--player-color-3)');
  });

  it('renders provisional games dashed and established games solid', () => {
    const history = Array.from({ length: 7 }, (_, index) =>
      point({ sequence: index, rating: 1500 + index }),
    );
    const veteran = player(1, 'Ada', history);
    const { container } = render(
      <RatingHistoryChart players={[veteran]} rosterPlayerIds={[1]} />,
    );

    const lines = [...container.querySelectorAll('polyline')];
    expect(lines).toHaveLength(2);
    const dashed = lines.filter((line) => line.getAttribute('stroke-dasharray'));
    const solid = lines.filter((line) => !line.getAttribute('stroke-dasharray'));
    expect(dashed).toHaveLength(1);
    expect(solid).toHaveLength(1);
    // The single-series profile chart shows no legend.
    expect(screen.queryByLabelText('Rating history legend')).not.toBeInTheDocument();
  });

  it('draws a 1500 baseline and first/last date labels', () => {
    const { container } = render(
      <RatingHistoryChart players={[ada, bea]} rosterPlayerIds={[1, 2]} />,
    );

    expect(container.querySelector('[data-testid="rating-baseline"]')).toBeInTheDocument();
    expect(screen.getByText('Mar 1')).toBeInTheDocument();
    expect(screen.getByText('Mar 2')).toBeInTheDocument();
  });

  it('places the crosshair on pointer move and clears it on an outside tap', () => {
    const { container } = render(
      <RatingHistoryChart players={[ada, bea]} rosterPlayerIds={[1, 2]} />,
    );
    const svg = chartGroup() as unknown as SVGSVGElement;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 480, height: 280 }) as DOMRect;

    fireEvent.pointerMove(svg, { clientX: 480, clientY: 100 });
    expect(container.querySelector('[data-testid="rating-crosshair"]')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(container.querySelector('[data-testid="rating-crosshair"]')).not.toBeInTheDocument();
  });
});
