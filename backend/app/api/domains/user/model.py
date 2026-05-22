from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Identity, CheckConstraint, func, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, Identity(always=True), primary_key=True)

    username = Column(String(30), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)

    profile_pic_url = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    is_deleted = Column(Boolean, nullable=False, server_default="false")

    role = Column(
        String(10), 
        nullable=False, 
        server_default="user"
    )
    
    __table_args__ = (
        CheckConstraint("role IN ('user', 'author', 'admin')"),
    )

class Author(Base):
    __tablename__ = 'authors'

    author_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True)

    name = Column(String(130), nullable=False)
    about = Column(Text)
    profile_pic_url = Column(Text)

    comic_authors = relationship(
        "ComicAuthor",
        back_populates="author"
    )