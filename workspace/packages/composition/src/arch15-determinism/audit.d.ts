import type { ComposeInput, ComposeResult } from "../compose";
import type { Arch15ResultEnvelope, Arch15Snapshot, VerifyArch15AFn, VerifyArch15BFn, VerifyArch15Fn } from "./types";
export declare function snapshotFromResult(r: ComposeResult): Arch15Snapshot;
export declare const verifyArch15A: VerifyArch15AFn;
export declare const verifyArch15B: VerifyArch15BFn;
export declare const verifyArch15: VerifyArch15Fn;
export declare function composeWithArch15(input: ComposeInput, options?: {
    readonly arch15?: {
        readonly iterations?: number;
        readonly strict?: boolean;
    };
}): Arch15ResultEnvelope;
//# sourceMappingURL=audit.d.ts.map