from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserTokenProfile(BaseModel):
    id: int
    name: str
    email: EmailStr
    employee_id: str
    department: str
    role: str
    is_active: bool
    is_enrolled: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserTokenProfile


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
