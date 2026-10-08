from datetime import time
from app.services.attendance_service import attendance_service

def test_attendance_status_for_time():
    # Before 09:30 should be Present
    on_time = time(9, 15, 0)
    assert attendance_service.get_attendance_status_for_time(on_time) == "Present"

    # Exactly 09:30 should be Present
    at_start = time(9, 30, 0)
    assert attendance_service.get_attendance_status_for_time(at_start) == "Present"

    # After 09:30 should be Late
    late_time = time(9, 31, 0)
    assert attendance_service.get_attendance_status_for_time(late_time) == "Late"

    very_late = time(10, 45, 0)
    assert attendance_service.get_attendance_status_for_time(very_late) == "Late"

def test_attendance_cooldown_behavior():
    test_user_id = 99999
    # Initially not in cooldown
    is_active, remaining = attendance_service.is_cooldown_active(test_user_id)
    assert is_active is False

    # Mark last seen
    attendance_service.record_last_seen(test_user_id)

    # Immediately should be active
    is_active, remaining = attendance_service.is_cooldown_active(test_user_id)
    assert is_active is True
    assert remaining > 0
