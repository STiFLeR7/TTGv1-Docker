from sqlalchemy import (
    Table, Column, Integer, String, Boolean, ForeignKey, Text, Enum, JSON, Time
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import ARRAY
import enum

Base = declarative_base()

class SubjectTypeEnum(str, enum.Enum):
    THEORY = "theory"
    LAB = "lab"
    SEMINAR = "seminar"
    TUTORIAL = "tutorial"

class SlotTypeEnum(str, enum.Enum):
    REGULAR = "regular"
    BREAK = "break"
    LAB_BLOCK = "lab_block"
    ASSEMBLY = "assembly"

# Institution / Program / Branch
class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    # additional metadata

class Program(Base):
    __tablename__ = "programs"
    id = Column(Integer, primary_key=True)
    program_name = Column(String, nullable=False)  # B.Tech, BSc, Diploma
    department_id = Column(Integer, nullable=True)
    has_tpp_ntpp = Column(Boolean, default=False)
    year_semester_structure = Column(String, default="semester")  # or yearly

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True)
    branch_name = Column(String, nullable=False)  # CSE, AIML, DS...
    program_id = Column(Integer, ForeignKey("programs.id"))
    batch_size = Column(Integer, default=0)
    is_low_strength = Column(Boolean, default=False)

# Track / Grouping (TPP/NTPP)
class Track(Base):
    __tablename__ = "tracks"
    id = Column(Integer, primary_key=True)
    track_type = Column(String, nullable=False)  # TPP or NTPP
    track_code = Column(String, nullable=False)  # A1 A2 B1 B2 C1...
    is_combined_track = Column(Boolean, default=False)

# Batch/Section
class Batch(Base):
    __tablename__ = "batches"
    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    track_code = Column(String, nullable=True)
    section_id = Column(String, nullable=True)  # A/B/C
    year_sem = Column(String, nullable=True)  # 7th semester
    student_count = Column(Integer, default=0)
    subject_list = Column(ARRAY(String), default=[])
    lab_groups = Column(ARRAY(String), default=[])  # L1/L2...
    weekly_lecture_requirements = Column(JSON, default={})  # {subject_code: num_per_week}
    allowed_timings = Column(ARRAY(String), default=[])  # list of allowed slot ids
    break_times = Column(ARRAY(String), default=[])

# Subject
class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    subject_code = Column(String, unique=True, nullable=False)
    subject_name = Column(String, nullable=False)
    subject_type = Column(Enum(SubjectTypeEnum), default=SubjectTypeEnum.THEORY)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)  # null if common
    track_type = Column(String, default="common")  # TPP/NTPP/Common
    duration = Column(Integer, default=1)  # slots (1,2,3)
    requires_continuous_slots = Column(Boolean, default=False)
    preferred_faculty_list = Column(ARRAY(Integer), default=[])
    room_type_required = Column(String, default="classroom")
    shared_across_tracks = Column(Boolean, default=False)

# Faculty
class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(Integer, primary_key=True)
    faculty_name = Column(String, nullable=False)
    subjects_can_teach = Column(ARRAY(String), default=[])
    assigned_tracks = Column(ARRAY(String), default=[])  # ["TPP","NTPP"] or specific codes
    max_lectures_per_day = Column(Integer, default=4)
    max_lectures_per_week = Column(Integer, default=22)
    preferred_slots = Column(ARRAY(String), default=[])  # slot IDs or times
    available_days = Column(ARRAY(String), default=["Mon","Tue","Wed","Thu","Fri","Sat"])
    available_slots = Column(ARRAY(String), default=[])
    no_consecutive_slots = Column(Boolean, default=False)
    lab_specialization = Column(ARRAY(String), default=[])  # e.g., ["AIML Lab","NB-111"]
    tpp_only_subjects = Column(ARRAY(String), default=[])
    ntpp_only_subjects = Column(ARRAY(String), default=[])
    common_subjects = Column(ARRAY(String), default=[])
    faculty_subject_category = Column(String, default="general")  # core/specialization
    faculty_institute_type = Column(String, default="full-time")  # full-time/industry/visiting
    faculty_priority_level = Column(String, default="junior")  # junior/senior for load dist.
    # contact / metadata
    meta = Column(JSON, default={})

# Room / Lab
class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    room_name = Column(String, nullable=False)
    room_type = Column(String, default="classroom")  # classroom / lab / smart / seminar
    capacity = Column(Integer, default=30)
    branch_specific = Column(Boolean, default=False)
    available_days = Column(ARRAY(String), default=["Mon","Tue","Wed","Thu","Fri","Sat"])
    available_slots = Column(ARRAY(String), default=[])
    restricted_subjects = Column(ARRAY(String), default=[])  # only ML labs allowed...
    lab_block_supported = Column(Boolean, default=False)
    room_affinity = Column(ARRAY(String), default=[])  # list of branches/tracks preferred
    room_priority_level = Column(Integer, default=1)  # higher = prefer
    meta = Column(JSON, default={})

# Time Slot
class TimeSlot(Base):
    __tablename__ = "timeslots"
    id = Column(String, primary_key=True)  # e.g. "Mon_09:00_10:00"
    day = Column(String, nullable=False)  # Mon..Sat
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_type = Column(Enum(SlotTypeEnum), default=SlotTypeEnum.REGULAR)
    is_mandatory_slot = Column(Boolean, default=False)  # e.g. common hour

# Shared / Combined class
class SharedClass(Base):
    __tablename__ = "shared_classes"
    id = Column(Integer, primary_key=True)
    shared_class_code = Column(String, nullable=False)
    shared_batches = Column(ARRAY(Integer), default=[])
    shared_faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    shared_subject_code = Column(String, nullable=True)
    shared_room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    fixed_slot_id = Column(String, nullable=True)

# Lab model
class Lab(Base):
    __tablename__ = "labs"
    id = Column(Integer, primary_key=True)
    lab_subject_code = Column(String, nullable=False)
    lab_group_size = Column(Integer, default=20)  # split batch size
    lab_duration = Column(Integer, default=2)  # slots; often 2
    requires_continuous_slots = Column(Boolean, default=True)
    lab_room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    lab_instructor = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    lab_instructor_track = Column(String, default="TPP")  # TPP/NTPP specific labs

# Institutional rules & constraints table (store policy)
class ConstraintPolicy(Base):
    __tablename__ = "constraint_policies"
    id = Column(Integer, primary_key=True)
    no_lecture_after = Column(String, default="16:00")  # HH:MM
    minimum_gap_between_labs = Column(Integer, default=1)  # slots
    minimum_gap_between_theory_and_lab = Column(Integer, default=1)
    faculty_free_day = Column(String, nullable=True)  # optional day
    batch_free_day = Column(String, nullable=True)
    max_lectures_batch_per_day = Column(Integer, default=4)
    max_labs_per_day = Column(Integer, default=1)
    no_cross_track_collision = Column(Boolean, default=True)
    fixed_classes = Column(JSON, default={})  # {slot_id: {"type": "assembly"}}
    track_priority = Column(JSON, default={})  # {"TPP":1,"NTPP":2}
    avoid_last_slot_for_core_subjects = Column(Boolean, default=True)
    avoid_first_slot_for_labs = Column(Boolean, default=False)

# Optimization metadata
class OptimizationMetadata(Base):
    __tablename__ = "optimization_metadata"
    id = Column(Integer, primary_key=True)
    cost_function_weights = Column(JSON, default={
        "faculty_satisfaction": 1.0,
        "student_satisfaction": 1.0,
        "room_utilization": 1.0,
        "timetable_compactness": 1.0
    })
    penalty_hard_constraints = Column(JSON, default={})
    penalty_soft_constraints = Column(JSON, default={})
    ai_optimizer_metadata = Column(JSON, default={})
