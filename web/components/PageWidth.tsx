import type { HTMLAttributes } from 'react';

type PageWidthSize = '2xl' | '3xl' | '5xl' | '6xl' | '7xl';
type PageWidthElement = 'main' | 'div';

interface Props extends HTMLAttributes<HTMLElement> {
  as?: PageWidthElement;
  width: PageWidthSize;
  expandOnCollapse?: boolean;
}

export function PageWidth({
  as = 'main',
  width,
  expandOnCollapse = true,
  className,
  children,
  ...props
}: Props) {
  const Component = as;

  return (
    <Component
      data-expand-on-collapse={String(expandOnCollapse)}
      data-page-width={width}
      className={['mx-auto min-w-0 w-full', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Component>
  );
}

PageWidth.defaultProps = {
  as: 'main',
  expandOnCollapse: true,
};
