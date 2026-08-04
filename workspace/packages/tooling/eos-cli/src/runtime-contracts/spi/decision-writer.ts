import type { DecisionSynthesis } from "../models/decision.js";
import type { DecisionLedgerEntry } from "../models/ledger.js";

export interface DecisionWriter {
  append(input: DecisionSynthesis): Promise<DecisionLedgerEntry>;
}
