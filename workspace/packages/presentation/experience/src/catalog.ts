import { servicesId } from './services-id.js';
import { lawyershub } from './lawyershub.js';
import { ilc } from './ilc.js';
import { academic } from './academic.js';
import { commsme } from './commsme.js';
import type { ProductExperience } from '@repo/presentation-types';

export const catalog: Record<string, ProductExperience> = {
  'services-id': servicesId,
  'lawyershub': lawyershub,
  'ilc': ilc,
  'academic': academic,
  'commsme': commsme,
};

export function getProductExperience(slug: string): ProductExperience | undefined {
  return catalog[slug];
}

export function getAllProductSlugs(): string[] {
  return Object.keys(catalog);
}

export function getAllProductExperiences(): ProductExperience[] {
  return Object.values(catalog);
}

export function readProductRouteMetadata(
  productId: string,
  displayName: string,
  page: string,
): { title: string; description: string } {
  const experience = catalog[productId];
  if (!experience) {
    return {
      title: `${displayName} - ${page}`,
      description: `${displayName} delivery page`
    };
  }
  return {
    title: `${displayName} - ${page}`,
    description: experience.narrative.summary
  };
}