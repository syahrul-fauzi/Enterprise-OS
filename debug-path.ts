import { join, resolve } from "node:path";
const __dirname = "/root/Enterprise-OS/workspace/packages/tooling/eos-cli/src/gate/commands";
const EOS_ROOT = resolve(__dirname, "../../../../../../..");
const GATE_C_DIR = join(EOS_ROOT, "enterprise", "science", "gate-c");
console.log("__dirname:", __dirname);
console.log("EOS_ROOT:", EOS_ROOT);
console.log("GATE_C_DIR:", GATE_C_DIR);
console.log("Expected experiment path:", join(GATE_C_DIR, "specification", "experiments", "manufacturing", "SAGE-CANVAS-001-NEG-003.experiment.yaml"));