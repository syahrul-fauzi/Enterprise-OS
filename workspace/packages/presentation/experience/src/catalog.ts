import { servicesId } from './services-id';
import { lawyershub } from './lawyershub';
import { ilc } from './ilc';
import { academic } from './academic';
import { commsme } from './commsme';
import type { ProductExperience } from '@repo/presentation-entities';

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