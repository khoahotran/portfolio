import type { ReactNode } from 'react';

/**
 * A page band, and the heading block that usually opens it.
 *
 * Every section on the site currently uses `py-24` and `max-w-5xl`. That evenness is the thing the
 * redesign is about: when every band has the same weight, nothing recedes, so nothing stands out,
 * and the page reads as a list of equally important things - which is exactly how a template reads.
 *
 * `rhythm` is assigned by importance, not by position: `anchor` for the few bands that carry the
 * argument, `quiet` for the ones that are there because the information has to live somewhere.
 */

type Rhythm = 'anchor' | 'standard' | 'quiet';
type Width = 'prose' | 'standard' | 'wide';

const RHYTHM: Record<Rhythm, string> = {
  anchor: 'py-band-anchor',
  standard: 'py-band-standard',
  quiet: 'py-band-quiet',
};

const WIDTH: Record<Width, string> = {
  prose: 'max-w-3xl',
  standard: 'max-w-5xl',
  wide: 'max-w-6xl',
};

interface SectionProps {
  id?: string;
  rhythm?: Rhythm;
  width?: Width;
  className?: string;
  children: ReactNode;
}

export function Section({ id, rhythm = 'standard', width = 'standard', className, children }: SectionProps) {
  return (
    <section id={id} className={[RHYTHM[rhythm], 'px-4 md:px-6', className].filter(Boolean).join(' ')}>
      <div className={`mx-auto ${WIDTH[width]}`}>{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  /**
   * The small coloured line above the heading. Rendered as a <p>, not a heading: it is a label for
   * the section, and putting it in the heading outline would give every band two entries - see the
   * matching note that already exists in About.tsx.
   */
  kicker?: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
}

export function SectionHeader({ kicker, title, lead, align = 'left' }: SectionHeaderProps) {
  const centered = align === 'center';
  return (
    <header className={centered ? 'text-center' : undefined}>
      {kicker && (
        <p className="mb-4 text-micro font-semibold uppercase tracking-widest text-teal-700">{kicker}</p>
      )}
      <h2 className="text-d2 font-bold text-slate-900">{title}</h2>
      {lead && (
        <p className={`mt-4 text-lead text-slate-600 ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{lead}</p>
      )}
    </header>
  );
}

export default Section;
