import json
import logging
import random
from datetime import date, datetime, time, timedelta
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.database import SessionLocal, init_db
from app.models.department import Department
from app.models.user import User
from app.models.face_embedding import FaceEmbedding
from app.models.attendance import Attendance
from app.services.face_recognition_service import face_recognition_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("faceattend.seed")

FIRST_NAMES = [
    "Aarav", "Aditi", "Ananya", "Arjun", "Bhavya", "Chirag", "Deepak", "Divya", "Esha", "Gaurav",
    "Harsh", "Ishita", "Jay", "Kavya", "Karthik", "Lavanya", "Manish", "Neha", "Nikhil", "Pooja",
    "Pranav", "Priya", "Rahul", "Rhea", "Rohan", "Sanjana", "Siddharth", "Sneha", "Tanvi", "Varun",
    "Alex", "David", "Emma", "James", "Liam", "Maya", "Noah", "Olivia", "Sophia", "Lucas",
    "Amina", "Chloe", "Daniel", "Ethan", "Fatima", "Gabriel", "Hannah", "Isaac", "Jasmine", "Leo"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Mehta", "Nair", "Iyer", "Rao", "Joshi", "Kapoor",
    "Singh", "Bhat", "Deshmukh", "Chopra", "Kulkarni", "Malhotra", "Banerjee", "Gupta", "Saxena", "Choudhury",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson", "Taylor"
]

DEPARTMENTS = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Communication",
    "Mechanical Engineering",
    "HR & Administration",
    "Business Operations",
]


def generate_synthetic_embedding(seed_val: int) -> list:
    """Generate a stable, deterministic normalized 128D embedding vector for demo enrolled users."""
    rng = random.Random(seed_val)
    raw = [rng.gauss(0, 1) for _ in range(128)]
    # L2 normalize
    norm = sum(x**2 for x in raw) ** 0.5
    return [round(x / norm, 6) for x in raw]


def seed_database(db: Session = None):
    """Seed departments, admin user, 100+ attendees, face embeddings, and 45 days of attendance history."""
    init_db()
    close_at_end = False
    if db is None:
        db = SessionLocal()
        close_at_end = True

    try:
        # 1. Seed Departments
        dept_objs = {}
        for dept_name in DEPARTMENTS:
            existing = db.query(Department).filter(Department.name == dept_name).first()
            if not existing:
                dept = Department(name=dept_name)
                db.add(dept)
                db.flush()
                dept_objs[dept_name] = dept
            else:
                dept_objs[dept_name] = existing

        logger.info(f"Seeded {len(DEPARTMENTS)} departments.")

        # 2. Seed Admin User
        admin_email = "admin@faceattend.ai"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="System Administrator",
                email=admin_email,
                employee_id="ADM-001",
                department="HR & Administration",
                role="admin",
                password_hash=get_password_hash("Admin@123"),
                is_active=True,
            )
            db.add(admin)
            db.flush()
            logger.info("Created default Admin user: admin@faceattend.ai / Admin@123")

        # 3. Seed Demo Student
        demo_student_email = "student@faceattend.ai"
        demo_student = db.query(User).filter(User.email == demo_student_email).first()
        if not demo_student:
            demo_student = User(
                name="Karthik Sharma",
                email=demo_student_email,
                employee_id="STU-001",
                department="Computer Science & Engineering",
                role="student",
                password_hash=get_password_hash("Student@123"),
                is_active=True,
            )
            db.add(demo_student)
            db.flush()
            logger.info("Created default Student user: student@faceattend.ai / Student@123")

        # 4. Seed 105+ Users across departments
        current_users_count = db.query(User).count()
        created_users = [admin, demo_student]

        if current_users_count < 100:
            user_idx = 1
            generated_emails = {admin_email, demo_student_email}
            generated_emp_ids = {"ADM-001", "STU-001"}

            while len(created_users) < 105:
                fname = random.choice(FIRST_NAMES)
                lname = random.choice(LAST_NAMES)
                name = f"{fname} {lname}"
                
                # Assign role & ID prefix
                role = "employee" if (user_idx % 4 == 0) else "student"
                prefix = "EMP" if role == "employee" else "STU"
                emp_id = f"{prefix}-{user_idx+1:03d}"
                email = f"{fname.lower()}.{lname.lower()}{user_idx}@faceattend.ai"

                if email in generated_emails or emp_id in generated_emp_ids:
                    user_idx += 1
                    continue

                generated_emails.add(email)
                generated_emp_ids.add(emp_id)

                dept = DEPARTMENTS[user_idx % len(DEPARTMENTS)]
                new_u = User(
                    name=name,
                    email=email,
                    employee_id=emp_id,
                    department=dept,
                    role=role,
                    password_hash=get_password_hash("Welcome@123"),
                    is_active=True,
                )
                db.add(new_u)
                created_users.append(new_u)
                user_idx += 1

            db.flush()
            logger.info(f"Created {len(created_users)} users.")
        else:
            created_users = db.query(User).all()

        # 5. Seed Face Embeddings for first 30 users (including demo student)
        enrolled_count = 0
        for idx, u in enumerate(created_users[:30]):
            existing_emb = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == u.id).first()
            if not existing_emb:
                synthetic_vec = generate_synthetic_embedding(seed_val=u.id * 101)
                fe = FaceEmbedding(
                    user_id=u.id,
                    embedding=json.dumps(synthetic_vec),
                    model_name="opencv_hybrid_128d",
                )
                db.add(fe)
                enrolled_count += 1
        db.flush()
        logger.info(f"Enrolled {enrolled_count} user face templates.")

        # 6. Seed 45 Days of Historical Attendance
        today = date.today()
        # Check if attendance already exists
        existing_att_count = db.query(Attendance).count()
        if existing_att_count < 1000:
            logger.info("Generating realistic historical attendance records...")
            records_to_insert = []
            
            # Group users into attendance profiles:
            # 75% High attendees (88-96% attendance)
            # 15% Moderate attendees (75-85% attendance)
            # 10% Low attendees (50-70% attendance) for RAG compliance testing
            profile_weights = {}
            for u in created_users:
                r_val = random.random()
                if r_val < 0.75:
                    profile_weights[u.id] = (0.92, 0.08)  # 92% present, 8% late
                elif r_val < 0.90:
                    profile_weights[u.id] = (0.78, 0.15)  # 78% present, 15% late
                else:
                    profile_weights[u.id] = (0.58, 0.20)  # 58% present, 20% late (risk group)

            for day_offset in range(45, -1, -1):
                att_date = today - timedelta(days=day_offset)
                if att_date.weekday() == 6:  # Skip Sunday
                    continue

                for u in created_users:
                    # Check if already exists for this day
                    target_weight, late_prob = profile_weights[u.id]
                    draw = random.random()

                    if draw < target_weight:
                        # Present or Late
                        is_late = random.random() < late_prob
                        if is_late:
                            status = "Late"
                            check_in_h = 9
                            check_in_m = random.randint(31, 55)
                        else:
                            status = "Present"
                            check_in_h = random.choice([8, 9])
                            check_in_m = random.randint(30, 59) if check_in_h == 8 else random.randint(0, 29)

                        check_in_s = random.randint(0, 59)
                        check_in_time = time(check_in_h, check_in_m, check_in_s)

                        # Check-out time (between 16:30 and 17:45)
                        check_out_h = random.choice([16, 17])
                        check_out_m = random.randint(30, 59) if check_out_h == 16 else random.randint(0, 45)
                        check_out_time = time(check_out_h, check_out_m, random.randint(0, 59))

                        confidence = round(random.uniform(0.89, 0.98), 4)

                        records_to_insert.append(
                            Attendance(
                                user_id=u.id,
                                date=att_date,
                                check_in=check_in_time,
                                check_out=check_out_time,
                                status=status,
                                confidence=confidence,
                                recognition_method="Face Recognition",
                            )
                        )
                    elif draw < target_weight + 0.03:
                        # Leave
                        records_to_insert.append(
                            Attendance(
                                user_id=u.id,
                                date=att_date,
                                check_in=None,
                                check_out=None,
                                status="Leave",
                                confidence=None,
                                recognition_method="Manual",
                            )
                        )
                    # Remaining probability is Absent (no row or row with Absent)

            db.bulk_save_objects(records_to_insert)
            db.commit()
            logger.info(f"Successfully populated {len(records_to_insert)} attendance records across 45 days.")
        else:
            logger.info(f"Database already contains {existing_att_count} attendance records.")

        db.commit()
        logger.info("Seed data verification complete.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise e
    finally:
        if close_at_end:
            db.close()


if __name__ == "__main__":
    seed_database()
