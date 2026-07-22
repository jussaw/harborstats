import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '@/components/ui/Tooltip';

describe('Tooltip', () => {
  it('renders the trigger and the bubble content with a tooltip role', () => {
    render(
      <Tooltip content="Helpful context">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful context');
  });

  it('gives the trigger an accessible description from the tooltip content', () => {
    render(
      <Tooltip content="Helpful context">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    const bubble = screen.getByRole('tooltip');

    // aria-describedby must point at the bubble so assistive tech reads the
    // tooltip text as the trigger's description.
    expect(trigger).toHaveAttribute('aria-describedby', bubble.id);
    expect(trigger).toHaveAccessibleDescription('Helpful context');
  });

  it('preserves an existing aria-describedby alongside the tooltip id', () => {
    render(
      <div>
        <span id="external-hint">Extra hint</span>
        <Tooltip content="Helpful context">
          <button type="button" aria-describedby="external-hint">
            Trigger
          </button>
        </Tooltip>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    const bubble = screen.getByRole('tooltip');

    // Both the caller-provided description and the tooltip id survive, in order.
    expect(trigger).toHaveAttribute('aria-describedby', `external-hint ${bubble.id}`);
    expect(trigger).toHaveAccessibleDescription('Extra hint Helpful context');
  });

  it('reveals the bubble on hover and keyboard focus via group state classes', () => {
    const { container } = render(
      <Tooltip content="Helpful context">
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    // The reveal is CSS-driven: the wrapper owns the `group` state and the
    // bubble opts into it on both hover and focus-within (so tabbing to the
    // trigger shows the bubble, not just pointer hover).
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('group');

    const bubble = screen.getByRole('tooltip');
    expect(bubble).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
      'group-focus-within:opacity-100',
    );
  });

  it('leaves a non-element trigger untouched while keeping the bubble', () => {
    render(<Tooltip content="Helpful context">Plain text</Tooltip>);

    // A bare string cannot carry aria-describedby; the tooltip still renders so
    // the visual hover/focus reveal is retained.
    expect(screen.getByText('Plain text')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful context');
  });

  it('leaves a fragment trigger untouched while keeping the bubble', () => {
    render(
      <Tooltip content="Helpful context">
        <>
          <button type="button">Trigger</button>
          <span>Additional fragment content</span>
        </>
      </Tooltip>,
    );

    // Fragments cannot carry aria-describedby, so cloning one would emit a React
    // warning and lose the attribute. The host child remains available visually.
    expect(screen.getByRole('button', { name: 'Trigger' })).not.toHaveAttribute('aria-describedby');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful context');
  });

  it('centers the bubble by default and right-aligns it when requested', () => {
    const { rerender } = render(
      <Tooltip content="Centered">
        <span>Value</span>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveClass('left-1/2', 'w-56');

    rerender(
      <Tooltip content="Right" align="right" widthClass="w-48">
        <span>Value</span>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveClass('right-0', 'w-48');
  });
});
