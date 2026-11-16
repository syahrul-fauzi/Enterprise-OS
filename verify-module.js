const { writeStateFile, getOwnershipMap } = require('./workspace/packages/tooling/eos-cli/dist/state.js');
console.log('Module loaded successfully!');
const map = getOwnershipMap();
console.log('Ownership map entries:', Object.keys(map).length);
console.log('Sample entries:', Object.entries(map).slice(0, 3));