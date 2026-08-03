export interface KnowledgeNode {
  readonly id: string;
  readonly type: "requirement" | "evidence" | "workflow" | "plan";
  readonly label: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface KnowledgeEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly relation: string;
}

export interface KnowledgeGraphSnapshot {
  readonly nodes: readonly KnowledgeNode[];
  readonly edges: readonly KnowledgeEdge[];
}
