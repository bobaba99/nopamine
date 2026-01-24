# Python Backend Minimal Directory Structure

A clean, minimal Python backend structure with routes and API endpoints.

## Directory Structure

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py           # Application entry point
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── api.py        # Route definitions
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints/
│   ├── models/           # Data models
│   ├── schemas/          # Pydantic/schemas
│   └── database/         # DB connection
├── requirements.txt
└── README.md
```

## Key Files

### app/main.py (FastAPI Example)

```python
from fastapi import FastAPI
from app.routes import api

app = FastAPI()
app.include_router(api.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

### app/routes/api.py

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/users")
def get_users():
    return [{"id": 1, "name": "John"}]

@router.post("/users")
def create_user(user: dict):
    return {"id": 2, **user}
```

### app/routes/v1/endpoints/users.py

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_users():
    return []

@router.get("/{user_id}")
def get_user(user_id: int):
    return {"id": user_id}
```

## Flask Alternative

```python
from flask import Flask, Blueprint

api = Blueprint('api', __name__)

@api.route('/users', methods=['GET'])
def get_users():
    return {"users": []}
```

## Best Practices

- Use versioned APIs (`/api/v1/`)
- Separate route definitions from business logic
- Group related endpoints by resource
- Keep `__init__.py` files for package imports
