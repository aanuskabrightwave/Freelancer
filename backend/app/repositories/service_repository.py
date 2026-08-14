from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.service_category import ServiceCategory
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.service_package import ServicePackage, PackageType, PackageDeliverable
from app.models.service_media import ServiceMedia
from app.models.service_requirement import ServiceRequirement


class ServiceRepository:
    # Categories
    @staticmethod
    def get_category_by_id(db: Session, category_id: int) -> Optional[ServiceCategory]:
        return db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()

    @staticmethod
    def get_category_by_slug(db: Session, slug: str) -> Optional[ServiceCategory]:
        return db.query(ServiceCategory).filter(ServiceCategory.slug == slug).first()

    @staticmethod
    def create_category(db: Session, cat_data: dict) -> ServiceCategory:
        db_cat = ServiceCategory(**cat_data)
        db.add(db_cat)
        db.commit()
        db.refresh(db_cat)
        return db_cat

    @staticmethod
    def get_all_categories(db: Session) -> List[ServiceCategory]:
        # Return root level categories (parent_id is None) with active status
        return db.query(ServiceCategory).filter(
            and_(ServiceCategory.parent_id == None, ServiceCategory.is_active == True)
        ).all()

    @staticmethod
    def get_subcategory_list(db: Session, parent_id: int) -> List[ServiceCategory]:
        return db.query(ServiceCategory).filter(
            and_(ServiceCategory.parent_id == parent_id, ServiceCategory.is_active == True)
        ).all()

    # Services
    @staticmethod
    def get_service_by_id(db: Session, service_id: int) -> Optional[Service]:
        return db.query(Service).filter(Service.id == service_id).first()

    @staticmethod
    def get_service_by_slug(db: Session, slug: str) -> Optional[Service]:
        return db.query(Service).filter(Service.slug == slug).first()

    @staticmethod
    def get_freelancer_services(db: Session, freelancer_profile_id: int) -> List[Service]:
        # Exclude ARCHIVED services from owner dashboard by default
        return db.query(Service).filter(
            and_(Service.freelancer_profile_id == freelancer_profile_id, Service.status != ServiceStatus.ARCHIVED)
        ).all()

    @staticmethod
    def create_service(db: Session, service_data: dict) -> Service:
        db_service = Service(**service_data)
        db.add(db_service)
        db.commit()
        db.refresh(db_service)
        return db_service

    @staticmethod
    def update_service(db: Session, service: Service, update_data: dict) -> Service:
        for key, value in update_data.items():
            setattr(service, key, value)
        db.commit()
        db.refresh(service)
        return service

    # Packages
    @staticmethod
    def get_package_by_id(db: Session, package_id: int) -> Optional[ServicePackage]:
        return db.query(ServicePackage).filter(ServicePackage.id == package_id).first()

    @staticmethod
    def create_package(db: Session, package_data: dict, deliverables_list: List[dict] = None) -> ServicePackage:
        db_pkg = ServicePackage(**package_data)
        db.add(db_pkg)
        db.commit()
        db.refresh(db_pkg)

        if deliverables_list:
            for item in deliverables_list:
                item["service_package_id"] = db_pkg.id
                db.add(PackageDeliverable(**item))
            db.commit()
            db.refresh(db_pkg)

        return db_pkg

    @staticmethod
    def update_package(
        db: Session, 
        package: ServicePackage, 
        update_data: dict, 
        deliverables_list: List[dict] = None
    ) -> ServicePackage:
        for key, value in update_data.items():
            setattr(package, key, value)
        db.commit()

        if deliverables_list is not None:
            # Delete old deliverables
            db.query(PackageDeliverable).filter(PackageDeliverable.service_package_id == package.id).delete()
            # Insert new deliverables
            for item in deliverables_list:
                item["service_package_id"] = package.id
                db.add(PackageDeliverable(**item))
            db.commit()

        db.refresh(package)
        return package

    @staticmethod
    def delete_package(db: Session, package: ServicePackage) -> None:
        db.delete(package)
        db.commit()

    # Media
    @staticmethod
    def get_media_by_id(db: Session, media_id: int) -> Optional[ServiceMedia]:
        return db.query(ServiceMedia).filter(ServiceMedia.id == media_id).first()

    @staticmethod
    def create_media(db: Session, media_data: dict) -> ServiceMedia:
        db_media = ServiceMedia(**media_data)
        db.add(db_media)
        db.commit()
        db.refresh(db_media)
        return db_media

    @staticmethod
    def delete_media(db: Session, media: ServiceMedia) -> None:
        db.delete(media)
        db.commit()

    # Requirements
    @staticmethod
    def get_requirement_by_id(db: Session, req_id: int) -> Optional[ServiceRequirement]:
        return db.query(ServiceRequirement).filter(ServiceRequirement.id == req_id).first()

    @staticmethod
    def create_requirement(db: Session, req_data: dict) -> ServiceRequirement:
        db_req = ServiceRequirement(**req_data)
        db.add(db_req)
        db.commit()
        db.refresh(db_req)
        return db_req

    @staticmethod
    def update_requirement(db: Session, req: ServiceRequirement, update_data: dict) -> ServiceRequirement:
        for key, value in update_data.items():
            setattr(req, key, value)
        db.commit()
        db.refresh(req)
        return req

    @staticmethod
    def delete_requirement(db: Session, req: ServiceRequirement) -> None:
        db.delete(req)
        db.commit()

    # Public Directory Search Filter
    @staticmethod
    def get_all_public_services(
        db: Session,
        page: int,
        page_size: int,
        category_id: Optional[int] = None,
        subcategory_id: Optional[int] = None,
        service_type: Optional[str] = None,
        city: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> List[Service]:
        from sqlalchemy.orm import joinedload
        from app.models.freelancer_profile import FreelancerProfile

        query = db.query(Service).options(
            joinedload(Service.freelancer_profile).joinedload(FreelancerProfile.user)
        ).filter(Service.status == ServiceStatus.PUBLISHED)
        
        if category_id:
            query = query.filter(Service.category_id == category_id)
        if subcategory_id:
            query = query.filter(Service.subcategory_id == subcategory_id)
        if service_type:
            query = query.filter(Service.service_type == service_type.upper())
        if city:
            query = query.filter(Service.city.like(f"%{city.strip()}%"))
        if min_price is not None:
            query = query.filter(Service.starting_price >= min_price)
        if max_price is not None:
            query = query.filter(Service.starting_price <= max_price)

        offset = (page - 1) * page_size
        return query.order_by(Service.is_featured.desc(), Service.created_at.desc()).offset(offset).limit(page_size).all()
