export interface CommsMeProductContext {
  readonly productId: "commsme";
  readonly displayName: "COMMSME — Pendamping Hukum UMKM (FIRST LIGHT)";
  readonly domain: "umkm.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#b45309";
    readonly accentColor: "#f59e0b";
    readonly logoPath: "/products/commsme/assets/logo-umkm.svg";
  };
  readonly features: {
    readonly daftarBadanHukum: boolean;
    readonly perizinanUsaha: boolean;
    readonly kontrakVendorNda: boolean;
    readonly konsultasiHarian: boolean;
    readonly sopHrLegal: boolean;
    readonly vendorDirectory: boolean;
  };
  readonly substrateCapabilitiesUsed: readonly ["legal-case", "service-directory", "legal-community"];
  readonly noteNewCapabilities: 0;
}

export function provideCommsMeContext(): CommsMeProductContext {
  return {
    productId: "commsme",
    displayName: "COMMSME — Pendamping Hukum UMKM (FIRST LIGHT)",
    domain: "umkm.enterprise-os.com",
    branding: {
      primaryColor: "#b45309",
      accentColor: "#f59e0b",
      logoPath: "/products/commsme/assets/logo-umkm.svg",
    },
    features: {
      daftarBadanHukum: true,
      perizinanUsaha: true,
      kontrakVendorNda: true,
      konsultasiHarian: true,
      sopHrLegal: true,
      vendorDirectory: true,
    },
    substrateCapabilitiesUsed: ["legal-case", "service-directory", "legal-community"],
    noteNewCapabilities: 0,
  };
}