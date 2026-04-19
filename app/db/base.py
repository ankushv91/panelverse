from sqlalchemy.orm import declarative_base

Base = declarative_base()

#  register models
from app.api.domains.user import model