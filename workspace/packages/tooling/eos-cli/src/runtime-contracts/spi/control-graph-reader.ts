import type {
  EnterpriseControlGraphReference,
  EnterpriseControlGraphSnapshot,
} from "../models/graph.js";

export interface ControlGraphReader {
  readGraph(input?: {
    readonly graph_reference?: EnterpriseControlGraphReference | undefined;
  }): Promise<EnterpriseControlGraphSnapshot>;
}
