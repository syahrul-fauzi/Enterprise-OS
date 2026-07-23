# Shared Cross-Engine Protocol
from enum import Enum


class ContractType(Enum):
    KNOWLEDGE_PACKAGE = "knowledge_package"
    MISSION_CONTRACT = "mission_contract"
    AUTHORIZATION_DECISION = "authorization_decision"
    EXECUTION_LEDGER = "execution_ledger"
    EVIDENCE_BUNDLE = "evidence_bundle"
