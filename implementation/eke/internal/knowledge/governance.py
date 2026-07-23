#!/usr/bin/env python3
"""
Enterprise Knowledge Model — Governance Intelligence Elements
Defines knowledge elements for governance, policies, stewardship, and audit trails.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from .base import KnowledgeElement


class LifecycleState(Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    SUNSET = "sunset"
    RETIRED = "retired"


class RiskCategory(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class StewardRole(Enum):
    BUSINESS_OWNER = "business_owner"
    TECHNICAL_OWNER = "technical_owner"
    SERVICE_OWNER = "service_owner"
    PLATFORM_STEWARD = "platform_steward"


class DecisionRight(Enum):
    APPROVAL = "approval"
    REVIEW = "review"
    CONSULT = "consult"
    INFORM = "inform"


@dataclass
class Stewardship(KnowledgeElement):
    """Stewardship record for a technology asset"""
    asset_id: str = ""
    business_owner: Optional[str] = None
    technical_owner: Optional[str] = None
    service_owner: Optional[str] = None
    platform_steward: Optional[str] = None


@dataclass
class Policy(KnowledgeElement):
    """Policy governing technology assets"""
    policy_id: str = ""
    owner: str = ""
    business_unit: str = ""
    review_frequency: str = ""
    applicable_assets: List[str] = field(default_factory=list)
    applicable_controls: List[str] = field(default_factory=list)
    effective_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    status: str = "active"


@dataclass
class Control(KnowledgeElement):
    """Compliance control mapping to policy and assets"""
    control_id: str = ""
    policy_id: str = ""
    description: str = ""
    framework: str = ""
    evidence_required: bool = True


@dataclass
class DecisionRightEntry:
    """Entry in a decision rights matrix"""
    decision: str = ""
    business: DecisionRight = DecisionRight.INFORM
    architecture: DecisionRight = DecisionRight.INFORM
    platform: DecisionRight = DecisionRight.INFORM
    security: DecisionRight = DecisionRight.INFORM
    cab: DecisionRight = DecisionRight.INFORM


@dataclass
class AuditTrailEntry(KnowledgeElement):
    """Immutable audit trail entry"""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    actor: str = ""
    asset_id: str = ""
    decision: str = ""
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    reason: str = ""
    evidence_ids: List[str] = field(default_factory=list)
    approval_chain: List[str] = field(default_factory=list)
    digital_signature: Optional[str] = None
