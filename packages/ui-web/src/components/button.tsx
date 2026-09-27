import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../lib/utils';

/** Semantic button style recipe shared by native and slotted controls. */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-accent px-5 py-3 text-white shadow-[0_12px_30px_rgb(23_84_66_/_18%)] hover:bg-accent-strong',
        quiet:
          'border border-border bg-surface px-4 py-2 text-ink hover:bg-surface-strong',
      },
      size: {
        default: 'min-h-11',
        compact: 'min-h-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Delegates rendering and merged props to the single child instead of
     * creating a `<button>`. The caller then owns correct interactive semantics,
     * accessible naming, keyboard behavior, and disabled-state handling.
     */
    asChild?: boolean;
  };

/**
 * Renders the shared web button primitive with visible focus and minimum
 * target sizing.
 *
 * Native-button attributes and semantics apply by default. With `asChild`, the
 * component supplies styling and behavior through Radix Slot while the child
 * owns its final element semantics.
 */
function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={cn(buttonVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
