---
title: Async Testing Setup
impact: MEDIUM-HIGH
impactDescription: Ensures reliable async testing
tags: fastapi, testing, async, httpx, pytest
---

## Async Testing Setup

**Problem:**
Testing async FastAPI applications without proper async test setup leads to unreliable tests and missed concurrency issues. Using synchronous test clients with async endpoints causes blocking and timeouts.

**Solution:**
Use httpx AsyncClient for async testing. Configure test database isolation and proper cleanup. Use pytest-asyncio for async test support.

❌ **Wrong: Synchronous testing**
```python
from fastapi.testclient import TestClient  # Synchronous client

def test_create_user():
    client = TestClient(app)
    response = client.post("/users/", json={"name": "test"})  # Blocks!
    assert response.status_code == 200
```

✅ **Correct: Async testing setup**
```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Test database setup
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost/test_db"

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(test_engine):
    async_session_maker = sessionmaker(test_engine, class_=AsyncSession)
    async with async_session_maker() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user(client, db_session):
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }

    response = await client.post("/users/", json=user_data)
    assert response.status_code == 201

    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_user_not_found(client):
    response = await client.get("/users/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"
```

**Common mistakes:**
- Using TestClient instead of AsyncClient
- Not using pytest.mark.asyncio
- Not properly isolating test database
- Not cleaning up test data between tests

**When to apply:**
- All FastAPI endpoint testing
- Integration tests with database
- Authentication and authorization testing
- API contract testing