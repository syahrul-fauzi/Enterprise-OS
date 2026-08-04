import type {
  DecisionLedgerEntry,
  DecisionLedgerReference,
  DecisionReplayRequest,
} from "../models/ledger.js";

export interface LedgerReader {
  getEntry(
    reference: DecisionLedgerReference,
  ): Promise<DecisionLedgerEntry | null>;
  getLatest(input: {
    readonly decision_id: string;
  }): Promise<DecisionLedgerEntry | null>;
  replay(input: DecisionReplayRequest): Promise<DecisionLedgerEntry>;
}
