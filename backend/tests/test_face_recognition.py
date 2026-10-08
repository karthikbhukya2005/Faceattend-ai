import base64
import io
import pytest
import numpy as np
from PIL import Image
from app.services.face_recognition_service import face_recognition_service

def create_sample_base64_image(color=(200, 180, 160)):
    """Create a test image in base64 format."""
    img = Image.new("RGB", (320, 240), color=color)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")

def test_decode_image_from_base64():
    base64_str = create_sample_base64_image()
    img = face_recognition_service.decode_image_from_base64(base64_str)
    assert isinstance(img, np.ndarray)
    assert img.shape == (240, 320, 3)

def test_extract_face_embedding_properties():
    base64_str = create_sample_base64_image()
    img = face_recognition_service.decode_image_from_base64(base64_str)
    fake_box = (50, 40, 120, 120)

    embedding = face_recognition_service.extract_face_embedding(img, fake_box)
    assert isinstance(embedding, list)
    assert len(embedding) == 128

    # Verify L2-norm is approximately 1.0
    norm = sum(x**2 for x in embedding) ** 0.5
    assert abs(norm - 1.0) < 0.05

def test_cosine_similarity():
    # Identical vectors should have similarity ~1.0
    vec1 = [0.1] * 128
    sim_identical = face_recognition_service.compute_similarity(vec1, vec1)
    assert abs(sim_identical - 1.0) < 1e-4

    # Opposite vectors should yield 0.0 (clipped)
    vec2 = [-0.1] * 128
    sim_opposite = face_recognition_service.compute_similarity(vec1, vec2)
    assert sim_opposite == 0.0

def test_invalid_base64_raises_error():
    with pytest.raises(ValueError):
        face_recognition_service.decode_image_from_base64("not-a-valid-base64-string!!!")
