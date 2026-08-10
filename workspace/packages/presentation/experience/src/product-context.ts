// Import product-specific context dari Product Runtime di root workspace products/*
import { provideLawyersHubContext } from "@products/lawyershub/runtime/product-context-provider";
import { provideServicesIDContext } from "@products/services-id/runtime/product-context-provider";
import { provideILCContext } from "@products/ilc/runtime/product-context-provider";
import { provideAcademicContext } from "@products/academic/runtime/product-context-provider";

export interface ProductContext {
  readonly productId: string | null;
  readonly productDomain: string | null;
  readonly requestHost: string | null;
  readonly productSpecificContext?: unknown;
}

function normalizeHeaderValue(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function readProductContextFromRequest(request: Request): ProductContext {
  const forwardedHost = normalizeHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const host = normalizeHeaderValue(request.headers.get("host"));
  const productId = normalizeHeaderValue(request.headers.get("x-eos-product-id"));
  
  // Load product-specific context dari Product Runtime jika productId cocok
  let productSpecificContext: unknown;
  let productDomain = normalizeHeaderValue(
    request.headers.get("x-eos-product-domain"),
  );

  if (productId === "lawyershub") {
    const lhContext = provideLawyersHubContext();
    productSpecificContext = lhContext;
    productDomain = productDomain ?? lhContext.domain;
  } else if (productId === "services-id") {
    const sidContext = provideServicesIDContext();
    productSpecificContext = sidContext;
    productDomain = productDomain ?? sidContext.domain;
  } else if (productId === "ilc") {
    const ilcContext = provideILCContext();
    productSpecificContext = ilcContext;
    productDomain = productDomain ?? ilcContext.domain;
  } else if (productId === "academic") {
    const acadContext = provideAcademicContext();
    productSpecificContext = acadContext;
    productDomain = productDomain ?? acadContext.domain;
  }

  return {
    productId,
    productDomain,
    requestHost: forwardedHost ?? host,
    productSpecificContext,
  };
}

export function applyProductContextHeaders(input: {
  readonly headers: Headers;
  readonly productContext: ProductContext;
}): Headers {
  const { headers, productContext } = input;

  if (productContext.productId) {
    headers.set("x-eos-product-id", productContext.productId);
  }

  if (productContext.productDomain) {
    headers.set("x-eos-product-domain", productContext.productDomain);
  }

  if (productContext.requestHost) {
    headers.set("x-eos-request-host", productContext.requestHost);
  }

  return headers;
}