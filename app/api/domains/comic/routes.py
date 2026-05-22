from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import get_db, get_current_user, get_current_user_optional, require_author
from app.api.domains.comic.schema import ComicDetail, ChapterDetail, ChapterCompleteDetail, GenreDetail, BookmarkDetail, RatingDetail, RatingUpsert, ReadingProgressUpsert, ReadingProgressDetail, ReadingProgressComicDetail, ComicCompleteDetail
from app.api.domains.comic.service.comic import get_all_comics, get_comic, edit_comic, delete_comic
from app.api.domains.comic.service.interaction import create_bookmark_interaction, delete_bookmark_interaction, rate_comic, delete_rating, get_rating, upsert_reading_progress, get_reading_progress, get_reading_progress_comics
from app.api.domains.comic.service.query import get_genres_query
from app.api.domains.comic.service.chapter import get_comic_chapters_query, get_chapter_pages_query
from app.api.domains.user.model import User

router = APIRouter(prefix="/comics", tags=["Comics"])
    
@router.get("/", response_model=list[ComicDetail], status_code=status.HTTP_200_OK)
def get_all_comics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
    limit: int = 10,
    offset: int = 0,
    genre_ids: list[int] | None = Query(None),
    order_by: Literal["latest", "oldest", "popular"] = "latest",
    approval_status: Literal["pending", "approved", "rejected"] | None = "approved",
    author_id: int | None = None,
    bookmarked: bool | None = None
    ):
    return get_all_comics(db, current_user, limit, offset, genre_ids, order_by, approval_status, author_id, bookmarked)

@router.get("/genres", response_model=list[GenreDetail], status_code=status.HTTP_200_OK)
def get_genres_endpoint(db: Session = Depends(get_db), comic_id: int | None = None):
    print(comic_id)
    return get_genres_query(db, comic_id)

@router.post("/bookmarks", response_model=BookmarkDetail, status_code=status.HTTP_201_CREATED)
def create_bookmark_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_bookmark_interaction(db, comic_id, current_user)

@router.delete("/bookmarks", response_model=BookmarkDetail, status_code=status.HTTP_200_OK)
def delete_bookmark_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_bookmark_interaction(db, comic_id, current_user)
    
@router.put("/rating", response_model=RatingDetail, status_code=status.HTTP_200_OK)
def rate_comic_endpoint(
    new_rating: RatingUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return rate_comic(
        db,
        new_rating,
        current_user
    )

@router.delete("/rating", response_model=RatingDetail, status_code=status.HTTP_200_OK)
def delete_rating_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_rating(db, comic_id, current_user)

@router.get("/rating", response_model=RatingDetail, status_code=status.HTTP_200_OK)
def get_rating_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_rating(db, comic_id, current_user)

@router.get("/{comic_id}/chapters", response_model=list[ChapterDetail], status_code=status.HTTP_200_OK)
def get_chapters_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int =  0,
    approval_status: Literal["pending", "approved", "rejected"] = "approved"
):
    return get_comic_chapters_query(db, comic_id, limit, offset, approval_status)

@router.get("/{chapter_id}/pages", response_model=ChapterCompleteDetail, status_code=status.HTTP_200_OK)
def get_chapter_pages_endpoint(
    comic_id,
    chapter_id: int,
    db: Session = Depends(get_db)
):
    return get_chapter_pages_query(db, comic_id, chapter_id)

@router.get("/reading_progress", status_code=status.HTTP_200_OK, response_model=list[ReadingProgressDetail])
def get_reading_progress_endpoint(
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0,
    only_last: bool | None = None,
    current_user: User = Depends(get_current_user),
):
    return get_reading_progress(db, current_user, limit, offset, only_last)

# For ComicCard UI Component
@router.get("/reading_progress_comics", status_code=status.HTTP_200_OK, response_model=list[ReadingProgressComicDetail])
def get_reading_progress_comics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 10,
    offset: int = 0
):
    return get_reading_progress_comics(db, current_user, limit, offset)

@router.put("/reading_progress/{comic_id}/{chapter_id}/{page_id}", status_code=status.HTTP_200_OK, response_model=ReadingProgressDetail)
def upsert_reading_progress_endpoint(
    reading_progress: ReadingProgressUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return upsert_reading_progress(db, reading_progress, current_user)

@router.get("/{comic_id}", response_model=ComicCompleteDetail, status_code=status.HTTP_200_OK)
def get_comic_endpoint(
    comic_id: int,
    approved_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User =  Depends(get_current_user_optional) # for bookmark status
):
    return get_comic(db, comic_id,approved_only, current_user)


@router.patch("/{comic_id}", response_model=ComicCompleteDetail, status_code=status.HTTP_200_OK)
async def edit_comic_endpoint(
    comic_id: int,
    cover_image: UploadFile | None = File(None),
    title: str = Form(None, max_length=255),
    comic_status: Literal["ongoing", "completed", "hiatus"] = Form("ongoing"),
    approval_status: Literal["pending", "approved", "rejected"] = Form("approved"),
    description: str | None = Form(None),
    genre_ids: list[int] = Form([]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return await edit_comic(
        db=db,
        current_user=current_user,
        comic_id=comic_id,
        cover_image=cover_image,
        title=title,
        comic_status=comic_status,
        description=description,
        genre_ids=genre_ids
        )

@router.delete("/{comic_id}", status_code=status.HTTP_200_OK)
def delete_comic_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return delete_comic(db, comic_id, current_user)