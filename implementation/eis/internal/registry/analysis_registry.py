# Analysis Registry
from typing import Dict, List, Optional
from collections import defaultdict
from eis.internal.analyzers.base import Analyzer


class AnalysisRegistry:
    """
    Registry for Enterprise Intelligence Analyzers.
    Provides metadata-driven indexes for finding analyzers by ID, domain, etc.
    """
    def __init__(self):
        self._analyzers: Dict[str, Analyzer] = {}
        self._by_domain: Dict[str, List[Analyzer]] = defaultdict(list)

    def register(self, analyzer: Analyzer) -> None:
        """Register an analyzer with the registry."""
        self._analyzers[analyzer.analyzer_id] = analyzer
        self._by_domain[analyzer.analyzer_domain].append(analyzer)

    def get(self, analyzer_id: str) -> Optional[Analyzer]:
        """Get an analyzer by its ID."""
        return self._analyzers.get(analyzer_id)

    def all(self) -> List[Analyzer]:
        """Get all registered analyzers."""
        return list(self._analyzers.values())

    def by_domain(self, domain: str) -> List[Analyzer]:
        """Get all analyzers for a given domain."""
        return self._by_domain[domain]


# Global singleton instance
analysis_registry = AnalysisRegistry()
