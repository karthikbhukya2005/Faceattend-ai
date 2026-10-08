import pytest
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token

def test_password_hashing():
    raw_pwd = "SecurePassword123!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_generation_and_decoding():
    payload = {"sub": "101", "email": "test@faceattend.ai", "role": "admin"}
    token = create_access_token(payload)
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_token(token)
    assert decoded["sub"] == "101"
    assert decoded["email"] == "test@faceattend.ai"
    assert decoded["role"] == "admin"
    assert "exp" in decoded
