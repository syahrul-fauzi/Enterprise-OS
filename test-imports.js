import * as contracts from './workspace/packages/contracts-core/dist/index.js';
console.log("🔍 Available exports from @repo/contracts-core:", Object.keys(contracts));
console.log("✅ createDeviceId exists?", typeof contracts.createDeviceId === 'function');
