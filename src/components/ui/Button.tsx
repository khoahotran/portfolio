import { Link } from 'react-router-dom';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * The one button in the design system.
 *
 * Before this, the same filled-pill string - `px-8 py-3 rounded-full bg-inverse text-inverse-fg
 * font-semibold shadow-lg shadow-slate-200 hover:bg-inverse/90 transition-all hover:-translate-y-0.5`
 * - was pasted in 8 places across Hero and PortfolioHome, with the outline variant pasted beside it
 * each time. Changing the hover treatment meant finding all 16.
 *
 * `shadow-lg shadow-slate-200` is deliberately not carried over: tinting a shadow with a palette
 * colour makes it a glow once that ramp inverts in dark mode. The `raised`/`lifted` tokens are
 * neutral and stay shadows in both themes.
 */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-inverse text-inverse-fg shadow-raised hover:bg-inverse/90 hover:shadow-lifted',
  secondary: 'border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-700',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
};

const SIZE: Record<Size, string> = {
  sm: 'px-4 py-2 text-meta',
  md: 'px-6 py-3 text-body',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600';

function classes(variant: Variant, size: Size, className?: string) {
  return [BASE, VARIANT[variant], SIZE[size], className].filter(Boolean).join(' ');
}

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

/** Internal navigation. Uses react-router's Link so it does not reload the app. */
export function ButtonLink({ to, variant = 'primary', size = 'md', className, children }: Common & { to: string }) {
  return (
    <Link to={to} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}

/** Same surface, for an in-page anchor (`#projects`) or an external URL. */
export function ButtonAnchor({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: Common & ComponentPropsWithoutRef<'a'>) {
  return (
    <a href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </a>
  );
}

/** Same surface, for an action that is not navigation. */
function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: Common & ComponentPropsWithoutRef<'button'>) {
  return (
    <button type={type} className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export default Button;
