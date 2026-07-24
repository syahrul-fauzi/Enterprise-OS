# Base Engine Runtime Interface
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, Any
from shared.engine.context import EngineContext
from shared.engine.result import EngineResult
from shared.engine.manifest import ExecutionManifest, EngineMetadata
from shared.engine.evidence import BaseEngineEvidence


InputT = TypeVar('InputT')
OutputT = TypeVar('OutputT')
EvidenceT = TypeVar('EvidenceT', bound=BaseEngineEvidence)


class EngineRuntime(ABC, Generic[InputT, OutputT, EvidenceT]):
    """
    Base Interface for all EOS Engine Runtimes!
    Every engine must implement this interface!
    """
    @abstractmethod
    def get_engine_metadata(self) -> EngineMetadata:
        """Get static metadata about this engine!"""
        pass

    @abstractmethod
    def execute(
        self,
        input_artifact: InputT,
        context: Optional[EngineContext] = None,
        **kwargs: Any
    ) -> EngineResult[OutputT, EvidenceT]:
        pass

    @abstractmethod
    def replay(self, manifest: ExecutionManifest, **kwargs: Any) -> EngineResult[OutputT, EvidenceT]:
        pass
