---
title: JWT Token Security
impact: CRITICAL
impactDescription: Protects against unauthorized access and token tampering
tags: fastapi, security, jwt, authentication
---

## JWT Token Security

**Problem:**
Improper JWT implementation can lead to security vulnerabilities, token replay attacks, and unauthorized access to protected resources. Common issues include missing expiration, weak secrets, and improper token validation.

**Solution:**
Use secure JWT libraries, implement proper token validation, include expiration times, and store sensitive information securely. Never store passwords in JWT tokens.

❌ **Wrong: Insecure JWT implementation**
```python
import jwt

SECRET = "weak-secret"  # Too short, hardcoded

@app.post("/login")
async def login(username: str, password: str):
    # No password verification shown
    token = jwt.encode({"user": username}, SECRET, algorithm="HS256")
    return {"token": token}  # No expiration!

@app.get("/protected")
async def protected(token: str):
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
        return {"user": data["user"]}
    except:
        return {"error": "Invalid token"}
```

✅ **Correct: Secure JWT implementation**
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # From environment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    username = verify_token(token)
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return await get_user_by_username(username)
```

**Common mistakes:**
- Using short or hardcoded secrets
- Storing sensitive data in JWT payload
- Not setting token expiration
- Not validating token signatures properly
- Using outdated JWT libraries

**When to apply:**
- User authentication systems
- API authorization
- Session management
- Any token-based security