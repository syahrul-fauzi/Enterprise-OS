import type {
  GovernanceClaimsView,
  GovernanceDashboardView,
  GovernanceHealthView,
  GovernanceReadModelKind,
  GovernanceReadModelProvider,
  GovernanceSummaryView,
} from "../../../governance-read-model/implementation/service.js";
import { governanceReadModelService } from "../../../governance-read-model/implementation/service.js";

export class GovernanceReadGatewayService {
  constructor(
    private readonly provider: GovernanceReadModelProvider = governanceReadModelService,
  ) {}

  getSummary(): GovernanceSummaryView {
    return this.provider.materializeSummary();
  }

  getClaims(): GovernanceClaimsView {
    return this.provider.materializeClaims();
  }

  getHealth(): GovernanceHealthView {
    return this.provider.materializeHealth();
  }

  getDashboard(): GovernanceDashboardView {
    return this.provider.materializeDashboard();
  }

  selectReadModel(
    readModel: GovernanceReadModelKind,
  ):
    | GovernanceSummaryView
    | GovernanceClaimsView
    | GovernanceHealthView
    | GovernanceDashboardView {
    switch (readModel) {
      case "summary":
        return this.getSummary();
      case "claims":
        return this.getClaims();
      case "health":
        return this.getHealth();
      case "dashboard":
        return this.getDashboard();
    }
  }
}

export const governanceReadGatewayService = new GovernanceReadGatewayService();
