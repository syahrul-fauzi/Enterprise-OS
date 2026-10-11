import { adjustInventoryFromWork, aiSuggestInventoryAdjustment } from "./inventory-adjustment.commands.js";

export const inventoryAdjustmentCommands = {
  "retail-inventory.inventory-adjustment.create": adjustInventoryFromWork,
  "retail-inventory.inventory-adjustment.ai-suggest": aiSuggestInventoryAdjustment,
};