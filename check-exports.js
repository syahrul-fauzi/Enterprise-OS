const stateModule = require('./workspace/packages/tooling/eos-cli/dist/state.js');
console.log('Available exports:', Object.keys(stateModule));
console.log('Default export:', stateModule.default ? 'exists' : 'missing');
if (stateModule.default) {
  console.log('Default export keys:', Object.keys(stateModule.default));
}