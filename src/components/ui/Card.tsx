import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cardClasses, type Padding } from './card-classes';

/**
 * The raised surface used for every panel on the site.
 *
 * `rounded-card border border-slate-200 bg-surface p-6 shadow-raised` appears 58 times verbatim across
 * src/. That is well past the 3+/genuinely-shared bar `.ai/audit-followups.md` item 8 sets for
 * extraction, and unlike the badges that item correctly declined to merge, these are byte-identical
 * rather than merely similar.
 *
 * For a card that is an <a>, <Link> or <article>, use `cardClasses()` directly rather than nesting
 * one of those inside this <div>.
 */
interface CardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className'> {
  padding?: Padding;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

function Card({ padding = 'md', interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div className={cardClasses({ padding, interactive, className })} {...rest}>
      {children}
    </div>
  );
}

export default Card;
