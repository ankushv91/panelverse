from sqlalchemy.orm import declarative_base

Base = declarative_base()

# register models
from app.api.domains.user import model
from app.api.domains.comic import model
from app.api.domains.comment import model