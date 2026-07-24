from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class MatterStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CLIENT = "waiting_client"
    COMPLETED = "completed"
    CLOSED = "closed"


class TaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Task(BaseModel):
    id: str
    matter_id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.OPEN
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class User(BaseModel):
    id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User's email address")
    name: str = Field(..., description="User's full name")
    created_at: datetime = Field(default_factory=datetime.now)


class Workspace(BaseModel):
    id: str = Field(..., description="Unique workspace identifier")
    name: str = Field(..., description="Workspace name")
    owner_id: str = Field(..., description="Owner user ID")
    created_at: datetime = Field(default_factory=datetime.now)


class Client(BaseModel):
    id: str = Field(..., description="Unique client identifier")
    name: str = Field(..., description="Client name")
    email: Optional[str] = Field(None, description="Client email")
    workspace_id: str = Field(..., description="Associated workspace ID")
    created_at: datetime = Field(default_factory=datetime.now)


class Matter(BaseModel):
    id: str = Field(..., description="Unique matter identifier")
    title: str = Field(..., description="Matter title")
    description: Optional[str] = Field(None, description="Matter description")
    status: MatterStatus = Field(default=MatterStatus.DRAFT, description="Matter status")
    client_id: str = Field(..., description="Associated client ID")
    workspace_id: str = Field(..., description="Associated workspace ID")
    assigned_lawyer_id: Optional[str] = Field(None, description="Assigned lawyer ID")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AuditAction(str, Enum):
    STATUS_CHANGED = "status_changed"
    ASSIGNED = "assigned"
    DOCUMENT_ADDED = "document_added"
    ACTIVITY_ADDED = "activity_added"
    MATTER_CREATED = "matter_created"


class AuditEvent(BaseModel):
    id: str = Field(..., description="Unique audit event identifier")
    entity: str = Field(..., description="Entity type (e.g., Matter)")
    entity_id: str = Field(..., description="Entity ID")
    action: AuditAction = Field(..., description="Audit action")
    from_value: Optional[str] = Field(None, description="Previous value")
    to_value: Optional[str] = Field(None, description="New value")
    actor_id: str = Field(..., description="Actor (user) ID")
    workspace_id: str = Field(..., description="Associated workspace ID")
    timestamp: datetime = Field(default_factory=datetime.now)


class Activity(BaseModel):
    id: str = Field(..., description="Unique activity identifier")
    matter_id: str = Field(..., description="Associated matter ID")
    description: str = Field(..., description="Activity description")
    created_at: datetime = Field(default_factory=datetime.now)


class Document(BaseModel):
    id: str = Field(..., description="Unique document identifier")
    filename: str = Field(..., description="Document filename")
    content_type: str = Field(..., description="Document content type")
    matter_id: str = Field(..., description="Associated matter ID")
    workspace_id: str = Field(..., description="Associated workspace ID")
    created_at: datetime = Field(default_factory=datetime.now)


class AuthRequest(BaseModel):
    email: str = Field(..., description="User email for authentication")
    password: Optional[str] = Field(None, description="Password (for demo purposes, not used in MVP)")
