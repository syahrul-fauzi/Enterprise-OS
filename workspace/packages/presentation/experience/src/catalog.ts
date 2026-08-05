import { servicesId } from './services-id';
import { lawyershub } from './lawyershub';
import { ilc } from './ilc';
import { academic } from './academic';
import type { ProductExperience } from '@repo/presentation-types';

export const catalog: Record<string, ProductExperience> = {
  'services-id': servicesId,
  'lawyershub': lawyershub,
  'ilc': ilc,
  'academic': academic,
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