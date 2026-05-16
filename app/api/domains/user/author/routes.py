from fastapi import APIRouter, Depends, status, Response, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Literal

from app.api.domains.user.schema import UserCreate, UserCompleteDetails, UserUpdate, AuthorCreate, AuthorCompleteDetail, AuthorUpdate, RegisterResponse
from app.api.domains.user.service import create_user, create_author, update_user_profile, delete_user, update_author_profile
from app.api.domains.user.model import User, Author
from app.api.deps import require_admin, require_author, get_current_user
from app.api.deps import require_author
from app.core.security import create_access_token
from app.api.deps import get_db, require_admin
from app.api.domains.comic.schema import ComicCreate, ComicDetail, ComicCompleteDetail, ComicEdit, ChapterDetail, ChapterCompleteDetail, ChapterCreate, PageDetail, PageCreate, GenreDetail, BookmarkDetail, RatingDetail, RatingUpsert, ReadingProgressUpsert, ReadingProgressDetail
from app.api.domains.comic.service.comic import create_comic, get_all_comics, get_comic, edit_comic, delete_comic, change_comic_approval
from app.api.domains.comic.service.chapter import add_chapter_pages, delete_chapter_pages, get_comic_chapters_query, get_chapter_pages_query, change_chapter_approval
from app.api.domains.user.model import User
from app.api.domains.user.service import create_user, create_author, update_user_profile, delete_user, update_author_profile
from app.api.domains.comment.schema import CommentDeleted
from app.api.domains.comment.service import delete_comment

router = APIRouter(prefix="/author", tags=["Author"])


@router.patch("/me/author", response_model=AuthorCompleteDetail)
def edit_author_profile_endpoint(
    updated_data: AuthorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return update_author_profile(db, current_user, updated_data)


@router.get("/me/author", response_model=AuthorCompleteDetail)
def get_me_author_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
    ):
    current_author = db.query(Author).filter(Author.author_id == current_user.id).first()

    if not current_author:
        raise HTTPException(
            status_code=404, 
            detail="Author profile not found"
        )
    
    return current_author

@router.post("/register_author", response_model=AuthorCompleteDetail, status_code=status.HTTP_201_CREATED)
def register_author_endpoint(
    author_data: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    return create_author(db, author_data, current_user)