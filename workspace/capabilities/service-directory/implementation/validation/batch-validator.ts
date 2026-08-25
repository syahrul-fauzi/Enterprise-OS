import type { ServiceProviderCategory } from "../contracts/service.contracts.js";

const VALID_SERVICE_CATEGORIES: readonly ServiceProviderCategory[] = [
  "Cloud Services",
  "IT Support",
  "Infrastructure",
  "Cybersecurity",
  "Software Development",
  "Managed Services",
  "Data & Analytics",
];

interface BatchValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBatchItems(
  items: Array<{
    title: string;
    description: string;
    category: ServiceProviderCategory;
    budget?: string;
  }>
): BatchValidationResult {
  const errors: string[] = [];
  const MAX_BATCH_SIZE = 50;
  const MIN_TITLE_LENGTH = 5;
  const MAX_TITLE_LENGTH = 200;
  const MIN_DESCRIPTION_LENGTH = 10;
  const MAX_DESCRIPTION_LENGTH = 2000;

  if (items.length === 0) {
    errors.push("Batch cannot be empty");
    return { valid: false, errors };
  }

  if (items.length > MAX_BATCH_SIZE) {
    errors.push(`Batch size cannot exceed ${MAX_BATCH_SIZE} items`);
  }

  items.forEach((item, index) => {
    // Validate title
    if (!item.title || item.title.trim().length < MIN_TITLE_LENGTH) {
      errors.push(`Item ${index + 1}: Title must be at least ${MIN_TITLE_LENGTH} characters`);
    } else if (item.title.length > MAX_TITLE_LENGTH) {
      errors.push(`Item ${index + 1}: Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
    }

    // Validate description
    if (!item.description || item.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      errors.push(`Item ${index + 1}: Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`);
    } else if (item.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`Item ${index + 1}: Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    // Validate category
    if (!VALID_SERVICE_CATEGORIES.includes(item.category)) {
      errors.push(`Item ${index + 1}: Invalid category "${item.category}"`);
    }

    // Validate budget format if provided (optional)
    if (item.budget && !/^(Rp\s?\d{1,3}(,\d{3})*|\$\d{1,3}(,\d{3})*)/.test(item.budget.trim())) {
      errors.push(`Item ${index + 1}: Budget format is invalid, use "Rp 50.000.000" or "$5,000"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}