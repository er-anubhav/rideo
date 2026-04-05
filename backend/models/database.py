"""
Database Configuration Module
=============================

This module handles all database-related configuration including:
- Async SQLAlchemy engine creation
- Session management
- Base model class
- Database initialization

Database: PostgreSQL (via asyncpg driver)
ORM: SQLAlchemy 2.0+ with async support

Connection String Format:
------------------------
    postgresql://user:password@host:port/database

The module automatically converts this to async format:
    postgresql+asyncpg://user:password@host:port/database

Usage:
------
    from models.database import get_db, init_db, Base
    
    # In FastAPI endpoint
    async def my_endpoint(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))
        users = result.scalars().all()
    
    # Initialize tables on startup
    await init_db()

Environment Variables:
---------------------
    DATABASE_URL: PostgreSQL connection string
    Default: postgresql://postgres:postgres@localhost:5432/rideshare_db
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Get database URL from environment
# Default to local PostgreSQL if not specified
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/rideshare_db"
)

# Convert standard PostgreSQL URL to async URL
# asyncpg is the async driver for PostgreSQL
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine
# echo=False to disable SQL logging (set to True for debugging)
engine = create_async_engine(
    ASYNC_DATABASE_URL, 
    echo=False,              # Set True to log all SQL queries
    pool_size=10,            # Connection pool size
    max_overflow=20,         # Max connections beyond pool_size
    pool_pre_ping=True       # Verify connections before use
)

# Create async session factory
# expire_on_commit=False prevents detached instance errors
async_session = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base class for all models
# All models should inherit from this class
Base = declarative_base()


async def get_db():
    """
    Dependency function for FastAPI to get database session.
    
    Yields an async database session that automatically closes
    after the request is complete.
    
    Usage:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    
    Yields:
        AsyncSession: Database session for the request
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """
    Initialize database tables.
    
    Creates all tables defined by models that inherit from Base.
    Safe to call multiple times - only creates tables that don't exist.
    
    Should be called on application startup.
    
    Note: For production, consider using Alembic for migrations
    instead of create_all().
    """
    async with engine.begin() as conn:
        # Create all tables
        # run_sync is needed because create_all is synchronous
        await conn.run_sync(Base.metadata.create_all)
