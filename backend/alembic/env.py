import asyncio
import os
import sys
from logging.config import fileConfig
from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config

# Ensure project root is importable so `backend` package resolves
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# now import models & settings
try:
    from backend.models import models_async as models  # noqa
    from backend.config.settings import settings
except Exception as e:
    # surface a clearer error if imports fail
    raise RuntimeError(f"Failed to import backend models/settings: {e}") from e

# Alembic config object
config = context.config

# Safe logging config: only call fileConfig if the file exists and has a [formatters] section
cfg_file = config.config_file_name
try:
    if cfg_file and os.path.exists(cfg_file):
        # guard against KeyError from missing sections
        fileConfig(cfg_file, disable_existing_loggers=False)
except Exception:
    # don't fail migrations because logging config is missing/broken
    pass

target_metadata = models.Base.metadata

def run_migrations_offline():
    """
    Run migrations in 'offline' mode.
    This configures the context with a URL and not an Engine, though it still
    allows generation of migration SQL without DB connection.
    """
    url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    """
    Synchronous migration runner used by the async wrapper.
    """
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    """
    Run migrations in 'online' mode using an async engine.
    The URL is taken from settings and adjusted for asyncpg.
    """
    url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    # Use the alembic config sections if present, but ensure url overrides to settings.
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        url=url,
        pool_pre_ping=True,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    # Run the async migration entrypoint
    asyncio.run(run_migrations_online())
