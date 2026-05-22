from fastapi import FastAPI
from fastapi import Depends
from typing import List
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.domains.user.model import User
from app.api.domains.user.schema import UserCompleteDetails

from app.api.domains.user.routes import router as user_router
from app.api.domains.auth.routes import router as auth_ruter
from app.api.domains.user.admin.routes import router as admin_router
from app.api.domains.user.author.routes import router as author_router
from app.api.domains.comic.routes import router as comic_router
from app.api.domains.comment.routes import router as comment_router
from app.api.domains.storage.routes import router as storage_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PanelVerse API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(auth_ruter)
app.include_router(comic_router)
app.include_router(comment_router)
app.include_router(admin_router)
app.include_router(author_router)
app.include_router(
    storage_router,
    prefix="/storage",
    tags=["Storage"]
)

@app.get("/")
def root():
    return {"message": "PanelVerse API is running"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"status": "DB connected"}

@app.get("/test-users", response_model=List[UserCompleteDetails])
def test_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users