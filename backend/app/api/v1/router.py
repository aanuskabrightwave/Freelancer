from fastapi import APIRouter

from app.api.v1.endpoints import (
    health, auth, freelancers, freelancer_services, services, bookings,
    messages, client_bookings, freelancer_bookings, availability,
    workspace, messaging, deliveries, revisions,
    payments, freelancer_earnings, payouts, payment_webhooks
)

api_router = APIRouter()

# Register active endpoints
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(freelancers.router, tags=["Freelancers"])
api_router.include_router(freelancer_services.router, tags=["Freelancer Services"])
api_router.include_router(services.router, tags=["Marketplace Services"])
api_router.include_router(bookings.router, tags=["Bookings"])
api_router.include_router(messages.router, tags=["Messages"])
api_router.include_router(client_bookings.router, tags=["Client Bookings"])
api_router.include_router(freelancer_bookings.router, tags=["Freelancer Bookings"])
api_router.include_router(availability.router, tags=["Availability"])
api_router.include_router(workspace.router, tags=["Workspaces"])
api_router.include_router(messaging.router, tags=["Workspace Messaging"])
api_router.include_router(deliveries.router, tags=["Deliveries"])
api_router.include_router(revisions.router, tags=["Revisions"])
api_router.include_router(payments.router, tags=["Payments"])
api_router.include_router(freelancer_earnings.router, tags=["Freelancer Earnings"])
api_router.include_router(payouts.router, tags=["Payouts"])
api_router.include_router(payment_webhooks.router, tags=["Payment Webhooks"])


# Register placeholder routes for planned modules
placeholder_router = APIRouter()

@placeholder_router.get("/users", tags=["Users Placeholder"])
async def users_placeholder():
    return {"message": "Users endpoints will be implemented in a future module"}

@placeholder_router.get("/clients", tags=["Clients Placeholder"])
async def clients_placeholder():
    return {"message": "Client profiles will be implemented in a future module"}

@placeholder_router.get("/projects", tags=["Projects Placeholder"])
async def projects_placeholder():
    return {"message": "Projects endpoints will be implemented in a future module"}

@placeholder_router.get("/proposals", tags=["Proposals Placeholder"])
async def proposals_placeholder():
    return {"message": "Proposals endpoints will be implemented in a future module"}

@placeholder_router.get("/payments", tags=["Payments Placeholder"])
async def payments_placeholder():
    return {"message": "Payments endpoints will be implemented in a future module"}

@placeholder_router.get("/reviews", tags=["Reviews Placeholder"])
async def reviews_placeholder():
    return {"message": "Reviews endpoints will be implemented in a future module"}

@placeholder_router.get("/notifications", tags=["Notifications Placeholder"])
async def notifications_placeholder():
    return {"message": "Notifications endpoints will be implemented in a future module"}

@placeholder_router.get("/admin", tags=["Admin Placeholder"])
async def admin_placeholder():
    return {"message": "Admin endpoints will be implemented in a future module"}


api_router.include_router(placeholder_router)
