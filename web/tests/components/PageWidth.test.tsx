import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageWidth } from '@/components/PageWidth';

describe('PageWidth', () => {
  it('renders a main element with width markers and collapse expansion enabled by default', () => {
    const { container } = render(<PageWidth width="5xl">Content</PageWidth>);

    const main = container.querySelector('main');

    expect(main).not.toBeNull();
    expect(main).toHaveAttribute('data-page-width', '5xl');
    expect(main).toHaveAttribute('data-expand-on-collapse', 'true');
    expect(main).toHaveClass('mx-auto');
    expect(main).toHaveClass('min-w-0');
    expect(main).toHaveClass('w-full');
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders a div when requested', () => {
    const { container } = render(
      <PageWidth as="div" width="3xl" expandOnCollapse={false}>
        Inner content
      </PageWidth>,
    );

    const div = container.querySelector('div');

    expect(div).not.toBeNull();
    expect(div).toHaveAttribute('data-page-width', '3xl');
    expect(div).toHaveAttribute('data-expand-on-collapse', 'false');
    expect(screen.getByText('Inner content')).toBeInTheDocument();
  });
});
