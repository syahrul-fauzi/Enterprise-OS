export { ProductCreateForm } from "./product-creation/ProductCreateForm.js";
export type { ProductCreateFormProps } from "./product-creation/ProductCreateForm.js";

// Authentication pages - reusable across all products
export { LoginPage } from "./auth/LoginPage.js";
export { SignupPage } from "./auth/SignupPage.js";

// Core Work state derivation utilities - reusable across all products
export { deriveWorkRealityModel } from "./work/derive-work-state.js";