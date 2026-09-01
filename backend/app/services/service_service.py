import re
from typing import List, Optional
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.service_category import ServiceCategory
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.service_package import ServicePackage, PackageType, PackageDeliverable
from app.models.service_media import ServiceMedia
from app.models.service_requirement import ServiceRequirement
from app.repositories.service_repository import ServiceRepository


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text


class ServiceService:
    @staticmethod
    def generate_unique_slug(db: Session, title: str) -> str:
        base_slug = slugify(title)
        if not base_slug:
            base_slug = "service"
            
        slug = base_slug
        counter = 1
        while True:
            existing = ServiceRepository.get_service_by_slug(db, slug)
            if not existing:
                return slug
            slug = f"{base_slug}-{counter}"
            counter += 1

    @staticmethod
    def seed_categories_if_empty(db: Session) -> List[ServiceCategory]:
        """
        Pre-populates database categories and subcategories if table is empty.
        """
        existing = db.query(ServiceCategory).first()
        if existing:
            return db.query(ServiceCategory).all()

        categories_structure = {
            "Photography": {
                "description": "Professional photography services",
                "subcategories": [
                    "Wedding Photography",
                    "Pre-Wedding Photography",
                    "Product Photography",
                    "Fashion Photography",
                    "Event Photography",
                    "Food Photography",
                    "Real Estate Photography",
                    "Corporate Photography"
                ]
            },
            "Videography": {
                "description": "Cinematic videography and drone capturing",
                "subcategories": [
                    "Wedding Videography",
                    "Event Videography",
                    "Corporate Video",
                    "Product Video",
                    "Drone Videography",
                    "Music Video",
                    "Commercial Videography"
                ]
            },
            "Editor": {
                "description": "Post-production, video and photo editing, and color grading services",
                "subcategories": [
                    "Video Editing",
                    "Reel Editing",
                    "Wedding Video Editing",
                    "YouTube Editing",
                    "Photo Editing",
                    "Photo Retouching",
                    "Color Grading",
                    "Motion Graphics"
                ]
            },
            "3D Animator": {
                "description": "3D modeling, animation, visual effects, and CGI rendering",
                "subcategories": [
                    "3D Character Animation",
                    "3D Product Modeling",
                    "Architectural Visualization",
                    "VFX & Compositing",
                    "Game Asset Design"
                ]
            },
            "Graphics": {
                "description": "Graphic design, branding, vector illustration, and digital marketing creatives",
                "subcategories": [
                    "Brand Identity & Logo Design",
                    "Social Media Graphics",
                    "Thumbnail Design",
                    "Print & Poster Design",
                    "Vector Illustrations",
                    "UI/UX Visual Assets"
                ]
            }
        }

        seeded = []
        for cat_name, cat_info in categories_structure.items():
            parent = ServiceRepository.create_category(db, {
                "name": cat_name,
                "slug": slugify(cat_name),
                "description": cat_info["description"],
                "parent_id": None
            })
            seeded.append(parent)
            
            for sub_name in cat_info["subcategories"]:
                child = ServiceRepository.create_category(db, {
                    "name": sub_name,
                    "slug": slugify(sub_name),
                    "description": f"{sub_name} subcategory",
                    "parent_id": parent.id
                })
                seeded.append(child)
                
        return seeded

    @staticmethod
    def recalculate_starting_price(db: Session, service: Service) -> Decimal:
        """
        Computes starting price from the lowest price package and updates service.
        """
        if not service.packages:
            starting_price = Decimal("0.00")
        else:
            starting_price = min(pkg.price for pkg in service.packages)
            
        ServiceRepository.update_service(db, service, {"starting_price": starting_price})
        return starting_price

    @staticmethod
    def create_service(db: Session, freelancer_profile_id: int, service_data: dict) -> Service:
        # Generate slug
        service_data["slug"] = ServiceService.generate_unique_slug(db, service_data["title"])
        service_data["freelancer_profile_id"] = freelancer_profile_id
        service_data["status"] = ServiceStatus.DRAFT
        return ServiceRepository.create_service(db, service_data)

    @staticmethod
    def update_service(db: Session, freelancer_profile_id: int, service_id: int, update_data: dict) -> Service:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        # If title is changing, regenerate slug
        if "title" in update_data and update_data["title"] != service.title:
            update_data["slug"] = ServiceService.generate_unique_slug(db, update_data["title"])

        return ServiceRepository.update_service(db, service, update_data)

    @staticmethod
    def delete_service_or_archive(db: Session, freelancer_profile_id: int, service_id: int) -> None:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        if service.status == ServiceStatus.DRAFT:
            # Hard delete if it was just a draft
            db.delete(service)
            db.commit()
        else:
            # Soft delete/Archive if published or paused
            ServiceRepository.update_service(db, service, {"status": ServiceStatus.ARCHIVED, "is_active": False})

    # Packages CRUD
    @staticmethod
    def add_package(
        db: Session, 
        freelancer_profile_id: int, 
        service_id: int, 
        pkg_data: dict, 
        deliverables: List[dict] = None
    ) -> ServicePackage:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        # Limit to max 3 packages
        if len(service.packages) >= 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A service can have up to 3 packages.")

        # Prevent duplicate types (BASIC, STANDARD, PREMIUM)
        target_type = pkg_data.get("package_type")
        for pkg in service.packages:
            if pkg.package_type == target_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"A package of type {target_type} already exists for this service."
                )

        pkg_data["service_id"] = service_id
        new_pkg = ServiceRepository.create_package(db, pkg_data, deliverables)
        
        # Sync starting price
        ServiceService.recalculate_starting_price(db, service)
        return new_pkg

    @staticmethod
    def update_package(
        db: Session, 
        freelancer_profile_id: int, 
        service_id: int, 
        package_id: int, 
        update_data: dict, 
        deliverables: List[dict] = None
    ) -> ServicePackage:
        service = ServiceRepository.get_service_by_id(db, service_id)
        package = ServiceRepository.get_package_by_id(db, package_id)
        if not package or package.service_id != service_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found.")
        if not service or service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        updated = ServiceRepository.update_package(db, package, update_data, deliverables)
        ServiceService.recalculate_starting_price(db, service)
        return updated

    @staticmethod
    def delete_package(db: Session, freelancer_profile_id: int, service_id: int, package_id: int) -> None:
        service = ServiceRepository.get_service_by_id(db, service_id)
        package = ServiceRepository.get_package_by_id(db, package_id)
        if not package or package.service_id != service_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found.")
        if not service or service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        ServiceRepository.delete_package(db, package)
        ServiceService.recalculate_starting_price(db, service)

    # Media CRUD
    @staticmethod
    def add_media(db: Session, freelancer_profile_id: int, service_id: int, media_data: dict) -> ServiceMedia:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        # Limit to max 10 media items
        if len(service.media) >= 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can upload a maximum of 10 media items.")

        # Enforce single cover image rule
        if media_data.get("is_cover") is True:
            # Set all others is_cover=False
            for m in service.media:
                if m.is_cover:
                    db.query(ServiceMedia).filter(ServiceMedia.id == m.id).update({"is_cover": False})
        else:
            # If no cover exists, make the first item cover
            if not any(m.is_cover for m in service.media):
                media_data["is_cover"] = True

        media_data["service_id"] = service_id
        return ServiceRepository.create_media(db, media_data)

    @staticmethod
    def delete_media(db: Session, freelancer_profile_id: int, service_id: int, media_id: int) -> None:
        service = ServiceRepository.get_service_by_id(db, service_id)
        media = ServiceRepository.get_media_by_id(db, media_id)
        if not media or media.service_id != service_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found.")
        if not service or service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        was_cover = media.is_cover
        ServiceRepository.delete_media(db, media)

        # If we deleted the cover image, set the first available media as cover
        if was_cover and service.media:
            first_media = service.media[0]
            db.query(ServiceMedia).filter(ServiceMedia.id == first_media.id).update({"is_cover": True})
            db.commit()

    @staticmethod
    def toggle_cover_media(db: Session, freelancer_profile_id: int, service_id: int, media_id: int) -> ServiceMedia:
        service = ServiceRepository.get_service_by_id(db, service_id)
        media = ServiceRepository.get_media_by_id(db, media_id)
        if not media or media.service_id != service_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found.")
        if not service or service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        # Set all is_cover = False
        db.query(ServiceMedia).filter(ServiceMedia.service_id == service_id).update({"is_cover": False})
        # Set target cover
        media.is_cover = True
        db.commit()
        db.refresh(media)
        return media

    # Requirements CRUD
    @staticmethod
    def add_requirement(db: Session, freelancer_profile_id: int, service_id: int, req_data: dict) -> ServiceRequirement:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        req_data["service_id"] = service_id
        return ServiceRepository.create_requirement(db, req_data)

    @staticmethod
    def update_requirement(
        db: Session, 
        freelancer_profile_id: int, 
        service_id: int, 
        req_id: int, 
        update_data: dict
    ) -> ServiceRequirement:
        service = ServiceRepository.get_service_by_id(db, service_id)
        req = ServiceRepository.get_requirement_by_id(db, req_id)
        if not req or req.service_id != service_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found.")
        if not service or service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        return ServiceRepository.update_requirement(db, req, update_data)

    @staticmethod
    def delete_requirement(db: Session, freelancer_profile_id: int, service_id: int, req_id: int) -> None:
        service = ServiceRepository.get_service_by_id(db, service_id)
        req = ServiceRepository.get_requirement_by_id(db, req_id)
        if not req or req.service_id != service_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found.")
        if not service or service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        ServiceRepository.delete_requirement(db, req)

    # Publish Gates
    @staticmethod
    def publish_service(db: Session, freelancer_profile_id: int, service_id: int) -> Service:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        # Validation checks
        if not service.title or len(service.title.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Service title is required and must be at least 10 characters."
            )
        if not service.category_id or not service.subcategory_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Category and subcategory selection are required."
            )
        if not service.description or len(service.description.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Full description is required."
            )
        if not service.packages or len(service.packages) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="At least one package is required."
            )
        if any(pkg.price <= 0 for pkg in service.packages):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="All package prices must be greater than zero."
            )
        if not service.media or not any(m.media_type == "IMAGE" for m in service.media):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="At least one image is required before publication."
            )
        if not any(m.is_cover for m in service.media):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="A primary cover image is required before publication."
            )

        # Location checks for ON_SITE and HYBRID
        if service.service_type in (ServiceType.ON_SITE, ServiceType.HYBRID):
            if not service.city or not service.state or not service.country:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="City, State, and Country are required for On-Site or Hybrid services."
                )

        return ServiceRepository.update_service(db, service, {"status": ServiceStatus.PUBLISHED, "is_active": True})

    @staticmethod
    def pause_service(db: Session, freelancer_profile_id: int, service_id: int) -> Service:
        service = ServiceRepository.get_service_by_id(db, service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
        if service.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this service.")

        return ServiceRepository.update_service(db, service, {"status": ServiceStatus.PAUSED})
