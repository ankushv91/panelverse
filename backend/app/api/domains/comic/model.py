from sqlalchemy import Column, Integer, String, Text, DateTime, Identity, CheckConstraint, func, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Comic(Base):
    __tablename__ = 'comics'

    id = Column(Integer, Identity(always=True), primary_key=True)

    title = Column(String(255), nullable=False)
    description = Column(Text)
    cover_image_url = Column(Text)

    comic_status = Column(
        String(15),
        nullable=False,
        server_default="ongoing")
    
    approval_status = Column(
        String(15),
        nullable=False,
        server_default="pending")
    
    view_count = Column(Integer, nullable=False, server_default="0")

    avg_rating = Column(Numeric(2, 1), nullable=False, server_default="0")
    rating_count = Column(Integer, nullable=False, server_default="0")

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    last_chapter_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("comic_status IN('ongoing', 'completed', 'hiatus')"),
        CheckConstraint("approval_status IN('pending', 'approved', 'rejected')"),
    )

    comic_authors = relationship(
        "ComicAuthor",
        back_populates="comic"
    )

    comic_genres = relationship(
        "ComicGenre",
        back_populates="comic"
    )

    chapters = relationship(
        "Chapter",
        back_populates="comic"
    )


class Genre(Base):
    __tablename__ = 'genres'

    id = Column(Integer, Identity(always=True), primary_key=True)
    genre_type = Column(String(25), nullable=False, unique=True)

    comic_genres = relationship(
        "ComicGenre",
        back_populates="genre"
    )


class Chapter(Base):
    __tablename__ = 'chapters'

    id = Column(Integer, Identity(always=True), primary_key=True)
    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"))
    chapter_no = Column(Numeric(4, 1), nullable=False)
    chapter_name = Column(String(255))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    view_count = Column(Integer, nullable=False, server_default="0")
    

    approval_status = Column(
        String(15),
        nullable=False,
        server_default="pending")

    __table_args__ = (
        CheckConstraint("approval_status IN('pending', 'approved', 'rejected')"),
        UniqueConstraint("comic_id", "chapter_no")
    )

    comic = relationship(
        "Comic",
        back_populates="chapters"
    )
    
class Page(Base):
    __tablename__ = 'pages'

    id = Column(Integer, Identity(always=True), primary_key=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    page_no = Column(Integer, nullable=False)
    image_url = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint('chapter_id', 'page_no', name='uix_chapter_page'),
    )
    
class ComicAuthor(Base):
    __tablename__ = 'comic_authors'

    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"), primary_key=True)
    author_id = Column(Integer, ForeignKey("authors.author_id", ondelete="CASCADE"), primary_key=True)

    comic = relationship(
        "Comic",
        back_populates="comic_authors"
    )

    author = relationship(
        "Author",
        back_populates="comic_authors"
    )
    

class ComicGenre(Base):
    __tablename__ = 'comic_genres'

    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    genre_id = Column(Integer, ForeignKey("genres.id", ondelete="CASCADE"), nullable=False, primary_key=True)

    comic = relationship(
        "Comic",
        back_populates="comic_genres"
    )

    genre = relationship(
        "Genre",
        back_populates="comic_genres"
    )

class Bookmark(Base):
    __tablename__ = 'bookmarks'

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

class Rating(Base):
    __tablename__ = 'ratings'
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    rating = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
 
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
    )

class ReadingProgress(Base):
    __tablename__ = 'reading_progress'

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    comic_id = Column(Integer, ForeignKey("comics.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    page_id = Column(Integer, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    updated_at = Column(DateTime, nullable=False, server_default=func.now())
