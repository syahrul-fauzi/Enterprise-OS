/**
 * R9 - My Reality Surface Barrel File
 * Single entry point for all My Reality canonical presentation blocks.
 *
 * ARCHITECTURAL BOUNDARY:
 * presentation-only — NO runtime, NO connectors, NO API calls, NO business logic.
 * All props are presentation-ready models via the canonical MyRealityModel contract.
 */



export { MyRealityLayout } from "./components/MyRealityLayout";
export { MyRealityHeader } from "./components/MyRealityHeader";
export { MyRealityPriority } from "./components/MyRealityPriority";
export { MyRealityWorkList } from "./components/MyRealityWorkList";
export { MyRealityCompanion } from "./components/MyRealityCompanion";
export { MyRealityActivity } from "./components/MyRealityActivity";
export { MyRealityWorkListItem } from "./components/MyRealityWorkListItem";
export { NextAction, NextActionList } from "./components/NextAction";
export { MyRealityExperience } from "./MyRealityExperience";

// All types from canonical contract
export type {
  MyRealityModel,
  RealityWorkItem,
  PlatformReference,
  CompanionInsight,
  RealityActivity,
  PlatformDistribution,
  MyRealityLayoutProps,
  MyRealityHeaderProps,
  MyRealityPriorityProps,
  MyRealityWorkListProps,
  MyRealityWorkListItemProps,
  MyRealityCompanionProps,
  MyRealityActivityProps,
  MyRealityExperienceProps,
} from "./contracts/my-reality.contracts";