from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Literal
from app.api.domains.comic.model import Comic, ComicAuthor, ComicGenre, Chapter, Bookmark
from app.api.domains.comic.schema import ComicCreate, ComicDetail, ComicCompleteDetail, ComicEdit
from app.api.domains.user.model import User
from fastapi import HTTPException, status, Query

from app.api.domains.comic.service.query import get_comic_authors_query, get_bookmark_status_query, get_comic_details_query, get_genres_query

def create_comic(
        db: Session,
        comic_data: ComicCreate, 
        current_user: User
    ) -> Comic:

    new_comic = Comic(
        title=comic_data.title,
        description=comic_data.description,
        cover_image_url=comic_data.cover_image_url,
        comic_status=comic_data.comic_status
    )

    try:
        db.add(new_comic)
        db.flush()

        comic_author = ComicAuthor(
            comic_id=new_comic.id,
            author_id=current_user.id
        )

        db.add(comic_author)

        for genre_id in comic_data.genre_ids:
            comic_genre = ComicGenre(
                comic_id=new_comic.id,
                genre_id=genre_id
            )

            db.add(comic_genre)

        db.commit()
        db.refresh(new_comic)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occured while creating the comic"
        )
    
    return new_comic

def edit_comic(
        db: Session,
        comic_data: ComicEdit,
        comic_id: int,
        current_user: User
) -> ComicDetail:
    
    comic = get_comic_details_query(db, comic_id)
    if not comic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comic not found")
    
    isAuthor = db.query(ComicAuthor).filter(
            ComicAuthor.comic_id == comic_id,
            ComicAuthor.author_id == current_user.id
        ).first()

    if not isAuthor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to edit this comic"
        )

    try:
        update_data = comic_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key != "genre_ids":
                setattr(comic, key, value)

        if comic_data.genre_ids is not None:
            current_genres = get_genres_query(db, comic.id)
            current_genre_ids = {g.id for g in current_genres}
            new_genre_ids = set(comic_data.genre_ids)

            ids_to_remove = current_genre_ids - new_genre_ids
            if ids_to_remove:
                db.query(ComicGenre).filter(
                    ComicGenre.comic_id == comic_id,
                    ComicGenre.genre_id.in_(ids_to_remove)
                ).delete(synchronize_session=False)

            for gid in new_genre_ids:
                if gid not in current_genre_ids:
                    db.add(ComicGenre(comic_id=comic_id, genre_id=gid))


        if comic_data.new_author_ids is not None:
            existing_authors = get_comic_authors_query(db, comic.id)
            existing_author_ids = {a.author_id for a in existing_authors}

            for auth_id in comic_data.new_author_ids:
                if auth_id not in existing_author_ids:
                    db.add(ComicAuthor(comic_id=comic_id, author_id=auth_id))
            
        db.commit()
        db.refresh(comic)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error occurred while editing the comic: {str(e)}"
        )
    
    authors = get_comic_authors_query(db, comic.id)
    genres = get_genres_query(db, comic.id)
    is_bookmarked = get_bookmark_status_query(db, current_user, comic.id)

    return ComicCompleteDetail(
        id=comic.id,
        title=comic.title,
        description=comic.description,
        cover_image_url=comic.cover_image_url,
        comic_status=comic.comic_status,
        avg_rating=comic.avg_rating,
        last_chapter_at=comic.last_chapter_at,
        authors=authors,
        genres=genres,
        isBookmarked=is_bookmarked
    )

def delete_comic(db: Session, comic_id: int, current_user: User):
    comic = get_comic_details_query(db, comic_id)
    if not comic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comic not found")
    
    isAuthor = db.query(ComicAuthor).filter(
        ComicAuthor.comic_id == comic_id,
        ComicAuthor.author_id == current_user.id).first()
    
    if not isAuthor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to delete this comic")
    
    try:
        db.query(Comic).filter(Comic.id == comic_id).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occured while deleting the comic: {str(e)}"
            )
    
    return {"details": "Comic deleted successufully"}


def get_all_comics(
        db: Session,
        current_user: User | None,
        limit: int,
        offset: int,
        genre_ids: list[int] | None = Query(None),
        order_by: Literal["latest", "oldest", "popular"] = "latest",
        approval_status: Literal["pending", "approved", "rejected"] = "approved",
        author_id: int | None = None,
        bookmarked: bool | None = None
    ):
    # achieving latest chapter using Distinct (row_number in actual use, this is just for reference)
    """
    latest_chapter_subq = (
        db.query(
            Chapter.comic_id,
            Chapter.id.label("chapter_id"),
            Chapter.chapter_no
        )
        .filter(Chapter.approval_status == "approved")
        .order_by(Chapter.comic_id, Chapter.chapter_no.desc())
        .distinct(Chapter.comic_id)
        .subquery()
    ) """

    # get chapter rows ranked
    ranked_subq = (
    db.query(
        Chapter.comic_id,
        Chapter.id.label("chapter_id"),
        Chapter.chapter_no,
        func.row_number()
        .over(
            partition_by=Chapter.comic_id,
            order_by=Chapter.chapter_no.desc()
        )
        .label("rn")
    )
    .filter(Chapter.approval_status == approval_status)
    .subquery()
)
    # filter ranked chapter rows for the latest
    latest_chapter_subq = (
    db.query(ranked_subq)
    .filter(ranked_subq.c.rn == 1)
    .subquery()
)
    
    # final query comic + latest chapter
    query = (
        db.query(
            Comic,
            latest_chapter_subq.c.chapter_id,
            latest_chapter_subq.c.chapter_no
        )
        .outerjoin(
            latest_chapter_subq,
            Comic.id == latest_chapter_subq.c.comic_id
        )
        .filter(Comic.approval_status == approval_status)
    )

    if author_id is not None:
        query = query.join(
            ComicAuthor,
            ComicAuthor.comic_id == Comic.id
        ).filter(
            ComicAuthor.author_id == author_id
            )
    
    if bookmarked and current_user is not None:
        query = query.join(
            Bookmark,
            Bookmark.comic_id == Comic.id
        ).filter(
            Bookmark.user_id == current_user.id
        )
    elif bookmarked and current_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please log in to see bookmarks"
        )

    if genre_ids:
        query = (
            query.join(ComicGenre, ComicGenre.comic_id == Comic.id)
            .filter(ComicGenre.genre_id.in_(genre_ids))
            .group_by(Comic.id, latest_chapter_subq.c.chapter_id, latest_chapter_subq.c.chapter_no)
            .having(func.count(ComicGenre.genre_id) == len(genre_ids))
        )

    if order_by == "oldest":
        query = query.order_by(Comic.last_chapter_at.asc())
    elif order_by == "popular":
        query = query.order_by(Comic.view_count.desc(), Comic.avg_rating.desc())
    else:
        query = query.order_by(Comic.last_chapter_at.desc())
        
    query = query.limit(limit).offset(offset)

    # to print sql query generated
    # print(str(query.statement.compile(compile_kwargs={"literal_binds": True})))

    results = query.all()

    comic_detail = []

    for comic, chapter_id, chapter_no in results:
        comic_detail.append({
            "id": comic.id,
            "title": comic.title,
            "cover_image_url": comic.cover_image_url,
            "avg_rating": comic.avg_rating,
            "comic_status": comic.comic_status,
            "view_count": comic.view_count,
            "latest_chapter": {
                    "id": chapter_id,
                    "chapter_no": chapter_no
                } if chapter_id is not None else None
        })

    return comic_detail

def get_comic(
        db: Session,
        comic_id: int,
        current_user: User | None = None
) -> ComicCompleteDetail:
    comic = get_comic_details_query(db, comic_id)
    authors = get_comic_authors_query(db, comic.id)
    genres = get_genres_query(db, comic.id)
    
    isBookmarked = get_bookmark_status_query(db, current_user, comic.id)

    return ComicCompleteDetail(
        id=comic.id,
        title=comic.title,
        description=comic.description,
        cover_image_url=comic.cover_image_url,
        comic_status=comic.comic_status,
        avg_rating=comic.avg_rating,
        view_count=comic.view_count,
        last_chapter_at=comic.last_chapter_at,
        authors=authors,
        genres=genres,
        isBookmarked=isBookmarked
    )

# Unused monolithic query, now moved to moduler service funcions, this is jist for reference
"""
def get_comic(
    db: Session,
    comic_id: int
):

    comic = (
        db.query(Comic)
        .options(
            joinedload(Comic.comic_authors)
            .joinedload(ComicAuthor.author),

            joinedload(Comic.comic_genres)
            .joinedload(ComicGenre.genre),
        )
        .filter(
            Comic.id == comic_id,
            Comic.approval_status == "approved"
        )
        .first()
    )

    if not comic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comic not found"
        )

    authors = [ca.author for ca in comic.comic_authors]

    genres = [cg.genre for cg in comic.comic_genres]

    chapters = (
        db.query(Chapter)
        .filter(
            Chapter.comic_id==comic_id,
            Chapter.approval_status=="approved"
            )
        .order_by(Chapter.chapter_no.desc())
        .limit(10)
        .all()
    )

    return {
        "id": comic.id,
        "title": comic.title,
        "description": comic.description,
        "cover_image_url": comic.cover_image_url,
        "comic_status": comic.comic_status,
        "avg_rating": comic.avg_rating,
        "last_chapter_at": comic.last_chapter_at,

        "authors": authors,
        "genres": genres,
        "chapters": chapters
    } """


def change_comic_approval(
        db: Session,
        comic_id: int,
        new_approval: Literal["pending", "approved", "rejected"] = "approved"
):
    comic = get_comic_details_query(db, comic_id)

    if not comic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comic not found")
    
    comic.approval_status = new_approval
    
    try:
        chapters = (
            db.query(Chapter)
            .filter(
            Chapter.comic_id == comic_id,
            Chapter.approval_status == "pending"
            ).update(
                {"approval_status": new_approval},
                synchronize_session=False
            )
        )

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occured while changing comic and chapters approval status: {str(e)}"
            )
    
    return {
        "detail": f"Approval status changed to {new_approval}",
    }