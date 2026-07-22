'use client';

import { cloneElement, Fragment, isValidElement, useId, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  // The trigger the bubble is anchored to (an icon button, an inline value, etc.).
  children: ReactNode;
  widthClass?: string;
  // Bubble anchor relative to the trigger; 'right' keeps the bubble from extending
  // past the trigger's right edge (needed inside horizontal scroll containers).
  align?: 'center' | 'right';
  className?: string;
}

const ALIGN_CLASS: Record<NonNullable<TooltipProps['align']>, string> = {
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
};

export function Tooltip({
  content,
  children,
  widthClass = 'w-56',
  align = 'center',
  className = '',
}: TooltipProps) {
  // Stable, SSR/hydration-safe id so the bubble and the trigger's
  // aria-describedby agree on both the server and the client.
  const tooltipId = useId();

  // Wire the trigger to the bubble so assistive tech reads the tooltip text as
  // the trigger's accessible description. Only a single valid host element can
  // carry the attribute; a bare string or fragment is left untouched and simply
  // keeps the visual hover/focus reveal.
  const trigger =
    isValidElement<{ 'aria-describedby'?: string }>(children) && children.type !== Fragment
      ? cloneElement(children, {
          'aria-describedby': [children.props['aria-describedby'], tooltipId]
            .filter(Boolean)
            .join(' '),
        })
      : children;

  return (
    <span className={`
      group relative inline-flex items-center
      ${className}
    `}>
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        className={`
          pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg border
          border-(--gold)/20 bg-(--navy-900) px-3 py-2 text-center text-xs/snug
          font-normal text-(--cream) not-italic opacity-0
          shadow-[0_12px_24px_rgba(0,0,0,0.28)] transition-opacity
          group-focus-within:opacity-100
          group-hover:opacity-100
          ${ALIGN_CLASS[align]}
          ${widthClass}
        `}
      >
        {content}
      </span>
    </span>
  );
}
