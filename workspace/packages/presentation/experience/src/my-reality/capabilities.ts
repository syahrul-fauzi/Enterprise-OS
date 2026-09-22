import { WorkSummaryCards, PriorityWorkList, NextBestAction } from '@repo/presentation-features';
import { MyRealityActivity } from './components/MyRealityActivity';
// Temporarily disabled components per W004 prioritization
// import { PerformanceOverview } from '@repo/presentation-features/analytics';
// import { EOSCompanionCard } from '@repo/presentation-features/companion';

export const CAPABILITY_MAP: Record<string, React.ComponentType<any>> = {
  'work-summary-cards': WorkSummaryCards,
  'priority-work-list': PriorityWorkList,
  'activity-feed': MyRealityActivity,
  'next-best-action': NextBestAction,
  // Temporarily disabled components per W004 prioritization
  // 'performance-overview': PerformanceOverview,
  // 'companion-group': EOSCompanionCard,
};