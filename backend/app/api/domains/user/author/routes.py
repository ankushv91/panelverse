from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form
from typing import Literal
from sqlalchemy.orm import Session

from app.api.domains.user.schema import AuthorCompleteDetail
from app.api.domains.user.service import create_author, update_author_profile
from app.api.domains.user.model import User, Author
from app.api.deps import require_author, get_current_user
from app.api.deps import require_author
from app.api.deps import get_db
from app.api.domains.user.model import User
from app.api.domains.user.service import create_author
from app.api.deps import get_db, get_current_user, require_author
from app.api.domains.comic.schema import ComicDetail
from app.api.domains.user.model import User

from app.api.deps import get_db, get_current_user, require_author
from app.api.domains.comic.schema import ComicDetail
from app.api.domains.comic.schema import ComicDetail, AddChapterPages
from app.api.domains.comic.service.chapter import add_chapter_pages, delete_chapter_pages
from app.api.domains.comic.service.comic import create_comic
from app.api.domains.user.model import User

router = APIRouter(prefix="/author", tags=["Author"])


@router.patch("/me", response_model=AuthorCompleteDetail)
async def edit_author_profile_endpoint(
    name: str | None = Form(None, max_length=130),
    about: str | None = Form(None),    
    profile_pic: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return await update_author_profile(db, current_user, name, about, profile_pic)


@router.get("/me", response_model=AuthorCompleteDetail)
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
async def register_author_endpoint(
    name: str = Form(..., max_length=130),
    about: str | None = Form(None),    
    profile_pic: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    return await create_author(db, name, about, current_user, profile_pic)

@router.post("/comics", response_model=ComicDetail, status_code=status.HTTP_201_CREATED)
async def create_comic_endpoint(
    genre_ids: list[int] = Form([]), 
    cover_image: UploadFile | None = File(None),
    title: str = Form(..., max_length=255),
    comic_status: Literal["ongoing", "completed", "hiatus"] = Form("ongoing"),
    approval_status: Literal["pending", "approved", "rejected"] = Form("approved"),
    description: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return await create_comic(
        db=db, 
        current_user=current_user, 
        cover_image=cover_image, 
        title=title, 
        comic_status=comic_status, 
        description=description,
        genre_ids=genre_ids
    )

@router.post("/{comic_id}/chapters", response_model=AddChapterPages, status_code=status.HTTP_200_OK)
async def add_chapter_pages_endpoint(
    comic_id: int,
    chapter_no: float = Form(...),
    chapter_name: str = Form(...),
    pages: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return await add_chapter_pages(
        db=db,
        comic_id=comic_id,
        chapter_no=chapter_no,
        chapter_name=chapter_name,
        pages=pages,
        current_user=current_user
    )

@router.delete("/{comic_id}/chapters", status_code=status.HTTP_200_OK)
def delete_chapter_pages_endpoint(
    comic_id: int,
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_author)
):
    return delete_chapter_pages(db, comic_id, chapter_id, current_user)
    