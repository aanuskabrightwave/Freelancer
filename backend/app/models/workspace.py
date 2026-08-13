from sqlalchemy import Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship, backref
from app.core.database import Base


class BookingWorkspace(Base):
    __tablename__ = "booking_workspaces"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    booking = relationship("Booking", back_populates="workspace")

    def __repr__(self) -> str:
        return f"<BookingWorkspace id={self.id} booking_id={self.booking_id}>"
