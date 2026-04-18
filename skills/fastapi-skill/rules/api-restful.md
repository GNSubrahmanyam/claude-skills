# RESTful API Design (HIGH)

**Impact:** HIGH - Ensures consistent and intuitive API interfaces

**Problem:**
Inconsistent API design leads to poor developer experience, integration difficulties, and maintenance issues. APIs that don't follow REST principles are harder to understand and use.

**Solution:**
Follow RESTful conventions with proper HTTP methods, status codes, and resource naming. Use consistent URL patterns and response formats.

❌ **Wrong: Non-RESTful design**
```python
@app.post("/get_user")  # Wrong HTTP method
async def get_user_endpoint(user_id: int):
    user = await get_user(user_id)
    return {"data": user, "status": "success"}  # Inconsistent response format

@app.post("/delete_user")  # Wrong HTTP method
async def delete_user_endpoint(user_id: int):
    await delete_user(user_id)
    return {"message": "User deleted", "status": 200}  # Wrong status code approach
```

✅ **Correct: RESTful API design**
```python
@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """GET /users/{id} - Retrieve a specific user"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """POST /users/ - Create a new user"""
    db_user = User(**user.dict())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, user_update: UserUpdate, db: AsyncSession = Depends(get_db)):
    """PUT /users/{id} - Update a user completely"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """DELETE /users/{id} - Delete a user"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return None
```

**Common mistakes:**
- Using wrong HTTP methods (POST for retrieval)
- Inconsistent URL patterns (/users/get vs /users/)
- Not using proper HTTP status codes
- Inconsistent response formats
- Missing resource relationships in URLs

**When to apply:**
- All public API endpoints
- Resource-based operations (CRUD)
- Any client-facing API
- REST API design and implementation