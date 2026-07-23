# Insight Synthesizer
from typing import List
from eis.model.finding import Finding
from eis.model.insight import Insight
import uuid


class InsightSynthesizer:
    """
    Synthesizes Insights from a list of Findings.
    This is a deterministic process!
    """
    def synthesize(self, findings: List[Finding]) -> List[Insight]:
        insights = []
        # For now, simple implementation: group findings by severity and create insights
        severity_groups: dict[str, List[Finding]] = {}
        for finding in findings:
            if finding.severity not in severity_groups:
                severity_groups[finding.severity] = []
            severity_groups[finding.severity].append(finding)

        for severity, group in severity_groups.items():
            insight = Insight(
                insight_id=f"insight-{str(uuid.uuid4())}",
                title=f"{len(group)} {severity} findings identified",
                description=f"Found {len(group)} {severity} findings from analyzers: {', '.join(set(f.source_analyzer for f in group))}",
                source_findings=[f.finding_id for f in group],
                source_analyzer="insight-synthesizer"
            )
            insights.append(insight)

        return insights
