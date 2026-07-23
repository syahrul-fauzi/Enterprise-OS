"""
Register all enterprise intelligence services in the global registry.
"""
import logging
from eis.services.registry import service_registry
from eis.services.governance import GovernanceService
from eis.services.risk import RiskService
from eis.services.planning import PlanningService
from eis.services.lifecycle import LifecycleService
from eis.services.compliance import ComplianceService

logger = logging.getLogger(__name__)


def register_all_services() -> None:
    """Register all services in the global service registry."""
    services = [
        GovernanceService(),
        RiskService(),
        PlanningService(),
        LifecycleService(),
        ComplianceService(),
    ]

    for service in services:
        service_registry.register(service)
        logger.info(f"Registered service: {service.metadata.id} ({service.metadata.name})")
