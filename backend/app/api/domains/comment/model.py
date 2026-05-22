from sqlalchemy import Column, Integer, String, DateTime, Boolean, Identity, CheckConstraint, func, ForeignKey
from app.db.base import Base

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, Identity(always=True), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"))
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"))
    parent_comment_id = Column(Integer, ForeignKey("comments.id", ondelete="RESTRICT"))
    reply_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    content = Column(String(1000), nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    is_edited = Column(Boolean, server_default="false")

    __table_args__ = (
        CheckConstraint(
            "(comic_id IS NOT Null)::int + (chapter_id IS NOT NULL)::int = 1"
            ),
    )