from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class FaceEnrollRequest(BaseModel):
    user_id: int
    image_base64: str = Field(..., description="Base64 encoded JPEG or PNG image")


class FaceEnrollResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    model_name: str
    bounding_box: Optional[BoundingBox] = None


class FaceRecognizeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded video frame snapshot")


class FaceRecognizeResponse(BaseModel):
    success: bool
    message: str
    recognized: bool
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    confidence: Optional[float] = None  # e.g., 0.94
    distance: Optional[float] = None
    bounding_box: Optional[BoundingBox] = None
    attendance_marked: bool = False
    attendance_status: Optional[str] = None  # Present, Late, or Ignored (Cooldown)
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    cooldown_active: bool = False
    cooldown_seconds_remaining: Optional[int] = 0


class FaceStatusResponse(BaseModel):
    user_id: int
    is_enrolled: bool
    enrolled_at: Optional[datetime] = None
    model_name: Optional[str] = None
