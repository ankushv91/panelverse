from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import Literal
from app.api.domains.user.model import User
from app.core.s3 import upload_image_s3
from app.api.domains.comic.model import Chapter, Page, ComicAuthor
from app.api.domains.comic.schema import ChapterCompleteDetail, AddChapterPages, PageDetail
from app.api.domains.comic.service.query import get_comic_details_query

async def add_chapter_pages(
db: Session,
    comic_id: int,
    chapter_no: float,
    chapter_name: str,
    pages: list[UploadFile],
    current_user: User
) -> AddChapterPages:
    is_author = db.query(ComicAuthor).filter(
        ComicAuthor.comic_id == comic_id,
        ComicAuthor.author_id == current_user.id).first()
    
    if not is_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to add chapter to this comic")

    existing_chapter = db.query(Chapter).filter(
        Chapter.comic_id == comic_id,
        Chapter.chapter_no == chapter_no
    ).first()
    
    if existing_chapter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chapter {chapter_no} already exists for this comic."
        )
    
    try:
        new_chapter = Chapter(
            comic_id=comic_id,
            chapter_no=chapter_no,
            chapter_name=chapter_name,
        )
        db.add(new_chapter)
        db.flush()

        pages_created = []

        for index, page_file in enumerate(pages, start=1):
            
            uploaded_s3_url = await upload_image_s3(
                user_id=str(current_user.id),
                path=("authors", f"comics/{str(comic_id)}/chapters/{str(new_chapter.id)}/page_{index}"),
                file=page_file
            )

            new_page = Page(
                chapter_id=new_chapter.id,
                page_no=index,
                image_url=uploaded_s3_url
            )
            db.add(new_page)
            pages_created.append(new_page)
        
        db.flush()
        db.commit()
        
        db.refresh(new_chapter)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while saving the chapter: {str(e)}"
        )
    
    return AddChapterPages(
        id=new_chapter.id,
        chapter_no=new_chapter.chapter_no,
        chapter_name=new_chapter.chapter_name,
        pages=[
            PageDetail(
                id=p.id,
                page_no=p.page_no,
                image_url=p.image_url
                ) for p in pages_created
        ]
    )

def delete_chapter_pages(
        db: Session,
        comic_id: int,
        chapter_id: int,
        current_user: User
):
    is_author = db.query(ComicAuthor).filter(
        ComicAuthor.comic_id == comic_id,
        ComicAuthor.author_id == current_user.id).first()
    
    if not is_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to add chapter to this comic")
    
    chapter = db.query(Chapter).filter(
        Chapter.comic_id == comic_id,
        Chapter.chapter_id == chapter_id
    ).first()

    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    
    db.delete(chapter)
    db.commit()

    return {
        "details":"Chapter and all associated pages successfully deleted!"
    }

def get_comic_chapters_query(
        db: Session,
        comic_id: int,
        limit: int | None = None,
        offset: int | None = None,
        approval_status: Literal["pending", "approved", "rejected"] = "approved",
        current_user: User | None = None
    ):
    chapters = (
        db.query(Chapter)
        .filter(
        Chapter.comic_id == comic_id,
        Chapter.approval_status == approval_status
        )
        .order_by(Chapter.chapter_no.desc())            
    )
     
    if limit:
        chapters = chapters.limit(limit).offset(offset)

    chapters = chapters.all()

    return chapters

def get_chapter_pages_query(
        db: Session,
        comic_id,
        chapter_id: int
    ):

    comic = get_comic_details_query(db, comic_id)

    chapter = db.query(Chapter).filter(
        Chapter.id == chapter_id
    ).first()

    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    
    pages = (
        db.query(Page)
        .filter(
            Page.chapter_id == chapter_id,
        )
        .order_by(Page.page_no.asc())
        .all()
    )

    chapter.view_count += 1
    comic.view_count += 1

    db.commit()

    return ChapterCompleteDetail(
        id=chapter.id,
        chapter_no=chapter.chapter_no,
        chapter_name=chapter.chapter_name,
        comic_id=comic.id,
        comic_title=comic.title,
        pages=[
            PageDetail(
                id=p.id,
                page_no=p.page_no,
                image_url=p.image_url
                ) for p in pages
        ]
    )

def change_chapter_approval(
        db: Session,
        chapter_id: int,
        new_approval: Literal["pending", "approved", "rejected"] = "approved"
):
    chapter = db.query(Chapter).filter(
        Chapter.id == chapter_id
    ).first()

    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    
    chapter.approval_status = new_approval
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occured while changing chapter approval status: {str(e)}"
            )
    
    return {
        "detail": f"Approval status changed to {new_approval}",
    }