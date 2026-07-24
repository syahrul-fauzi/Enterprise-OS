from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from domain.models.models import (
    User, Workspace, Client, Matter, Document, AuthRequest,
    Activity, MatterStatus, AuditEvent, Task, TaskStatus
)
from infrastructure.services.storage import storage


app = FastAPI(title="LawyersHub MVP API", version="0.1.0")

# Add CORS middleware for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Identity Contract Models ---
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class RegisterResponse(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 3600


class CurrentUserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    created_at: datetime


# Simple in-memory token store for demo
token_store: dict[str, str] = {}


def create_access_token(user_id: str) -> str:
    token = str(uuid4())
    token_store[token] = user_id
    return token


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authorization header"
        )
    token = authorization.split(" ")[1]
    user_id = token_store.get(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


# --- Identity Contract Endpoints ---
@app.post("/api/v1/identity/register", response_model=RegisterResponse, tags=["Identity"], status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    existing_user = storage.get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )
    name = request.name or request.email.split("@")[0]
    user = storage.create_user(request.email, name)
    return RegisterResponse(
        user_id=user.id,
        email=user.email,
        name=user.name
    )


@app.post("/api/v1/identity/login", response_model=LoginResponse, tags=["Identity"])
async def login(request: LoginRequest):
    user = storage.get_user_by_email(request.email)
    if not user:
        # Create a new user for demo purposes if email doesn't exist
        name = request.email.split("@")[0]
        user = storage.create_user(request.email, name)
    access_token = create_access_token(user.id)
    return LoginResponse(
        access_token=access_token
    )


@app.get("/api/v1/identity/me", response_model=CurrentUserResponse, tags=["Identity"])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return CurrentUserResponse(
        user_id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        created_at=current_user.created_at
    )


# --- Legacy Authentication (for compatibility) ---
@app.post("/api/auth/login", response_model=User, tags=["Authentication (Legacy)"])
async def legacy_login(auth_request: AuthRequest):
    """Simple demo authentication: use demo@lawyershub.io for quick access"""
    user = storage.get_user_by_email(auth_request.email)
    if not user:
        # Create a new user for demo purposes if email doesn't exist
        user = storage.create_user(auth_request.email, auth_request.email.split("@")[0])
    return user


@app.post("/api/auth/logout", tags=["Authentication (Legacy)"])
async def legacy_logout():
    """Simple demo logout"""
    return {"message": "Logged out successfully"}


# --- Users ---
@app.get("/api/users/{user_id}", response_model=User, tags=["Users"])
async def get_user(user_id: str):
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- Request Models ---
class CreateWorkspaceRequest(BaseModel):
    name: str


class CreateClientRequest(BaseModel):
    name: str
    email: Optional[str] = None


class CreateMatterRequest(BaseModel):
    title: str
    client_id: str
    description: Optional[str] = None


class CreateDocumentRequest(BaseModel):
    filename: str
    content_type: str


class UpdateMatterStatusRequest(BaseModel):
    status: MatterStatus
    actor_id: str


class AssignLawyerRequest(BaseModel):
    lawyer_id: str
    actor_id: str


class CreateActivityRequest(BaseModel):
    description: str


class CreateTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None


class UpdateTaskStatusRequest(BaseModel):
    status: TaskStatus
    actor_id: str


# --- Workspaces ---
@app.get("/api/users/{user_id}/workspaces", response_model=List[Workspace], tags=["Workspaces"])
async def get_user_workspaces(user_id: str):
    return storage.get_workspaces_by_owner(user_id)


@app.post("/api/users/{user_id}/workspaces", response_model=Workspace, tags=["Workspaces"], status_code=status.HTTP_201_CREATED)
async def create_workspace(user_id: str, request: CreateWorkspaceRequest):
    user = storage.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return storage.create_workspace(name=request.name, owner_id=user_id)


# Helper to get demo user ID as default actor for testing
def get_default_actor_id():
    return storage.demo_user.id


@app.get("/api/workspaces/{workspace_id}", response_model=Workspace, tags=["Workspaces"])
async def get_workspace(workspace_id: str):
    workspace = storage.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


# --- Clients ---
@app.get("/api/workspaces/{workspace_id}/clients", response_model=List[Client], tags=["Clients"])
async def get_workspace_clients(workspace_id: str):
    return storage.get_clients_by_workspace(workspace_id)


@app.post("/api/workspaces/{workspace_id}/clients", response_model=Client, tags=["Clients"], status_code=status.HTTP_201_CREATED)
async def create_client(workspace_id: str, request: CreateClientRequest):
    workspace = storage.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return storage.create_client(name=request.name, workspace_id=workspace_id, email=request.email)


@app.get("/api/clients/{client_id}", response_model=Client, tags=["Clients"])
async def get_client(client_id: str):
    client = storage.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


# --- Matters ---
@app.get("/api/workspaces/{workspace_id}/matters", response_model=List[Matter], tags=["Matters"])
async def get_workspace_matters(workspace_id: str):
    return storage.get_matters_by_workspace(workspace_id)


@app.get("/api/clients/{client_id}/matters", response_model=List[Matter], tags=["Matters"])
async def get_client_matters(client_id: str):
    return storage.get_matters_by_client(client_id)


@app.post("/api/workspaces/{workspace_id}/matters", response_model=Matter, tags=["Matters"], status_code=status.HTTP_201_CREATED)
async def create_matter(workspace_id: str, request: CreateMatterRequest, actor_id: str = Depends(get_default_actor_id)):
    workspace = storage.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    client = storage.get_client(request.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return storage.create_matter(title=request.title, client_id=request.client_id, workspace_id=workspace_id, actor_id=actor_id, description=request.description)


@app.get("/api/matters/{matter_id}", response_model=Matter, tags=["Matters"])
async def get_matter(matter_id: str):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return matter


@app.patch("/api/matters/{matter_id}/status", response_model=Matter, tags=["Matters"])
async def update_matter_status(matter_id: str, request: UpdateMatterStatusRequest):
    try:
        matter = storage.update_matter_status(matter_id, request.status, request.actor_id)
        if not matter:
            raise HTTPException(status_code=404, detail="Matter not found")
        return matter
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# New assign lawyer endpoint
@app.patch("/api/matters/{matter_id}/assign", response_model=Matter, tags=["Matters"])
async def assign_lawyer_to_matter(matter_id: str, request: AssignLawyerRequest):
    matter = storage.assign_lawyer(matter_id, request.lawyer_id, request.actor_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return matter


# Audit trail endpoints
@app.get("/api/matters/{matter_id}/audit-trail", response_model=List[AuditEvent], tags=["Audit"])
async def get_matter_audit_trail(matter_id: str):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return storage.get_audit_events_for_entity("Matter", matter_id)


@app.get("/api/workspaces/{workspace_id}/audit-trail", response_model=List[AuditEvent], tags=["Audit"])
async def get_workspace_audit_trail(workspace_id: str):
    workspace = storage.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return storage.get_audit_events_for_workspace(workspace_id)


# --- Tasks ---
@app.get("/api/matters/{matter_id}/tasks", response_model=List[Task], tags=["Tasks"])
async def get_matter_tasks(matter_id: str):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return storage.get_tasks_by_matter(matter_id)


@app.post("/api/matters/{matter_id}/tasks", response_model=Task, tags=["Tasks"], status_code=status.HTTP_201_CREATED)
async def create_task(matter_id: str, request: CreateTaskRequest, actor_id: str = Depends(get_default_actor_id)):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return storage.create_task(
        matter_id=matter_id,
        title=request.title,
        description=request.description,
        assigned_to=request.assigned_to,
        due_date=request.due_date,
        actor_id=actor_id,
        workspace_id=matter.workspace_id
    )


@app.patch("/api/tasks/{task_id}/status", response_model=Task, tags=["Tasks"])
async def update_task_status(task_id: str, request: UpdateTaskStatusRequest):
    task = storage.update_task_status(task_id, request.status, request.actor_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# --- Activities ---
@app.get("/api/matters/{matter_id}/activities", response_model=List[Activity], tags=["Activities"])
async def get_matter_activities(matter_id: str):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return storage.get_activities_by_matter(matter_id)


@app.post("/api/matters/{matter_id}/activities", response_model=Activity, tags=["Activities"], status_code=status.HTTP_201_CREATED)
async def create_activity(matter_id: str, request: CreateActivityRequest):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return storage.create_activity(matter_id=matter_id, description=request.description)


# --- Documents ---
@app.get("/api/matters/{matter_id}/documents", response_model=List[Document], tags=["Documents"])
async def get_matter_documents(matter_id: str):
    return storage.get_documents_by_matter(matter_id)


@app.post("/api/matters/{matter_id}/documents", response_model=Document, tags=["Documents"], status_code=status.HTTP_201_CREATED)
async def create_document(matter_id: str, request: CreateDocumentRequest):
    matter = storage.get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return storage.create_document(filename=request.filename, content_type=request.content_type, matter_id=matter_id, workspace_id=matter.workspace_id)


@app.get("/api/documents/{document_id}", response_model=Document, tags=["Documents"])
async def get_document(document_id: str):
    document = storage.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


# --- Root ---
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to LawyersHub MVP API",
        "docs": "/docs",
        "demo_user_email": storage.demo_user.email
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
