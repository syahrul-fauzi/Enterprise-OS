// @ts-nocheck
import type { BaseProvider, ProviderFactory } from "./contracts/provider-base.contract.js";
import { ComfyUIProvider } from "./comfyui/comfyui-provider.js";
import { AdobeFireflyProvider } from "./adobe/adobe-provider.js";

// State untuk round-robin load balancing (pertahankan di module scope untuk persistensi)
let roundRobinCounter = 0;

// Inisialisasi provider instance yang bisa dieksekusi
const comfyuiProvider = new ComfyUIProvider();
const adobeProvider = new AdobeFireflyProvider();

const registeredProviders: BaseProvider[] = [
  {
    id: "comfyui-prod-01",
    providerType: "comfyui",
    name: "ComfyUI Production Node",
    ratePerAsset: 0.5,
    isAvailable: true,
    instance: comfyuiProvider
  },
  {
    id: "adobe-firefly-01",
    providerType: "adobe",
    name: "Adobe Firefly Enterprise",
    ratePerAsset: 1.2,
    isAvailable: true,
    instance: adobeProvider
  },
  {
    id: "adobe-firefly-02",
    providerType: "adobe-firefly",
    name: "Adobe Firefly Enterprise (dedicated)",
    ratePerAsset: 1.2,
    isAvailable: true,
    instance: adobeProvider
  }
];

export const getProviderFactory: () => ProviderFactory = () => ({
  getProvider: (id: string) => registeredProviders.find(p => p.id === id),
  listAvailableProviders: () => registeredProviders.filter(p => p.isAvailable),
  selectOptimalProvider: (specification: any) => {
    // Load balancing round-robin untuk provider yang tersedia (SMACE-009 requirement)
    const available = registeredProviders.filter(p => p.isAvailable);
    if (available.length === 0) return undefined;
    
    // Pilih provider secara bergantian, reset counter jika sudah mencapai akhir daftar
    const selectedProvider = available[roundRobinCounter % available.length];
    roundRobinCounter++;
    return selectedProvider;
  },
  // Fallback logic: jika provider utama gagal, pilih provider lain yang tersedia
  selectFallbackProvider: (excludeType: string) => {
    const available = registeredProviders.filter(p => 
      p.isAvailable && p.providerType !== excludeType
    );
    return available.sort((a, b) => a.ratePerAsset - b.ratePerAsset)[0];
  },
  // Implementasi selectProvider yang dipanggil di execution-workflow.ts untuk kompatibilitas
  selectProvider: (requiredType: string, productType: string) => {
    const available = registeredProviders.filter(p => 
      p.isAvailable && p.providerType === requiredType
    );
    // Jika tidak ada provider yang cocok dengan requiredType, return yang termurah secara umum
    if (available.length === 0) {
      return registeredProviders.filter(p => p.isAvailable).sort((a, b) => a.ratePerAsset - b.ratePerAsset)[0];
    }
    return available.sort((a, b) => a.ratePerAsset - b.ratePerAsset)[0];
  }
});