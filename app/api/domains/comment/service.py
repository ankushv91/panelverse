from sqlalchemy.orm import Session, aliased
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.api.domains.comment.model import Comment
from app.api.domains.user.model import User
from app.api.domains.comment.schema import CommentCreate, CommentDetail
from fastapi import HTTPException, status

def create_comment(
        db: Session,
        comment_data: CommentCreate,
        current_user: User
):
    new_comment = Comment(
        user_id = current_user.id,
        content = comment_data.content,
        comic_id = comment_data.comic_id,
        chapter_id = comment_data.chapter_id,
        parent_comment_id = comment_data.parent_comment_id,
        reply_to_user_id = comment_data.reply_to_user_id
    )

    if new_comment.parent_comment_id is not None:
        parent = db.query(Comment).filter(Comment.id == new_comment.parent_comment_id).first()
        if parent and parent.parent_comment_id is not None:
    
            new_comment.parent_comment_id = parent.parent_comment_id
    
    try:
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Provide either comic id or chapter id only")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    new_comment.username = current_user.username

    return new_comment

def delete_comment(
        db: Session,
        comment_id: int,
        current_user: User
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this comment")
    
    # if its a parent comment, reassigning and scrambling handled by db trigger
    db.delete(comment)
    db.commit()

    return comment

def get_root_comments(
    db: Session,
    limit: int = 10,
    offset: int = 0,
    comic_id: int = None,
    chapter_id: int = None
) -> list[CommentDetail]:
    
    query = db.query(Comment, User.username).join(
        User,
        Comment.user_id == User.id
    ).filter(Comment.parent_comment_id == None)

    if comic_id:
        query = query.filter(Comment.comic_id == comic_id)
    elif chapter_id:
        query = query.filter(Comment.chapter_id == chapter_id)
    else:
        raise HTTPException(status_code=400, detail="No Comic or Chapter id provided")

    root_results = query.order_by(
        Comment.created_at.desc()
        ).limit(limit).offset(offset).all()

    if not root_results:
        return []

    root_ids = [r[0].id for r in root_results]

    replies_count = db.query(
        Comment.parent_comment_id,
        func.count(Comment.id)
    ).filter(
        Comment.parent_comment_id.in_(root_ids)
        ).group_by(
            Comment.parent_comment_id
            ).all()
    
    counts_dict = {pid: count for pid, count in replies_count}

    results = []
    for root, username in root_results:

        d = {c.name: getattr(root, c.name) for c in root.__table__.columns}

        d["username"] = username
        d["reply_to_username"] = None
        d["parent_comment_id"] = None
        d["reply_count"] = counts_dict.get(root.id, 0)

        results.append(d)

    return results

def get_comment_replies(
        db: Session,
        parent_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> list[CommentDetail]:
    ReplyToUser = aliased(User)

    query = (
        db.query(Comment, User.username, ReplyToUser.username)
        .join(User, Comment.user_id == User.id)
        .outerjoin(ReplyToUser, Comment.reply_to_user_id == ReplyToUser.id)
        .filter(Comment.parent_comment_id == parent_id)
        .order_by(Comment.created_at.asc())
        .limit(limit)
        .offset(offset)
    )

    reply_results = query.all()

    results = []
    for reply, username, reply_to_username in reply_results:
        d = {c.name: getattr(reply, c.name) for c in reply.__table__.columns}
        d["username"] = username
        d["reply_to_username"] = reply_to_username
        d["reply_count"] = 0
        results.append(d)

    return results