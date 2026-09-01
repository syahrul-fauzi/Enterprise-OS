import { WorkSummaryCards, PriorityWorkList, PerformanceOverview, EOSCompanionCard, NextBestAction } from '@repo/presentation-features';
import { MyRealityActivity } from './components/MyRealityActivity';

export const CAPABILITY_MAP: Record<string, React.ComponentType<any>> = {
  'work-summary-cards': WorkSummaryCards,
  'priority-work-list': PriorityWorkList,
  'performance-overview': PerformanceOverview,
  'companion-group': EOSCompanionCard,
  'activity-feed': MyRealityActivity,
  'next-best-action': NextBestAction,
};