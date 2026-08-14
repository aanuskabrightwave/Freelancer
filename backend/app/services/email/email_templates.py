from typing import Dict, Optional

def render_transactional_email(
    headline: str,
    body_text: str,
    details: Dict[str, str],
    cta_text: Optional[str] = None,
    cta_link: Optional[str] = None
) -> str:
    """
    Renders a premium, centralized HTML layout for transactional marketplace emails.
    """
    # Build details rows
    details_html = ""
    if details:
        details_html += '<div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">'
        for k, v in details.items():
            details_html += f'<div style="margin-bottom: 8px; font-size: 13px;"><strong style="color: #475569;">{k}:</strong> <span style="color: #0f172a; float: right;">{v}</span></div>'
        details_html += '</div>'

    # Build CTA button
    cta_html = ""
    if cta_text and cta_link:
        cta_html = f"""
        <div style="margin: 25px 0; text-align: center;">
            <a href="{cta_link}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                {cta_text}
            </a>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{headline}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); border: 1px solid #e2e8f0;">
            <!-- Brand Header -->
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <span style="font-size: 16px; font-weight: 900; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
                    Creative Marketplace
                </span>
            </div>

            <!-- Content Area -->
            <div style="padding: 35px 30px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 15px;">
                    {headline}
                </h1>
                
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                    {body_text}
                </p>

                {details_html}

                {cta_html}

                <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                    <p style="margin: 0 0 5px 0;">This is a transactional message related to your account on Creative Marketplace.</p>
                    <p style="margin: 0;">&copy; 2026 Creative Marketplace. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html


def get_template_data(event_code: str, payload: dict, frontend_url: str) -> dict:
    """
    Returns (subject, headline, body_text, details, cta_text, cta_link) mapped by event_code.
    """
    subject = "New notification alert"
    headline = "New Update Available"
    body_text = "Important updates occurred regarding your account."
    details = {}
    cta_text = "View Dashboard"
    cta_link = f"{frontend_url}/login"

    if event_code == "PROPOSAL_RECEIVED":
        subject = "New Proposal Received"
        headline = "New Proposal Submitted"
        body_text = f"{payload.get('freelancer_name')} has submitted a proposal for your project: {payload.get('project_title')}."
        details = {
            "Project": payload.get("project_title", ""),
            "Freelancer": payload.get("freelancer_name", ""),
            "Agreed Budget": f"₹{payload.get('budget', '')}"
        }
        cta_text = "View Proposals"
        cta_link = f"{frontend_url}/client/projects/{payload.get('project_id')}/proposals"

    elif event_code == "PROPOSAL_SHORTLISTED":
        subject = "Your Proposal was Shortlisted!"
        headline = "Proposal Shortlisted"
        body_text = f"Congratulations! Your proposal for project '{payload.get('project_title')}' has been shortlisted by the client."
        details = {
            "Project": payload.get("project_title", ""),
            "Status": "Shortlisted"
        }
        cta_text = "View Proposals"
        cta_link = f"{frontend_url}/freelancer/proposals"

    elif event_code == "PROPOSAL_ACCEPTED":
        subject = "Your Proposal has been Accepted!"
        headline = "Proposal Accepted"
        body_text = f"Your proposal for '{payload.get('project_title')}' was accepted! A booking request has been created."
        details = {
            "Project": payload.get("project_title", ""),
            "Total Cost": f"₹{payload.get('budget', '')}"
        }
        cta_text = "View Booking"
        cta_link = f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "PROPOSAL_REJECTED":
        subject = "Proposal Status Update"
        headline = "Proposal Status"
        body_text = f"The client has completed selection and declined your proposal for project '{payload.get('project_title')}'."
        details = {
            "Project": payload.get("project_title", ""),
            "Status": "Declined"
        }
        cta_text = "View Dashboard"
        cta_link = f"{frontend_url}/freelancer/dashboard"

    elif event_code == "BOOKING_REQUESTED":
        subject = "New Booking Request Received"
        headline = "New Booking Request"
        body_text = f"A client wants to book your package '{payload.get('service_title')}' for scheduled date {payload.get('scheduled_date')}."
        details = {
            "Service Package": payload.get("service_title", ""),
            "Client Name": payload.get("client_name", ""),
            "Agreed Rate": f"₹{payload.get('agreed_amount', '')}",
            "Scheduled Date": payload.get("scheduled_date", "")
        }
        cta_text = "Manage Booking"
        cta_link = f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "BOOKING_CONFIRMED":
        subject = "Your Booking has been Confirmed!"
        headline = "Booking Confirmed"
        body_text = f"{payload.get('freelancer_name')} has accepted your booking request."
        details = {
            "Booking ID": payload.get("booking_number", ""),
            "Provider": payload.get("freelancer_name", ""),
            "Scheduled Date": payload.get("scheduled_date", "")
        }
        cta_text = "View Booking"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}"

    elif event_code == "BOOKING_REJECTED":
        subject = "Booking Request Update"
        headline = "Booking Declined"
        body_text = f"The booking request for '{payload.get('service_title')}' has been declined by the provider."
        details = {
            "Booking ID": payload.get("booking_number", ""),
            "Provider": payload.get("freelancer_name", ""),
            "Status": "Declined"
        }
        cta_text = "View Bookings"
        cta_link = f"{frontend_url}/client/bookings"

    elif event_code == "BOOKING_CANCELLED":
        subject = "Booking Cancellation Notice"
        headline = "Booking Cancelled"
        body_text = f"The booking '{payload.get('booking_number')}' has been cancelled by the other participant."
        details = {
            "Booking ID": payload.get("booking_number", ""),
            "Cancelled By": payload.get("cancelled_by", ""),
            "Reason": payload.get("reason", "Not provided")
        }
        cta_text = "View Booking details"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "BOOKING_RESCHEDULE_REQUESTED":
        subject = "Reschedule Requested for Booking"
        headline = "Reschedule Requested"
        body_text = f"A reschedule request has been submitted for booking '{payload.get('booking_number')}'."
        details = {
            "Booking ID": payload.get("booking_number", ""),
            "Proposed Date": payload.get("proposed_date", ""),
            "Proposed Time": payload.get("proposed_time", ""),
            "Reason": payload.get("reason", "")
        }
        cta_text = "Manage Request"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "BOOKING_RESCHEDULE_ACCEPTED":
        subject = "Reschedule Request Approved"
        headline = "Reschedule Request Approved"
        body_text = f"The reschedule request for booking '{payload.get('booking_number')}' has been accepted."
        details = {
            "Booking ID": payload.get("booking_number", ""),
            "New Scheduled Date": payload.get("proposed_date", "")
        }
        cta_text = "View Booking"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "BOOKING_RESCHEDULE_REJECTED":
        subject = "Reschedule Request Declined"
        headline = "Reschedule Request Declined"
        body_text = f"The reschedule request for booking '{payload.get('booking_number')}' has been declined."
        details = {
            "Booking ID": payload.get("booking_number", "")
        }
        cta_text = "View Booking"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "BOOKING_STARTED":
        subject = "Your Booking has Started"
        headline = "Booking In Progress"
        body_text = f"Your booking '{payload.get('booking_number')}' is now marked active and in progress."
        details = {
            "Booking ID": payload.get("booking_number", ""),
            "Freelancer": payload.get("freelancer_name", "")
        }
        cta_text = "Open Workspace"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}/workspace" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}/workspace"

    elif event_code == "MESSAGE_RECEIVED":
        subject = "New message received"
        headline = "New Message"
        body_text = f"You received a new message from {payload.get('sender_name')} regarding project booking."
        details = {
            "From": payload.get("sender_name", ""),
            "Message Preview": payload.get("text_preview", "")
        }
        cta_text = "View Chat"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}/workspace" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}/workspace"

    elif event_code == "PAYMENT_SUCCESS":
        subject = "Payment Successful!"
        headline = "Payment Successful"
        body_text = f"Your payment of ₹{payload.get('amount')} was successful and secured for booking."
        details = {
            "Payment ID": payload.get("payment_number", ""),
            "Booking Number": payload.get("booking_number", ""),
            "Secured Amount": f"₹{payload.get('amount', '')}"
        }
        cta_text = "View Booking Details"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}"

    elif event_code == "PAYMENT_FAILED":
        subject = "Payment Transaction Failed"
        headline = "Payment Failed"
        body_text = "An attempt to capture payment for your booking request was unsuccessful."
        details = {
            "Booking Number": payload.get("booking_number", ""),
            "Secured Amount": f"₹{payload.get('amount', '')}",
            "Status": "Failed"
        }
        cta_text = "Retry Payment"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}/payment"

    elif event_code == "REFUND_PROCESSED":
        subject = "Refund Request Processed"
        headline = "Refund Completed"
        body_text = f"A refund of ₹{payload.get('amount')} has been processed successfully for your cancellation request."
        details = {
            "Booking Number": payload.get("booking_number", ""),
            "Refunded Amount": f"₹{payload.get('amount', '')}",
            "Transaction Status": "Refunded"
        }
        cta_text = "View Bookings"
        cta_link = f"{frontend_url}/client/bookings"

    elif event_code == "DELIVERY_PREVIEW_SUBMITTED":
        subject = "A Preview was Delivered for Review"
        headline = "Delivery Preview Ready"
        body_text = "The creative professional uploaded a preview files delivery. Please review the output."
        details = {
            "Booking Number": payload.get("booking_number", ""),
            "Item Type": "Preview Draft"
        }
        cta_text = "Open Workspace"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}/workspace"

    elif event_code == "REVISION_REQUESTED":
        subject = "Revision Requested by Client"
        headline = "Revision Requested"
        body_text = "The client requested changes regarding your preview submission. Please check instructions."
        details = {
            "Booking Number": payload.get("booking_number", ""),
            "Status": "Revision Requested"
        }
        cta_text = "Open Workspace"
        cta_link = f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}/workspace"

    elif event_code == "FINAL_DELIVERY_SUBMITTED":
        subject = "Final Delivery Submitted!"
        headline = "Final Delivery Ready"
        body_text = "The final delivery files were submitted. Please check, accept or ask for revisions."
        details = {
            "Booking Number": payload.get("booking_number", ""),
            "Files": "Final Uploads"
        }
        cta_text = "Open Workspace"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}/workspace"

    elif event_code == "BOOKING_COMPLETED":
        subject = "Booking Completed Successfully"
        headline = "Booking Completed"
        body_text = f"Congratulations! Booking {payload.get('booking_number')} is marked completed. Thank you for using the platform!"
        details = {
            "Booking Number": payload.get("booking_number", ""),
            "Status": "Completed"
        }
        cta_text = "View Details"
        cta_link = f"{frontend_url}/client/bookings/{payload.get('booking_id')}" if payload.get("role") == "client" else f"{frontend_url}/freelancer/bookings/{payload.get('booking_id')}"

    elif event_code == "REVIEW_RECEIVED":
        subject = "You Received a New Review!"
        headline = "New Feedback Received"
        body_text = f"A client submitted a verified review. You received a {payload.get('rating')} star rating."
        details = {
            "Overall Rating": f"{payload.get('rating', '')} Stars",
            "Reviewer": payload.get("client_name", "")
        }
        cta_text = "View Reviews"
        cta_link = f"{frontend_url}/freelancer/reviews"

    elif event_code == "PAYOUT_PROCESSED":
        subject = "Your Payout was Processed!"
        headline = "Payout Completed"
        body_text = f"Great news! A payout of ₹{payload.get('amount')} was processed and transferred by our system."
        details = {
            "Payout ID": payload.get("payout_number", ""),
            "Transfer Amount": f"₹{payload.get('amount', '')}",
            "Status": "Processed"
        }
        cta_text = "View Earnings"
        cta_link = f"{frontend_url}/freelancer/earnings/payouts"

    return {
        "subject": subject,
        "headline": headline,
        "body_text": body_text,
        "details": details,
        "cta_text": cta_text,
        "cta_link": cta_link
    }
