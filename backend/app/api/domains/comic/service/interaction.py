from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from app.api.domains.user.model import User
from app.api.domains.comic.model import Bookmark, Comic, Rating, ReadingProgress, Chapter
from app.api.domains.comic.schema import RatingDetail, RatingUpsert, ReadingProgressUpsert, ReadingProgressDetail, ReadingProgressComicDetail
from fastapi import HTTPException, status

def create_bookmark_interaction(
        db: Session,
        comic_id: int,
        current_user: User
    ) -> Bookmark:
    new_bookmark = Bookmark(
        user_id = current_user.id,
        comic_id = comic_id
    )

    comic = db.query(Comic).filter(
        Comic.id == comic_id, 
        Comic.approval_status == "approved"
    ).first()

    if not comic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comic does not exist"
            )
    
    does_exist = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.comic_id == comic_id).first()
    
    if does_exist:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bookmark already exists"
        )

    db.add(new_bookmark)
    db.commit()
    try:
        db.commit()
        db.refresh(new_bookmark)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bookmark already exists"
            )

    return new_bookmark

def delete_bookmark_interaction(
        db: Session,
        comic_id: int,
        current_user: User
    ) -> Bookmark:
    bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.comic_id == comic_id
    ).first()

    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    db.delete(bookmark)
    db.commit()

    return bookmark

def rate_comic(
    db: Session,
    rating_data: RatingUpsert,
    current_user: User
) -> Rating:
    
    existing_rating = db.query(Rating).filter(
        Rating.user_id == current_user.id,
        Rating.comic_id == rating_data.comic_id
    ).first()

    try:
        if existing_rating:
            existing_rating.rating = rating_data.rating
            active_rating_obj = existing_rating
        else:
            new_rating_obj = Rating(
                user_id=current_user.id,
                comic_id=rating_data.comic_id,
                rating=rating_data.rating
            )
            db.add(new_rating_obj)
            active_rating_obj = new_rating_obj
    
        db.flush() 
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Enter a valid rating value"
        )

    average_rating, rating_count = db.query(
        func.avg(Rating.rating),
        func.count(Rating.user_id)
    ).filter(
        Rating.comic_id == rating_data.comic_id
    ).first()

    final_average = round(average_rating * 2) / 2 if average_rating is not None else 0.0

    comic = db.query(Comic).filter(Comic.id == rating_data.comic_id).first()
    if comic:
        comic.avg_rating = final_average
        comic.rating_count = rating_count

    db.commit()
    db.refresh(active_rating_obj)
    return active_rating_obj

def delete_rating(db: Session, comic_id: int, current_user: User) -> Rating:
    rating = db.query(Rating).filter(
        Rating.user_id == current_user.id,
        Rating.comic_id == comic_id
    ).first()
    
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    db.delete(rating)
    db.flush() 

    average_rating, rating_count = db.query(
        func.avg(Rating.rating),
        func.count(Rating.user_id)
    ).filter(
        Rating.comic_id == comic_id
    ).first()

    final_average = round(average_rating * 2) / 2 if average_rating is not None else 0.0

    comic = db.query(Comic).filter(Comic.id == comic_id).first()
    if comic:
        comic.avg_rating = final_average
        comic.rating_count = rating_count

    db.commit()
    return rating

def get_rating(db: Session, comic_id, current_user: User) -> RatingDetail:
    rating = db.query(Rating).filter(
        Rating.user_id == current_user.id,
        Rating.comic_id == comic_id).first()
    
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    return rating

def upsert_reading_progress(
        db: Session,
        reading_progress: ReadingProgressUpsert,
        current_user: User
):
    
    existing_entry = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id,
        ReadingProgress.comic_id == reading_progress.comic_id
    ).first()

    if existing_entry:
        existing_entry.chapter_id = reading_progress.chapter_id
        existing_entry.page_id = reading_progress.page_id
    else:
        new_entry = ReadingProgress(
            user_id = current_user.id,
            comic_id = reading_progress.comic_id,
            chapter_id = reading_progress.chapter_id,
            page_id = reading_progress.page_id
        )
        db.add(new_entry)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occured while creating progress: {str(e)}"
            )

    if existing_entry:
        db.refresh(existing_entry)
        return existing_entry
    
    db.refresh(new_entry)
    return new_entry

def get_reading_progress(
    db: Session,
    current_user: User,
    only_last: bool | None = None,
    comic_id: int | None = None
) -> list[ReadingProgressDetail] | ReadingProgressDetail:
    
    query = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id
    ).order_by(ReadingProgress.updated_at.desc())
    
    if comic_id:
        query = query.filter(ReadingProgress.comic_id == comic_id)

    if only_last:
        result = query.first()
        if not result:
            raise HTTPException(status_code=404, detail="No reading progress found")
        return result
    
    return query.all()
def get_reading_progress_comics(
    db: Session,
    current_user: User,
    limit: int = 10,
    offset: int = 0
) -> list[ReadingProgressComicDetail]:
    results = (
        db.query(Comic, Chapter, ReadingProgress.updated_at)
        .join(ReadingProgress, ReadingProgress.comic_id == Comic.id)
        .join(Chapter, ReadingProgress.chapter_id == Chapter.id)
        .filter(ReadingProgress.user_id == current_user.id)
        .order_by(ReadingProgress.updated_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    continue_reading_list = []
    
    for comic, chapter, updated_at in results:
        continue_reading_list.append({
            "id": comic.id,
            "title": comic.title,
            "cover_image_url": comic.cover_image_url,
            "avg_rating": comic.avg_rating,
            "comic_status": comic.comic_status,
            "view_count": comic.view_count,
            "continue_chapter": {
                "id": chapter.id,
                "chapter_no": chapter.chapter_no
            },
            "updated_at": updated_at # Reading Progress row
        })

    return continue_reading_list