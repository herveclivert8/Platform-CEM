import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Table, Text, Column, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CityStatus(str, enum.Enum):
    ACTIVE = "active"
    COMING_SOON = "coming_soon"
    INACTIVE = "inactive"


class ProjectCategory(str, enum.Enum):
    EDUCATION = "education"
    HEALTH = "health"
    WATER = "water"
    ENVIRONMENT = "environment"
    EMERGENCY = "emergency"


class NewsCategory(str, enum.Enum):
    NEWS = "news"
    REPORT = "report"
    UPDATE = "update"


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    continent: Mapped[str] = mapped_column(String(50), nullable=False)

    # Géolocalisation
    latitude: Mapped[float] = mapped_column(Numeric(10, 8), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(11, 8), nullable=False)

    # Descriptions
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_image: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Contact
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    physical_address: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Statut & Stats
    status: Mapped[CityStatus] = mapped_column(
        Enum(CityStatus, name="city_status", values_callable=lambda e: [m.value for m in e]),
        default=CityStatus.ACTIVE,
        nullable=False,
    )
    active_projects: Mapped[int] = mapped_column(Integer, default=0)
    active_volunteers: Mapped[int] = mapped_column(Integer, default=0)
    beneficiaries: Mapped[int] = mapped_column(Integer, default=0)
    years_present: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relations
    projects: Mapped[list["CityProject"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    news: Mapped[list["CityNews"]] = relationship(back_populates="city", cascade="all, delete-orphan")
    team_members: Mapped[list["CityTeamMember"]] = relationship(back_populates="city", cascade="all, delete-orphan")


class CityProject(Base):
    __tablename__ = "city_projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ProjectCategory] = mapped_column(
        Enum(ProjectCategory, name="project_category", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )

    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    target_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    raised_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0)

    status: Mapped[str] = mapped_column(String(50), default="active")  # active, completed, paused

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    city: Mapped["City"] = relationship(back_populates="projects")


class CityNews(Base):
    __tablename__ = "city_news"

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    excerpt: Mapped[str | None] = mapped_column(String(512), nullable=True)

    category: Mapped[NewsCategory] = mapped_column(
        Enum(NewsCategory, name="news_category", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )

    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    published: Mapped[bool] = mapped_column(default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    city: Mapped["City"] = relationship(back_populates="news")


class CityTeamMember(Base):
    __tablename__ = "city_team_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    city: Mapped["City"] = relationship(back_populates="team_members")
