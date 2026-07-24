#!/usr/bin/env python3
"""
EAEO Mission Contract (Output Artifact)
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import hashlib
import uuid
from shared.engine.manifest import EngineMetadata
from shared.serialization.canonical import canonical_json


@dataclass
class Task:
    """
    A single step or task within an objective
    """
    name: str
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Objective:
    """
    An objective within a mission
    """
    name: str
    objective_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    tasks: List[Task] = field(default_factory=list)
    success_criteria: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Mission:
    """
    A mission contains objectives
    """
    name: str
    mission_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    objectives: List[Objective] = field(default_factory=list)
    priority: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MissionContractMetadata:
    """
    Metadata for a mission contract
    """
    name: str
    contract_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    version: str = "1.0.0"
    description: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)
    engine_metadata: EngineMetadata = field(
        default_factory=lambda: EngineMetadata(
            engine_id="eaeo",
            engine_name="Enterprise Architecture and Execution Orchestration",
            engine_version="1.0.0"
        )
    )


@dataclass
class MissionContract:
    """
    Main MissionContract artifact produced by EAEO
    """
    metadata: MissionContractMetadata
    missions: List[Mission] = field(default_factory=list)
    diagnostics_ref: Optional[str] = None
    evidence_ref: Optional[str] = None
    content_hash: Optional[str] = None

    def compute_content_hash(self) -> str:
        """
        Compute a stable, canonical hash for this mission contract
        """
        temp_data = {
            "metadata": {
                "name": self.metadata.name,
                "contract_id": self.metadata.contract_id,
                "version": self.metadata.version,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "missions": [
                {
                    "name": mission.name,
                    "mission_id": mission.mission_id,
                    "description": mission.description,
                    "objectives": [
                        {
                            "name": obj.name,
                            "objective_id": obj.objective_id,
                            "description": obj.description,
                            "tasks": [
                                {
                                    "name": task.name,
                                    "task_id": task.task_id,
                                    "description": task.description,
                                    "dependencies": task.dependencies,
                                    "config": task.config
                                } for task in obj.tasks
                            ],
                            "success_criteria": obj.success_criteria
                        } for obj in mission.objectives
                    ],
                    "priority": mission.priority
                } for mission in self.missions
            ]
        }
        return hashlib.sha256(canonical_json(temp_data).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to canonical dict for serialization
        """
        return {
            "metadata": {
                "name": self.metadata.name,
                "contract_id": self.metadata.contract_id,
                "version": self.metadata.version,
                "description": self.metadata.description,
                "generated_at": self.metadata.generated_at.isoformat(),
                "engine_metadata": self.metadata.engine_metadata.to_dict()
            },
            "missions": [
                {
                    "name": mission.name,
                    "mission_id": mission.mission_id,
                    "description": mission.description,
                    "objectives": [
                        {
                            "name": obj.name,
                            "objective_id": obj.objective_id,
                            "description": obj.description,
                            "tasks": [
                                {
                                    "name": task.name,
                                    "task_id": task.task_id,
                                    "description": task.description,
                                    "dependencies": task.dependencies,
                                    "config": task.config
                                } for task in obj.tasks
                            ],
                            "success_criteria": obj.success_criteria
                        } for obj in mission.objectives
                    ],
                    "priority": mission.priority
                } for mission in self.missions
            ],
            "diagnostics_ref": self.diagnostics_ref,
            "evidence_ref": self.evidence_ref,
            "content_hash": self.content_hash
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MissionContract":
        """
        Load from dict
        """
        engine_meta = EngineMetadata.from_dict(
            data["metadata"]["engine_metadata"]
        ) if "engine_metadata" in data["metadata"] else None

        metadata = MissionContractMetadata(
            name=data["metadata"]["name"],
            contract_id=data["metadata"].get("contract_id"),
            version=data["metadata"].get("version", "1.0.0"),
            description=data["metadata"].get("description"),
            generated_at=datetime.fromisoformat(data["metadata"]["generated_at"]),
            engine_metadata=engine_meta
        )

        missions = []
        for mission_data in data.get("missions", []):
            objectives = []
            for obj_data in mission_data.get("objectives", []):
                tasks = [
                    Task(
                        name=t["name"],
                        task_id=t.get("task_id"),
                        description=t.get("description"),
                        dependencies=t.get("dependencies", []),
                        config=t.get("config", {})
                    ) for t in obj_data.get("tasks", [])
                ]
                objectives.append(
                    Objective(
                        name=obj_data["name"],
                        objective_id=obj_data.get("objective_id"),
                        description=obj_data.get("description"),
                        tasks=tasks,
                        success_criteria=obj_data.get("success_criteria", [])
                    )
                )
            missions.append(
                Mission(
                    name=mission_data["name"],
                    mission_id=mission_data.get("mission_id"),
                    description=mission_data.get("description"),
                    objectives=objectives,
                    priority=mission_data.get("priority", 0)
                )
            )

        return cls(
            metadata=metadata,
            missions=missions,
            diagnostics_ref=data.get("diagnostics_ref"),
            evidence_ref=data.get("evidence_ref"),
            content_hash=data.get("content_hash")
        )
