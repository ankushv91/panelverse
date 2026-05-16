from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import get_db, require_admin
from app.api.domains.user.schema import UserCompleteDetails
from app.api.domains.comic.schema import ComicDetail, ChapterDetail
from app.api.domains.comic.service.comic import get_all_comics, delete_comic, change_comic_approval
from app.api.domains.comic.service.chapter import delete_chapter_pages, get_comic_chapters_query, change_chapter_approval
from app.api.domains.user.model import User
from app.api.domains.user.service import delete_user
from app.api.domains.comment.schema import CommentDeleted
from app.api.domains.comment.service import delete_comment

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.patch("/comics/comic_approval/{comic_id}", status_code=status.HTTP_200_OK)
def change_comic_approval_endpoint(
    comic_id: int,
    new_approval: Literal["pending", "approved", "rejected"] = "approved",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)):
    return change_comic_approval(db, comic_id, new_approval, current_user)

@router.patch("/comics/chapters/chapter_approval/{chapter_id}", status_code=status.HTTP_200_OK)
def change_chapter_approval_endpoint(
    chapter_id: int,
    new_approval: Literal["pending", "approved", "rejected"] = "approved",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)):
    return change_chapter_approval(db, chapter_id, new_approval)

@router.get("/comics/{comic_id}/chapters", response_model=list[ChapterDetail], status_code=status.HTTP_200_OK)
def get_pending_chapters_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int =  0,
    approval_status: Literal["pending", "approved", "rejected"] = "pending",
    current_user:  User = Depends(require_admin)
):
    return get_comic_chapters_query(db, comic_id, limit, offset, approval_status, current_user)

@router.get("/comics", response_model=list[ComicDetail], status_code=status.HTTP_200_OK)
def get_all_pending_comics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    limit: int = 10,
    offset: int = 0,
    genre_ids: list[int] | None = Query(None),
    order_by: Literal["latest", "oldest", "popular"] = "oldest",
    approval_status: Literal["pending", "approved", "rejected"] = "pending",
    author_id: int | None = None,
    bookmarked: bool | None = None
):
    return get_all_comics(db, current_user, limit, offset, genre_ids, order_by, approval_status, author_id, bookmarked)

@router.delete("/comments/{comment_id}", response_model=CommentDeleted)
def delete_comment_endpoint(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return delete_comment(db, comment_id, current_user)

@router.delete("/comics/{comic_id}/chapters", status_code=status.HTTP_200_OK)
def delete_chapter_pages_endpoint(
    comic_id: int,
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return delete_chapter_pages(db, comic_id, chapter_id, current_user)

@router.delete("/comics/{comic_id}", status_code=status.HTTP_200_OK)
def delete_comic_endpoint(
    comic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return delete_comic(db, comic_id, current_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return delete_user(db, user_id, current_user)

@router.get("/me", response_model=UserCompleteDetails)
def get_me_admin_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
    ):
    current_admin = db.query(User).filter(User.id == current_user.id).first()

    if not current_admin:
        raise HTTPException(
            status_code=404, 
            detail="Admin profile not found"
        )
    
    return current_admin