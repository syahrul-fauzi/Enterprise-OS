import CommsMeFirstLightPage from "@products/commsme/presentation/CommsMeFirstLightPage.js";

export const metadata = {
  title: "COMMSME · Pendamping Hukum UMKM",
  description: "Pendamping hukum terpadu untuk pelaku UMKM Indonesia: kontrak, legalitas usaha, SOP karyawan, konsultasi, dan hubungkan dengan profesional.",
};

// ROUTE ADAPTER ONLY: Next.js apps/web specific route → product-local presentation component (TIDAK ada shared branch COM-specific di presentation widgets).
export default function CommsMeRoute() {
  return <CommsMeFirstLightPage />;
}