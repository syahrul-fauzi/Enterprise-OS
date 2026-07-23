# MissionContract Contract
from dataclasses import dataclass, field
from typing import Any, List, Dict


@dataclass
class MissionContract:
    """
    Public contract for MissionContract output from EAEO
    """
    mission_id: str = ""
    strategy: Dict[str, Any] = field(default_factory=dict)
    capability_plans: List[Dict[str, Any]] = field(default_factory=list)
    mission_plans: List[Dict[str, Any]] = field(default_factory=list)
    schedule: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mission_id": self.mission_id,
            "strategy": self.strategy,
            "capability_plans": self.capability_plans,
            "mission_plans": self.mission_plans,
            "schedule": self.schedule,
            "metadata": self.metadata
        }
