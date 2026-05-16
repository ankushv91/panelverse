from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.api.domains.comic.model import Comic, ComicAuthor, ComicGenre, Chapter, Bookmark, Genre
from app.api.domains.user.model import User

def get_comic_details_query(db: Session, comic_id: int):
    comic = (
        db.query(Comic)
        .filter(
            Comic.id==comic_id,
                Comic.approval_status=="approved"
            )
            .first()
    )

    if not comic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comic not found"
        )
    
    return comic

def get_comic_authors_query(db: Session, comic_id: int):
    comic_authors = (
        db.query(ComicAuthor)
        .options(
            joinedload(ComicAuthor.author)
        )
        .filter(ComicAuthor.comic_id==comic_id)
        .all()
    )

    authors = [ca.author for ca in comic_authors]

    return authors

def get_genres_query(db: Session, comic_id: int | None = None):

    genres = db.query(Genre).order_by(Genre.genre_type.asc())

    if comic_id:
        genres = genres.join(ComicGenre).filter(ComicGenre.comic_id==comic_id)
    
    return genres.all()

def get_bookmark_status_query(db: Session, current_user: User, comic_id: int):
    if current_user is not None:
        query = (
            db.query(Bookmark)
            .filter(
                Bookmark.user_id == current_user.id,
                Bookmark.comic_id == comic_id)
                .first()
        )
    else:
        return False

    if query is None:
        return False
    else:
        return True