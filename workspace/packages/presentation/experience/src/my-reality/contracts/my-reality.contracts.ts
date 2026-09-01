/**
 * Canonical presentation contracts for My Reality experience
 * All work from any platform (GitHub, Zendesk, Shopee, Internal) must map to these interfaces
 */

// Block prop types for type-safe consumption
export interface MyRealityLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export interface MyRealityHeaderProps {
  greeting: string;
  subheading: string;
  companionStatus: "active" | "idle" | "processing";
  onViewFullReality?: () => void;
}

export interface MyRealityPriorityProps {
  model: MyRealityModel;
  onNextActionExecute?: (actionId: string, workId?: string) => void | Promise<void>;
}

export interface MyRealityWorkListProps {
  items: RealityWorkItem[];
  title?: string;
  maxItems?: number;
  onWorkClick?: (workId: string) => void;
}

export interface MyRealityWorkListItemProps {
  work: RealityWorkItem;
  onNextActionExecute?: (actionId: string, workId?: string) => void | Promise<void>;
}

export interface MyRealityCompanionProps {
  insights: CompanionInsight[];
  onInsightAction?: (insightId: string) => void;
  companionStatus?: "active" | "idle" | "processing";
}

export interface MyRealityActivityProps {
  items: RealityActivity[];
  maxItems?: number;
  title?: string;
  isLive?: boolean;
}

export interface MyRealityExperienceProps {
  initialModel: MyRealityModel;
  actions?: React.ReactNode;
  onInsightAction?: (insightId: string) => void;
  onViewFullReality?: () => void;
  onNextActionExecute?: (actionId: string, workId?: string) => void | Promise<void>;
  showActivity?: boolean;
  showWorkList?: boolean;
}

export interface PlatformReference {
  id: string;
  source: string;
  name: string;
  bgColor: string;
  textColor: string;
  icon: string;
  domainType: string;
  specialization: string;
  platformMetadata?: Record<string, unknown>;
}

export interface Bottleneck {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  label: string;
  description?: string;
}

export interface WorkNextAction {
  label: string;
  actionId: string;
  description?: string;
}

export interface RealityWorkItem {
  workId: string;
  id: string;
  title: string;
  description?: string;
  state: "open" | "in_progress" | "blocked" | "completed";
  priority: "now" | "next" | "watching";
  platform?: PlatformReference;
  bottleneck?: Bottleneck;
  nextAction?: WorkNextAction;
  href: string;
  createdAt: string;
  updatedAt: string;
  actorId: string;
  workspaceId: string;
  tenantId: string;
  evidence?: Array<{ id: string; type: string; createdAt: string }>;
}

export interface CompanionInsight {
  id: string;
  type: "warning" | "info" | "success" | "critical";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string;
  actionLabel?: string;
  actionId?: string;
  workId?: string;
  relatedWorkId?: string;
}

export interface RealityActivity {
  id: string;
  type: "completed" | "note" | "status" | "created" | "assigned" | "evidence" | "communication" | "external";
  title: string;
  description?: string;
  platform?: PlatformReference;
  relatedWorkId?: string;
  createdAt: string;
  actor?: { id: string; name: string };
  actorId?: string;
  actorRole?: string;
  timestamp: string;
}

export interface PlatformDistribution {
  platformId: string;
  platformName: string;
  count: number;
  percentage: number;
  // Legacy compatibility for existing read model code
  platform?: string;
}

export interface MyRealityModel {
  actor: {
    id: string;
    displayName: string;
    email?: string;
    avatar?: string;
  };

  summary: {
    totalWork: number;
    inProgress: number;
    bottlenecked: number;
    completed: number;
    // Fase 1: AI Agent metrics untuk realtime dashboard
    aiProcessing?: number;
    aiCompleted?: number;
    aiFailed?: number;
    aiTotal?: number;
  };

  priority: {
    now: RealityWorkItem[];
    next: RealityWorkItem[];
    watching: RealityWorkItem[];
  };

  companion: {
    active: boolean;
    summary: string;
    insights: CompanionInsight[];
  };

  activity: RealityActivity[];

  platformDistribution: PlatformDistribution[];
}