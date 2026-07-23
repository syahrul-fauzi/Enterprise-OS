# Enterprise Intelligence Package ABI v1
from dataclasses import dataclass, field
from typing import Any, List, Dict, Optional
from datetime import datetime
from eke.contracts.knowledge_package import KnowledgePackage
from eis.model.finding import Finding
from eis.model.insight import Insight
from eis.model.recommendation import Recommendation
from eis.model.decision_option import DecisionOption
from eis.model.portfolio_item import PortfolioItem
from eis.model.roadmap_item import RoadmapItem
from shared.serialization.canonical import compute_artifact_hash


@dataclass
class IntelligenceManifest:
    """Manifest of all intelligence artifacts in a package."""
    package_id: str
    version: str
    findings: List[Finding] = field(default_factory=list)
    insights: List[Insight] = field(default_factory=list)
    recommendations: List[Recommendation] = field(default_factory=list)
    decision_options: List[DecisionOption] = field(default_factory=list)
    portfolio_items: List[PortfolioItem] = field(default_factory=list)
    roadmap_items: List[RoadmapItem] = field(default_factory=list)


@dataclass
class EnterpriseIntelligencePackage:
    """
    Frozen Enterprise Intelligence Package ABI v1 contract (input: KnowledgePackage, output: Intelligence).
    """
    knowledge_package: KnowledgePackage
    manifest: IntelligenceManifest
    generated_at: datetime = field(default_factory=datetime.utcnow)
    content_hash: Optional[str] = None

    def compute_content_hash(self) -> str:
        """Compute canonical hash of entire intelligence package content."""
        temp_data = self.to_dict()
        temp_data.pop("content_hash", None)
        return compute_artifact_hash(temp_data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to canonical dict representation."""
        return {
            "knowledge_package": self.knowledge_package.to_dict(),
            "manifest": {
                "package_id": self.manifest.package_id,
                "version": self.manifest.version,
                "findings": [f.to_dict() for f in self.manifest.findings],
                "insights": [i.to_dict() for i in self.manifest.insights],
                "recommendations": [r.to_dict() for r in self.manifest.recommendations],
                "decision_options": [d.to_dict() for d in self.manifest.decision_options],
                "portfolio_items": [p.to_dict() for p in self.manifest.portfolio_items],
                "roadmap_items": [r.to_dict() for r in self.manifest.roadmap_items]
            },
            "generated_at": self.generated_at.isoformat(),
            "content_hash": self.content_hash
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EnterpriseIntelligencePackage":
        """Load EnterpriseIntelligencePackage from dict."""
        kp = KnowledgePackage.from_dict(data["knowledge_package"])
        manifest = IntelligenceManifest(
            package_id=data["manifest"]["package_id"],
            version=data["manifest"]["version"],
            findings=[Finding.from_dict(f) for f in data["manifest"]["findings"]],
            insights=[Insight.from_dict(i) for i in data["manifest"]["insights"]],
            recommendations=[Recommendation.from_dict(r) for r in data["manifest"]["recommendations"]],
            decision_options=[DecisionOption.from_dict(d) for d in data["manifest"]["decision_options"]],
            portfolio_items=[PortfolioItem.from_dict(p) for p in data["manifest"]["portfolio_items"]],
            roadmap_items=[RoadmapItem.from_dict(r) for r in data["manifest"]["roadmap_items"]]
        )
        return cls(
            knowledge_package=kp,
            manifest=manifest,
            generated_at=datetime.fromisoformat(data["generated_at"]),
            content_hash=data.get("content_hash")
        )
