from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.api.domains.user.model import User
from app.api.domains.comment.schema import CommentDetail, CommentCreate, CommentDeleted
from app.api.domains.comment.service import create_comment, get_root_comments, get_comment_replies, delete_comment

router = APIRouter(prefix="/comments", tags=["Comments"])

@router.post("/", response_model=CommentDetail, status_code=status.HTTP_201_CREATED)
def create_comment_endpoint(
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  
):
    return create_comment(db, comment_data, current_user)
    
@router.delete("/{comment_id}", response_model=CommentDeleted)
def delete_comment_endpoint(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_comment(db, comment_id, current_user)

@router.get("/", status_code=status.HTTP_200_OK, response_model=list[CommentDetail])
def get_root_comments_endpoint(
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0,
    comic_id: int | None = None,
    chapter_id: int | None = None
):
    return get_root_comments(db, limit, offset, comic_id, chapter_id)

@router.get("/{comment_id}/replies", response_model=list[CommentDetail])
def get_replies_endpoint(
    comment_id: int,
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    return get_comment_replies(db, comment_id, limit, offset)