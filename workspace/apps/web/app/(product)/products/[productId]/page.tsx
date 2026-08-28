"use server";

import type { Metadata } from "next";
import { RootLandingPage } from "@repo/presentation-widgets";
import { getProductDomainConfig } from "@repo/presentation-config/product-domains";

interface ProductPreviewPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
  readonly searchParams?:
    | Promise<Record<string, string | undefined>>
    | Record<string, string | undefined>;
}

function normalizeSearchParams(
  sp: ProductPreviewPageProps["searchParams"],
): Promise<Record<string, string | undefined>> | undefined {
  if (!sp) return undefined;
  if (sp instanceof Promise) return sp;
  return Promise.resolve(sp);
}

// Product-specific theme configurations
const productThemes: Record<string, {
  primaryColor: string;
  cardBgClass: string;
  cardTextClass: string;
  buttonBgClass: string;
  buttonTextClass: string;
  buttonHoverBgClass: string;
}> = {
  lawyershub: {
    primaryColor: "blue",
    cardBgClass: "bg-blue-600",
    cardTextClass: "text-blue-100",
    buttonBgClass: "bg-white",
    buttonTextClass: "text-blue-600",
    buttonHoverBgClass: "hover:bg-slate-100"
  },
  "services-id": {
    primaryColor: "emerald",
    cardBgClass: "bg-emerald-600",
    cardTextClass: "text-emerald-100",
    buttonBgClass: "bg-white",
    buttonTextClass: "text-emerald-600",
    buttonHoverBgClass: "hover:bg-slate-100"
  },
  ilc: {
    primaryColor: "rose",
    cardBgClass: "bg-rose-600",
    cardTextClass: "text-rose-100",
    buttonBgClass: "bg-white",
    buttonTextClass: "text-rose-600",
    buttonHoverBgClass: "hover:bg-slate-100"
  },
  academic: {
    primaryColor: "amber",
    cardBgClass: "bg-amber-600",
    cardTextClass: "text-amber-100",
    buttonBgClass: "bg-white",
    buttonTextClass: "text-amber-600",
    buttonHoverBgClass: "hover:bg-slate-100"
  },
  commsme: {
    primaryColor: "violet",
    cardBgClass: "bg-violet-600",
    cardTextClass: "text-violet-100",
    buttonBgClass: "bg-white",
    buttonTextClass: "text-violet-600",
    buttonHoverBgClass: "hover:bg-slate-100"
  }
};

export async function generateMetadata(
  input: ProductPreviewPageProps,
): Promise<Metadata> {
  const params = await input.params;
  const product = getProductDomainConfig(params.productId);
  return {
    title: product ? `${product.displayName} - Enterprise OS` : "Produk Tidak Ditemukan",
    description: product ? `Platform manajemen workspace untuk ${product.displayName}` : "Halaman produk tidak ditemukan",
  };
}

export default async function ProductPreviewPage(
  input: ProductPreviewPageProps,
) {
  const params = await input.params;
  const searchParams = await input.searchParams;
  const product = getProductDomainConfig(params.productId);
  
  // Defensive Guard sesuai panduan: Mencegah crash total jika produk tidak ditemukan
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Domain Tidak Ditemukan</h1>
          <p className="text-sm text-slate-600 mb-6">
            Konfigurasi SSoT untuk domain <code className="bg-slate-200 px-2 py-1 rounded font-mono">{params?.productId}</code> belum terdaftar di sistem EOS.
          </p>
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  const productHeroTitles: Record<string, string> = {
    lawyershub: "Pekerjaan hukum Anda, terhubung sempurna.",
    "services-id": "Layanan Anda, terorganisir dengan baik.",
    ilc: "Diskusi hukum Indonesia, terpadu dalam satu platform.",
    academic: "Pengetahuan akademik, terdistribusi secara luas.",
    commsme: "Proyek bisnis Anda, terlaksana tepat waktu.",
  };

  const productHeroSubtitles: Record<string, string> = {
    lawyershub: "Platform hukum enterprise yang menghubungkan semua pihak dalam satu Workspace yang aman. Satu tempat untuk mengelola seluruh kasus, kontrak, dan persyaratan legal.",
    "services-id": "Platform manajemen layanan enterprise yang mengintegrasikan semua permintaan layanan dalam satu ekosistem terpadu.",
    ilc: "Komunitas pengacara Indonesia untuk berdiskusi, berkolaborasi, dan berbagi pengetahuan hukum secara profesional.",
    academic: "Platform komunitas akademik untuk berbagi artikel, penelitian, dan pengetahuan dengan seluruh dunia.",
    commsme: "Platform manajemen proyek untuk bisnis kecil dan menengah yang mengintegrasikan semua aspek operasional dalam satu tempat.",
  };

  // PURE ROUTE ADAPTER ONLY: All business logic resides in canonical presentation widget
  // Get product-specific theme dengan fallback ke blue jika tidak ditemukan
  const theme = productThemes[params.productId.toLowerCase()] || productThemes.lawyershub;
  
  return (
    <RootLandingPage 
      brandName={product.displayName}
      heroTitle={productHeroTitles[product.productId] || "Pekerjaan Anda, terhubung sempurna."}
      heroSubtitle={productHeroSubtitles[product.productId] || "Platform enterprise yang menghubungkan semua pihak dalam satu Workspace yang aman."}
      searchParams={normalizeSearchParams(searchParams)}
      theme={theme}
    />
  );
}