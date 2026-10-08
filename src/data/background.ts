import type { LucideIcon } from 'lucide-react';
import { Award, Building2, GraduationCap, MapPin } from 'lucide-react';
import { certificationsData, contactData, educationData, experienceData } from './portfolioData';

/**
 * The facts the homepage shows on its way to /about.
 *
 * Kept as a list rather than as markup so adding, removing or reordering a fact is a one-line edit
 * here instead of a layout change in the component. Every value is derived from portfolioData, not
 * retyped, so a fact cannot drift from the page it is pointing at.
 */
export interface BackgroundFact {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

export const backgroundFacts: BackgroundFact[] = [
  {
    icon: Building2,
    label: 'Currently',
    value: experienceData[0].company,
    detail: `${experienceData[0].title} · ${experienceData[0].period}`,
  },
  {
    icon: GraduationCap,
    label: 'Studying',
    value: educationData.items[1].degree,
    detail: `HCMUT · ${educationData.items[1].period}`,
  },
  {
    icon: Award,
    label: 'Also holds',
    value: educationData.items[0].degree,
    detail: `HCMUT · ${educationData.items[0].period}`,
  },
  {
    icon: MapPin,
    label: 'Based in',
    value: contactData.location,
    detail: `${certificationsData.length} certification${certificationsData.length === 1 ? '' : 's'} · open to backend roles`,
  },
];
