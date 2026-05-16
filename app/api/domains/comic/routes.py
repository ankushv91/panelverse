from fastapi import APIRouter, Depends, status, Response, Query
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import get_db, get_current_user, get_current_user_optional, require_author, require_admin
from app.api.domains.comic.schema import ComicCreate, ComicDetail, ComicCompleteDetail, ComicEdit, ChapterDetail, ChapterCompleteDetail, ChapterCreate, PageDetail, PageCreate, GenreDetail, BookmarkDetail, RatingDetail, RatingUpsert, ReadingProgressUpsert, ReadingProgressDetail
from app.api.domains.comic.service.comic import create_comic, get_all_comics, get_comic, edit_comic, delete_comic
from app.api.domains.comic.service.interaction import create_bookmark_interaction, delete_bookmark_interaction, rate_comic, delete_rating, get_rating, upsert_reading_progress, get_reading_progress
from app.api.domains.comic.service.query import get_genres_query
from app.api.domains.comic.service.chapter import add_chapter_pages, delete_chapter_pages, get_comic_chapters_query, get_chapter_pages_query
from app.api.domains.user.model import User

router = APIRouter(prefix="/comics", tags=["Comics"])

@router.post("/", response_model=ComicDetail, status_code=status.HTTP_201_CREATED)
def create_comic_endpoint(
    comic_data: ComicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return create_comic(db, comic_data, current_user)
    
@router.get("/", response_model=list[ComicDetail], status_code=status.HTTP_200_OK)
def get_all_comics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
    limit: int = 10,
    offset: int = 0,
    genre_ids: list[int] | None = Query(None),
    order_by: Literal["latest", "oldest", "popular"] = "latest",
    approval_status: Literal["pending", "approved", "rejected"] = "approved",
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

@router.post("/{comic_id}/chapters", response_model=ChapterCompleteDetail, status_code=status.HTTP_200_OK)
def add_chapter_pages_endpoint(
    comic_id: int,
    chapter_data: ChapterCreate,
    page_data: list[PageCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return add_chapter_pages(db, comic_id, chapter_data, page_data, current_user)

@router.delete("/{comic_id}/chapters", status_code=status.HTTP_200_OK)
def delete_chapter_pages_endpoint(
    comic_id: int,
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return delete_chapter_pages(db, comic_id, chapter_id, current_user)
    

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

@router.get("/reading_progress", status_code=status.HTTP_200_OK, response_model=list[ReadingProgressDetail] | ReadingProgressDetail)
def get_reading_progress_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    onlyLast: bool | None = None,
    comic_id: int | None = None
):
    return get_reading_progress(db, current_user, onlyLast, comic_id)

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
    db: Session = Depends(get_db),
    current_user: User =  Depends(get_current_user_optional) # for bookmark status
):
    return get_comic(db, comic_id, current_user)

@router.patch("/{comic_id}", response_model=ComicCompleteDetail, status_code=status.HTTP_200_OK)
def edit_comic_endpoint(
    comic_data: ComicEdit,
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return edit_comic(db, comic_data, comic_id, current_user)

@router.delete("/{comic_id}", status_code=status.HTTP_200_OK)
def delete_comic_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return delete_comic(db, comic_id, current_user)