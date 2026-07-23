# Analyzer Base Class (Framework)
from abc import ABC, abstractmethod
from typing import List
from eke.contracts.knowledge_package import KnowledgePackage
from eis.model.finding import Finding


class Analyzer(ABC):
    """
    Abstract base class for all EIS analyzers.
    Analyzers only produce Findings — they don't create reports or dashboards!
    """
    analyzer_id: str
    analyzer_name: str
    analyzer_domain: str

    @abstractmethod
    def analyze(self, knowledge_package: KnowledgePackage) -> List[Finding]:
        """
        Analyze the given KnowledgePackage and produce a list of Findings.
        This method must be deterministic!
        """
        pass
