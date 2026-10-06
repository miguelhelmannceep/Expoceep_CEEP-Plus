import os
import shutil
from pathlib import Path
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
REAL_DB = BACKEND_DIR / "ceep_plus.db"
TEST_DB = BACKEND_DIR / "test_ceep_plus.db"

# Set DATABASE_URL to test database before any test module or app is loaded
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Garante que a suite de testes execute em base isolada com fixtures necessárias."""
    # Clona a base limpa oficial da escola para o ambiente de testes
    if REAL_DB.exists():
        shutil.copyfile(REAL_DB, TEST_DB)

    # Popula fixtures específicas dos testes automatizados
    from app.db.session import SessionLocal
    from app.db.seed import seed_test_fixtures
    db = SessionLocal()
    seed_test_fixtures(db)
    db.close()

    yield

    # Limpeza após encerramento da suite
    if TEST_DB.exists():
        try:
            TEST_DB.unlink()
        except Exception:
            pass
