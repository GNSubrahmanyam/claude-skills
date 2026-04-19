---
title: Testing in Containers
impact: MEDIUM-HIGH
impactDescription: Ensures reliable testing in containerized environments
tags: docker, testing, containers, ci-cd, isolation
---

## Testing in Containers

**Problem:**
Testing in containers requires proper isolation, dependency management, and cleanup. Poor testing practices lead to flaky tests, resource leaks, and unreliable CI/CD pipelines.

**Solution:**
Implement comprehensive testing strategies for containerized applications with proper test isolation, database management, and cleanup procedures.

❌ **Wrong: Testing without containers**
```bash
# Tests run on host machine - environment differences
pytest tests/
```

✅ **Correct: Containerized testing**
```dockerfile
# Dockerfile.test
FROM python:3.11-slim-bookworm AS test

# Install system dependencies for testing
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        build-essential \
        postgresql-client \
        redis-tools \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create test user
RUN groupadd -r testuser && useradd -r -g testuser testuser

# Copy and install dependencies
WORKDIR /app
COPY --chown=testuser:testuser requirements.txt requirements-test.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-test.txt

# Copy application code
COPY --chown=testuser:testuser . .

# Switch to test user
USER testuser

# Default test command
CMD ["pytest", "tests/", "-v", "--tb=short", "--cov=app", "--cov-report=xml"]
```

**Docker Compose for testing:**
```yaml
version: '3.8'

services:
  # Test database (isolated)
  test-postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    volumes:
      - test_postgres_data:/var/lib/postgresql/data
    tmpfs:
      - /tmp
      - /var/run/postgresql
    networks:
      - test

  # Test cache
  test-redis:
    image: redis:7-alpine
    command: redis-server --appendonly no
    tmpfs:
      - /data
    networks:
      - test

  # Test application
  test-app:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      - ENVIRONMENT=testing
      - DATABASE_URL=postgresql://test:test@test-postgres:5432/test_db
      - REDIS_URL=redis://test-redis:6379/0
      - SECRET_KEY=test-secret-key-for-testing-only
      - DEBUG=true
    volumes:
      - .:/app
      - /app/__pycache__
      - /app/.pytest_cache
    depends_on:
      test-postgres:
        condition: service_healthy
      test-redis:
        condition: service_healthy
    networks:
      - test
    command: >
      sh -c "
        python manage.py migrate --settings=config.testing &&
        pytest tests/ -v --tb=short --cov=app --cov-report=xml --cov-report=html &&
        python manage.py check --settings=config.testing
      "

  # Load testing
  load-test:
    image: locustio/locust:2.15.1
    volumes:
      - ./tests/load/locustfile.py:/mnt/locust/locustfile.py
    ports:
      - "8089:8089"
    environment:
      - LOCUST_HOST=http://test-app:8000
      - LOCUST_USERS=10
      - LOCUST_SPAWN_RATE=1
    depends_on:
      - test-app
    networks:
      - test
    profiles: ["load-test"]

volumes:
  test_postgres_data:
    driver: tmpfs  # In-memory for faster tests

networks:
  test:
    driver: bridge
```

**Test execution strategies:**
```bash
# Run all tests
docker-compose -f docker-compose.test.yml run --rm test-app

# Run specific test file
docker-compose -f docker-compose.test.yml run --rm test-app pytest tests/test_users.py -v

# Run with coverage
docker-compose -f docker-compose.test.yml run --rm test-app pytest --cov=app --cov-report=html

# Run load tests
docker-compose -f docker-compose.test.yml --profile load-test up load-test

# Clean up after testing
docker-compose -f docker-compose.test.yml down -v --remove-orphans
```

**CI/CD integration:**
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt -r requirements-test.txt

    - name: Run tests
      run: |
        python manage.py migrate
        pytest tests/ --cov=app --cov-report=xml --cov-report=html
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
        REDIS_URL: redis://localhost:6379/0

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
```

**Test data management:**
```python
# conftest.py - Test configuration
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine"""
    database_url = os.getenv("DATABASE_URL", "postgresql://test:test@localhost/test_db")
    engine = create_engine(database_url, echo=False)
    yield engine
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provide clean database session for each test"""
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()

    # Start transaction
    session.begin()

    try:
        yield session
    finally:
        session.rollback()  # Always rollback to keep tests isolated
        session.close()

@pytest.fixture(autouse=True)
def clean_redis():
    """Clean Redis before each test"""
    import redis
    redis_client = redis.Redis(host='localhost', port=6379, db=0)
    redis_client.flushdb()
    yield
    redis_client.flushdb()

# Test utilities
def create_test_user(db_session, **kwargs):
    """Helper to create test user"""
    from app.models import User
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        **kwargs
    }
    user = User(**user_data)
    db_session.add(user)
    db_session.commit()
    return user
```

**Integration testing:**
```python
# tests/test_integration.py
import pytest
import requests

def test_full_user_workflow():
    """Test complete user registration and login flow"""
    # This would run against the containerized application
    # with real database and cache

    # Register user
    response = requests.post("http://test-app:8000/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 201

    # Login
    response = requests.post("http://test-app:8000/auth/login", json={
        "username": "testuser",
        "password": "testpass123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Access protected endpoint
    response = requests.get("http://test-app:8000/users/me",
                          headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
```

**Performance testing in containers:**
```python
# tests/test_performance.py
import pytest
import time
from concurrent.futures import ThreadPoolExecutor

def test_concurrent_requests():
    """Test application performance under concurrent load"""
    def make_request():
        response = requests.get("http://test-app:8000/api/data")
        return response.status_code

    # Test with 10 concurrent requests
    with ThreadPoolExecutor(max_workers=10) as executor:
        start_time = time.time()
        results = list(executor.map(make_request, range(10)))
        end_time = time.time()

    # All requests should succeed
    assert all(code == 200 for code in results)

    # Should complete within reasonable time
    assert end_time - start_time < 5.0  # 5 seconds max
```

**Common mistakes:**
- Not isolating test databases
- Running tests in parallel without proper cleanup
- Not handling container startup time
- Missing health checks for test dependencies
- Not cleaning up test data between runs

**When to apply:**
- CI/CD pipeline testing
- Integration testing
- Performance testing
- Multi-service testing
- Environment consistency verification