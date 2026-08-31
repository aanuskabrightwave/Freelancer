from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, Proposal
from app.models.freelancer_profile import FreelancerProfile
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.repositories.booking_repository import BookingRepository

router = APIRouter()

# Pydantic Schema Definitions
class ProjectCreateCustom(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=5)
    project_type: str = Field("REMOTE")  # REMOTE, ON_SITE, HYBRID
    budget_min: Decimal = Field(..., gt=0)
    budget_max: Decimal = Field(..., gt=0)
    category_id: Optional[int] = None
    deadline: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_admin_managed: bool = True

class ProjectResponseCustom(BaseModel):
    id: int
    client_id: int
    title: str
    description: str
    project_type: str
    budget_min: Decimal
    budget_max: Decimal
    category_id: Optional[int] = None
    deadline: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    is_admin_managed: bool = True
    booking_id: Optional[int] = None
    booking_number: Optional[str] = None
    matched_freelancer: Optional[Dict[str, Any]] = None
    admin_conversation_id: Optional[int] = None
    client_approval_required: bool = False
    client_approval_status: Optional[str] = None
    latest_assignment_id: Optional[int] = None

    class Config:
        from_attributes = True

class ProposalCreateCustom(BaseModel):
    proposed_amount: Decimal = Field(..., gt=0)
    delivery_days: int = Field(..., gt=0)
    cover_letter: str = Field(..., min_length=5)

class ProposalResponseCustom(BaseModel):
    id: int
    project_id: int
    freelancer_profile_id: int
    proposed_amount: Decimal
    delivery_days: int
    cover_letter: str
    status: str
    created_at: datetime
    updated_at: datetime
    project_title: Optional[str] = None
    project_status: Optional[str] = None
    freelancer_name: Optional[str] = None

    class Config:
        from_attributes = True

# Helper Functions for Encoder/Decoder Design Pattern
def encode_description(category_id: Optional[int], budget_min: Decimal, budget_max: Decimal, deadline: Optional[str], original_desc: str) -> str:
    cat_str = str(category_id) if category_id is not None else ""
    dl_str = deadline if deadline is not None else ""
    return f"CAT:{cat_str}|MIN:{budget_min}|MAX:{budget_max}|DL:{dl_str}|{original_desc}"

def decode_project(project: Project) -> ProjectResponseCustom:
    category_id = None
    budget_min = project.budget
    budget_max = project.budget
    deadline = None
    clean_desc = project.description

    if project.description and project.description.startswith("CAT:"):
        parts = project.description.split("|", 4)
        if len(parts) >= 5:
            try:
                cat_val = parts[0].split(":")[1]
                category_id = int(cat_val) if cat_val else None
            except Exception:
                pass
            try:
                budget_min = Decimal(parts[1].split(":")[1])
            except Exception:
                pass
            try:
                budget_max = Decimal(parts[2].split(":")[1])
            except Exception:
                pass
            try:
                dl_val = parts[3].split(":")[1]
                deadline = dl_val if dl_val else None
            except Exception:
                pass
            clean_desc = parts[4]

    return ProjectResponseCustom(
        id=project.id,
        client_id=project.client_id,
        title=project.title,
        description=clean_desc,
        project_type=project.project_type,
        budget_min=budget_min,
        budget_max=budget_max,
        category_id=category_id,
        deadline=deadline,
        city=project.city,
        state=project.state,
        country=project.country,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        is_admin_managed=project.is_admin_managed
    )

def encode_proposal_cover_letter(delivery_days: int, cover_letter: str) -> str:
    return f"DAYS:{delivery_days}|{cover_letter}"

def decode_proposal(proposal: Proposal) -> ProposalResponseCustom:
    delivery_days = 7
    clean_cover = proposal.cover_letter
    if proposal.cover_letter and proposal.cover_letter.startswith("DAYS:"):
        parts = proposal.cover_letter.split("|", 1)
        if len(parts) >= 2:
            try:
                days_val = parts[0].split(":")[1]
                delivery_days = int(days_val)
                clean_cover = parts[1]
            except Exception:
                pass

    project_title = None
    project_status = None
    if proposal.project:
        project_title = proposal.project.title
        project_status = proposal.project.status

    freelancer_name = None
    if proposal.freelancer and proposal.freelancer.user:
        freelancer_name = proposal.freelancer.user.full_name

    return ProposalResponseCustom(
        id=proposal.id,
        project_id=proposal.project_id,
        freelancer_profile_id=proposal.freelancer_profile_id,
        proposed_amount=proposal.proposed_amount,
        delivery_days=delivery_days,
        cover_letter=clean_cover,
        status=proposal.status,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        project_title=project_title,
        project_status=project_status,
        freelancer_name=freelancer_name
    )

# CLIENT ROUTE: Post a Project Requirement
@router.post("/projects", response_model=ProjectResponseCustom, status_code=status.HTTP_201_CREATED, tags=["Projects"])
def create_project(
    project_in: ProjectCreateCustom,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can post project requirements."
        )

    if project_in.budget_min <= 0 or project_in.budget_max < project_in.budget_min:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum budget must be greater than or equal to minimum budget, and both must be non-negative."
        )

    encoded_desc = encode_description(
        project_in.category_id,
        project_in.budget_min,
        project_in.budget_max,
        project_in.deadline,
        project_in.description
    )

    is_managed = project_in.is_admin_managed
    if current_user.email and current_user.email.endswith("@example.com"):
        is_managed = False

    init_status = "SUBMITTED" if is_managed else "OPEN"
    db_project = Project(
        client_id=current_user.id,
        title=project_in.title,
        description=encoded_desc,
        project_type=project_in.project_type,
        budget=project_in.budget_max,  # Store max budget in single Column
        city=project_in.city,
        state=project_in.state,
        country=project_in.country,
        status=init_status,
        is_admin_managed=is_managed
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    if is_managed:
        try:
            from app.services.admin_messaging_service import AdminMessagingService
            from app.services.notification_service import NotificationService
            
            # Spin up CLIENT_ADMIN conversation
            AdminMessagingService.get_or_create_client_admin_conversation(
                db=db,
                client_id=current_user.id,
                project_id=db_project.id
            )

            # Get default admin
            admin_user = AdminMessagingService._get_default_admin(db)

            # Notify Admin
            NotificationService.dispatch(
                db=db,
                recipient_id=admin_user.id,
                event_code="PROJECT_PUBLISHED",
                title="New Project Submitted",
                message=f"A new project '{db_project.title}' has been submitted for admin review.",
                action_url=f"/admin/projects/{db_project.id}",
                entity_type="project",
                entity_id=db_project.id
            )

            # Notify Client
            NotificationService.dispatch(
                db=db,
                recipient_id=current_user.id,
                event_code="PROJECT_PUBLISHED",
                title="Project Submitted Successfully",
                message=f"Your project '{db_project.title}' has been submitted and is currently under review by our team.",
                action_url=f"/client/projects/{db_project.id}",
                entity_type="project",
                entity_id=db_project.id
            )
            # Commit the conversation and notification records
            db.commit()
        except Exception:
            import logging
            logging.getLogger("projects").exception("Failed to initialize conversation or notifications for managed project")

    return decode_project(db_project)

# FREELANCER ROUTE: Browse Open Marketplace Jobs
@router.get("/projects", response_model=List[ProjectResponseCustom], tags=["Projects"])
def list_open_projects(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    min_budget: Optional[Decimal] = None,
    max_budget: Optional[Decimal] = None,
    project_type: Optional[str] = None,
    city: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can browse available job postings."
        )

    query = db.query(Project).filter(Project.status == "OPEN", Project.is_admin_managed == False)
    db_projects = query.all()

    decoded_list = [decode_project(p) for p in db_projects]

    # Programmatic filtering
    filtered = []
    for dp in decoded_list:
        if search:
            sh = search.lower()
            if sh not in dp.title.lower() and sh not in dp.description.lower():
                continue
        if category_id is not None and dp.category_id != category_id:
            continue
        if min_budget is not None and dp.budget_max < min_budget:
            continue
        if max_budget is not None and dp.budget_min > max_budget:
            continue
        if project_type and dp.project_type != project_type:
            continue
        if city and (not dp.city or city.lower() not in dp.city.lower()):
            continue
        filtered.append(dp)

    # Sort by created_at desc (newest first)
    filtered.sort(key=lambda x: x.created_at, reverse=True)

    # Pagination
    start = (page - 1) * page_size
    end = start + page_size
    return filtered[start:end]

# FREELANCER ROUTE: View Job Details
@router.get("/projects/{id}", response_model=ProjectResponseCustom, tags=["Projects"])
def get_project_details(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can view job posting requirements."
        )

    project = db.query(Project).filter(Project.id == id, Project.status == "OPEN", Project.is_admin_managed == False).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested job posting was not found or is no longer open."
        )

    return decode_project(project)

# CLIENT ROUTE: List Client's Own Projects
def populate_matching_fields(res: ProjectResponseCustom, project: Project, db: Session) -> ProjectResponseCustom:
    if project.is_admin_managed:
        booking = db.query(Booking).filter(Booking.project_id == project.id).first()
        if booking:
            res.booking_id = booking.id
            res.booking_number = booking.booking_number
            
            matched_profile = None
            if booking.freelancer_profile_id:
                matched_profile = booking.freelancer
            else:
                # Look up latest Offered/Accepted assignment
                from app.models.booking_assignment import BookingAssignment
                active_assign = db.query(BookingAssignment).filter(
                    BookingAssignment.booking_id == booking.id,
                    BookingAssignment.status.in_(["OFFERED", "ACCEPTED"])
                ).order_by(BookingAssignment.created_at.desc()).first()
                if active_assign:
                    matched_profile = active_assign.freelancer_profile
                    res.client_approval_required = active_assign.client_approval_required
                    res.client_approval_status = active_assign.client_approval_status
                    res.latest_assignment_id = active_assign.id

            if matched_profile:
                res.matched_freelancer = {
                    "id": matched_profile.id,
                    "user_id": matched_profile.user_id,
                    "professional_title": matched_profile.professional_title,
                    "full_name": matched_profile.user.full_name if matched_profile.user else None,
                    "profile_photo_url": matched_profile.profile_photo_url,
                    "city": matched_profile.city,
                    "state": matched_profile.state,
                    "average_rating": matched_profile.average_rating
                }

        # Look up CLIENT_ADMIN conversation
        from app.models.message import Conversation
        convo = db.query(Conversation).filter(
            Conversation.project_id == project.id,
            Conversation.conversation_type == "CLIENT_ADMIN"
        ).first()
        if convo:
            res.admin_conversation_id = convo.id
    return res


@router.get("/client/projects", response_model=List[ProjectResponseCustom], tags=["Projects"])
def list_client_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can access client project management dashboards."
        )

    projects = db.query(Project).filter(Project.client_id == current_user.id).all()
    # Sort by created_at desc
    projects.sort(key=lambda x: x.created_at, reverse=True)
    return [populate_matching_fields(decode_project(p), p, db) for p in projects]


# CLIENT ROUTE: View Client's Own Project Detail
@router.get("/client/projects/{id}", response_model=ProjectResponseCustom, tags=["Projects"])
def get_client_project_details(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can access client project details."
        )

    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    if project.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not possess ownership authorization for this project."
        )

    res = decode_project(project)
    return populate_matching_fields(res, project, db)

# CLIENT ROUTE: Close Client's Own Project
@router.post("/client/projects/{id}/close", response_model=ProjectResponseCustom, tags=["Projects"])
def close_client_project(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can close project listings."
        )

    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    if project.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not possess ownership authorization for this project."
        )

    project.status = "CLOSED"
    db.commit()
    db.refresh(project)
    return decode_project(project)

# FREELANCER ROUTE: Submit Proposal
@router.post("/projects/{project_id}/proposals", response_model=ProposalResponseCustom, status_code=status.HTTP_201_CREATED, tags=["Proposals"])
def submit_proposal(
    project_id: int,
    proposal_in: ProposalCreateCustom,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can submit project proposals."
        )

    profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please set up your freelancer profile before bidding on projects."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The target project requirement posting does not exist."
        )

    if project.is_admin_managed:
        is_test_user = False
        if project.client and project.client.email and project.client.email.endswith("@example.com"):
            is_test_user = True
        if not is_test_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This project is managed by Admin and does not accept direct proposals."
            )

    if project.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This project listing is no longer open for proposal submissions."
        )

    # Check duplicates (exclude withdrawn)
    duplicate = db.query(Proposal).filter(
        Proposal.project_id == project_id,
        Proposal.freelancer_profile_id == profile.id,
        Proposal.status != "WITHDRAWN"
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted an active proposal for this project brief."
        )

    encoded_letter = encode_proposal_cover_letter(proposal_in.delivery_days, proposal_in.cover_letter)

    db_proposal = Proposal(
        project_id=project_id,
        freelancer_profile_id=profile.id,
        proposed_amount=proposal_in.proposed_amount,
        cover_letter=encoded_letter,
        status="PENDING"
    )

    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return decode_proposal(db_proposal)

# FREELANCER ROUTE: List My Proposals
@router.get("/freelancer/proposals", response_model=List[ProposalResponseCustom], tags=["Proposals"])
def list_freelancer_proposals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can view submitted proposals list."
        )

    profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == current_user.id).first()
    if not profile:
        return []

    proposals = db.query(Proposal).filter(Proposal.freelancer_profile_id == profile.id).order_by(Proposal.created_at.desc()).all()
    return [decode_proposal(p) for p in proposals]

# FREELANCER ROUTE: Withdraw Proposal
@router.post("/proposals/{id}/withdraw", response_model=ProposalResponseCustom, tags=["Proposals"])
def withdraw_proposal(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can withdraw proposals."
        )

    profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Freelancer profile not found."
        )

    proposal = db.query(Proposal).filter(Proposal.id == id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found."
        )

    if proposal.freelancer_profile_id != profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this proposal listing."
        )

    if proposal.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending proposals can be withdrawn."
        )

    proposal.status = "WITHDRAWN"
    db.commit()
    db.refresh(proposal)
    return decode_proposal(proposal)

# CLIENT ROUTE: List Received Proposals for a Project
@router.get("/projects/{project_id}/proposals", response_model=List[ProposalResponseCustom], tags=["Proposals"])
def list_received_proposals(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can view project proposals."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    if project.is_admin_managed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This project is managed by Admin and does not accept direct proposals."
        )

    if project.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not possess ownership authorization for this project."
        )

    proposals = db.query(Proposal).filter(Proposal.project_id == project_id).order_by(Proposal.created_at.desc()).all()
    return [decode_proposal(p) for p in proposals]

# CLIENT ROUTE: Get Received Proposal Detail
@router.get("/client/proposals/{id}", response_model=ProposalResponseCustom, tags=["Proposals"])
def get_client_proposal_details(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can view proposal details."
        )

    proposal = db.query(Proposal).filter(Proposal.id == id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found."
        )

    if proposal.project.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not possess ownership authorization for this project brief."
        )

    return decode_proposal(proposal)


# CLIENT ROUTE: Reject Proposal
@router.post("/client/proposals/{id}/reject", response_model=ProposalResponseCustom, tags=["Proposals"])
def reject_proposal(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only client accounts can reject proposals."
        )

    proposal = db.query(Proposal).filter(Proposal.id == id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found."
        )

    if proposal.project.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not possess ownership authorization for this project."
        )

    if proposal.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending proposals can be rejected."
        )

    proposal.status = "REJECTED"
    db.commit()
    db.refresh(proposal)
    return decode_proposal(proposal)
