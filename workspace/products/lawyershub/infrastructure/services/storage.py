from typing import Dict, List, Optional
from uuid import uuid4
from datetime import datetime
from domain.models.models import (
    User, Workspace, Client, Matter, Document, Activity,
    MatterStatus, AuditEvent, AuditAction, Task, TaskStatus
)
from application.services.matter_workflow import MatterWorkflowService


class InMemoryStorage:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.workspaces: Dict[str, Workspace] = {}
        self.clients: Dict[str, Client] = {}
        self.matters: Dict[str, Matter] = {}
        self.documents: Dict[str, Document] = {}
        self.activities: Dict[str, Activity] = {}
        self.audit_events: Dict[str, AuditEvent] = {}
        self.tasks: Dict[str, Task] = {}
        
        # Initialize with a demo user for quick testing
        demo_user = User(
            id=str(uuid4()),
            email="demo@lawyershub.io",
            name="Demo Lawyer"
        )
        self.users[demo_user.id] = demo_user
        self._demo_user = demo_user

    @property
    def demo_user(self) -> User:
        return self._demo_user

    # User methods
    def get_user(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email == email:
                return user
        return None

    def create_user(self, email: str, name: str) -> User:
        user_id = str(uuid4())
        user = User(id=user_id, email=email, name=name)
        self.users[user_id] = user
        return user

    # Workspace methods
    def get_workspace(self, workspace_id: str) -> Optional[Workspace]:
        return self.workspaces.get(workspace_id)
    
    def get_workspaces_by_owner(self, owner_id: str) -> List[Workspace]:
        return [w for w in self.workspaces.values() if w.owner_id == owner_id]

    def create_workspace(self, name: str, owner_id: str) -> Workspace:
        workspace_id = str(uuid4())
        workspace = Workspace(id=workspace_id, name=name, owner_id=owner_id)
        self.workspaces[workspace_id] = workspace
        return workspace

    # Client methods
    def get_client(self, client_id: str) -> Optional[Client]:
        return self.clients.get(client_id)
    
    def get_clients_by_workspace(self, workspace_id: str) -> List[Client]:
        return [c for c in self.clients.values() if c.workspace_id == workspace_id]

    def create_client(self, name: str, workspace_id: str, email: Optional[str] = None) -> Client:
        client_id = str(uuid4())
        client = Client(id=client_id, name=name, email=email, workspace_id=workspace_id)
        self.clients[client_id] = client
        return client

    # Matter methods
    def get_matter(self, matter_id: str) -> Optional[Matter]:
        return self.matters.get(matter_id)
    
    def get_matters_by_workspace(self, workspace_id: str) -> List[Matter]:
        return [m for m in self.matters.values() if m.workspace_id == workspace_id]
    
    def get_matters_by_client(self, client_id: str) -> List[Matter]:
        return [m for m in self.matters.values() if m.client_id == client_id]

    def create_matter(self, title: str, client_id: str, workspace_id: str, actor_id: str, description: Optional[str] = None) -> Matter:
        matter_id = str(uuid4())
        matter = Matter(id=matter_id, title=title, client_id=client_id, workspace_id=workspace_id, description=description)
        self.matters[matter_id] = matter
        self.create_activity(matter_id=matter_id, description=f"Matter created: {title}")
        # Create audit event
        audit_event = MatterWorkflowService.create_audit_event(
            entity="Matter",
            entity_id=matter_id,
            action=AuditAction.MATTER_CREATED,
            actor_id=actor_id,
            workspace_id=workspace_id,
            from_value=None,
            to_value=MatterStatus.DRAFT.value
        )
        self.audit_events[audit_event.id] = audit_event
        return matter
    
    def update_matter_status(self, matter_id: str, status: MatterStatus, actor_id: str) -> Optional[Matter]:
        matter = self.matters.get(matter_id)
        if matter:
            # Validate transition
            if not MatterWorkflowService.can_transition(matter.status, status):
                raise ValueError(f"Invalid status transition from {matter.status} to {status}")
            
            old_status = matter.status
            matter.status = status
            matter.updated_at = datetime.now()
            self.create_activity(matter_id=matter_id, description=f"Status updated to {status}")
            
            # Create audit event
            audit_event = MatterWorkflowService.create_audit_event(
                entity="Matter",
                entity_id=matter_id,
                action=AuditAction.STATUS_CHANGED,
                actor_id=actor_id,
                workspace_id=matter.workspace_id,
                from_value=old_status.value,
                to_value=status.value
            )
            self.audit_events[audit_event.id] = audit_event
            
            return matter
        return None

    def assign_lawyer(self, matter_id: str, lawyer_id: str, actor_id: str) -> Optional[Matter]:
        matter = self.matters.get(matter_id)
        if matter:
            old_lawyer = matter.assigned_lawyer_id
            matter.assigned_lawyer_id = lawyer_id
            matter.updated_at = datetime.now()
            self.create_activity(matter_id=matter_id, description=f"Lawyer assigned: {lawyer_id}")
            
            # Create audit event
            audit_event = MatterWorkflowService.create_audit_event(
                entity="Matter",
                entity_id=matter_id,
                action=AuditAction.ASSIGNED,
                actor_id=actor_id,
                workspace_id=matter.workspace_id,
                from_value=old_lawyer,
                to_value=lawyer_id
            )
            self.audit_events[audit_event.id] = audit_event
            
            return matter
        return None

    # Audit event methods
    def get_audit_events_for_entity(self, entity: str, entity_id: str) -> List[AuditEvent]:
        return [ae for ae in self.audit_events.values() if ae.entity == entity and ae.entity_id == entity_id]

    def get_audit_events_for_workspace(self, workspace_id: str) -> List[AuditEvent]:
        return [ae for ae in self.audit_events.values() if ae.workspace_id == workspace_id]

    # Task methods
    def get_task(self, task_id: str) -> Optional[Task]:
        return self.tasks.get(task_id)

    def get_tasks_by_matter(self, matter_id: str) -> List[Task]:
        return [t for t in self.tasks.values() if t.matter_id == matter_id]

    def create_task(self,
                   matter_id: str,
                   title: str,
                   actor_id: str,
                   workspace_id: str,
                   description: Optional[str] = None,
                   assigned_to: Optional[str] = None,
                   due_date: Optional[datetime] = None) -> Task:
        task_id = str(uuid4())
        task = Task(
            id=task_id,
            matter_id=matter_id,
            title=title,
            description=description,
            assigned_to=assigned_to,
            due_date=due_date
        )
        self.tasks[task_id] = task
        self.create_activity(matter_id=matter_id, description=f"Task created: {title}")
        audit_event = MatterWorkflowService.create_audit_event(
            entity="Task",
            entity_id=task_id,
            action=AuditAction.ACTIVITY_ADDED,
            actor_id=actor_id,
            workspace_id=workspace_id,
            to_value=TaskStatus.OPEN.value
        )
        self.audit_events[audit_event.id] = audit_event
        return task

    def update_task_status(self, task_id: str, status: TaskStatus, actor_id: str) -> Optional[Task]:
        task = self.tasks.get(task_id)
        if not task:
            return None
        old_status = task.status
        task.status = status
        task.updated_at = datetime.now()  # noqa: we'll add updated_at to Task if needed, but for now just use created_at
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.now()
            self.create_activity(matter_id=task.matter_id, description=f"Task completed: {task.title}")
        elif status == TaskStatus.CANCELLED:
            self.create_activity(matter_id=task.matter_id, description=f"Task cancelled: {task.title}")
        else:
            self.create_activity(matter_id=task.matter_id, description=f"Task status changed: {task.title} → {status}")
        
        audit_event = MatterWorkflowService.create_audit_event(
            entity="Task",
            entity_id=task_id,
            action=AuditAction.STATUS_CHANGED,
            actor_id=actor_id,
            workspace_id=self.matters[task.matter_id].workspace_id if task.matter_id in self.matters else "unknown",
            from_value=old_status.value,
            to_value=status.value
        )
        self.audit_events[audit_event.id] = audit_event
        return task

    # Activity methods
    def get_activity(self, activity_id: str) -> Optional[Activity]:
        return self.activities.get(activity_id)
    
    def get_activities_by_matter(self, matter_id: str) -> List[Activity]:
        return [a for a in self.activities.values() if a.matter_id == matter_id]

    def create_activity(self, matter_id: str, description: str) -> Activity:
        activity_id = str(uuid4())
        activity = Activity(id=activity_id, matter_id=matter_id, description=description)
        self.activities[activity_id] = activity
        return activity

    # Document methods
    def get_document(self, document_id: str) -> Optional[Document]:
        return self.documents.get(document_id)
    
    def get_documents_by_matter(self, matter_id: str) -> List[Document]:
        return [d for d in self.documents.values() if d.matter_id == matter_id]

    def create_document(self, filename: str, content_type: str, matter_id: str, workspace_id: str) -> Document:
        document_id = str(uuid4())
        document = Document(id=document_id, filename=filename, content_type=content_type, matter_id=matter_id, workspace_id=workspace_id)
        self.documents[document_id] = document
        self.create_activity(matter_id=matter_id, description=f"Document added: {filename}")
        return document


# Singleton storage instance
storage = InMemoryStorage()
