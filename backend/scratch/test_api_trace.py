import os
import sys

# Add app to path
sys.path.insert(0, os.path.abspath("."))

from app.core.database import SessionLocal
from app.services.assignment_service import AssignmentService

db = SessionLocal()

print("--- TESTING AssignmentService.list_admin_bookings ---")
bookings = AssignmentService.list_admin_bookings(db, page=1, page_size=10)
print(f"Total bookings returned: {len(bookings)}")

for b in bookings[:3]:
    print(f"\nBooking ID: {b.id}, Number: {b.booking_number}, Status: {b.status}")
    print(f"  Client: {b.client}")
    print(f"  Selected Freelancer: {b.selected_freelancer}")
    print(f"  Assigned Freelancer: {b.freelancer}")
    print(f"  Active Assignment: {b.active_assignment}")
    print(f"  Payment Summary: {b.payment_summary}")

if bookings:
    latest_id = bookings[0].id
    print(f"\n--- TESTING AssignmentService.get_admin_booking_detail for ID {latest_id} ---")
    detail = AssignmentService.get_admin_booking_detail(db, latest_id)
    print(f"Detail title: {detail.title}")
    print(f"Detail client: {detail.client}")
    print(f"Detail selected_freelancer: {detail.selected_freelancer}")
    print(f"Detail freelancer: {detail.freelancer}")
    print(f"Detail assignments count: {len(detail.assignments)}")

db.close()
