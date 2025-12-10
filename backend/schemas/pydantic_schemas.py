from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import time

class ProgramSchema(BaseModel):
    id: Optional[int]
    program_name: str
    department_id: Optional[int]
    has_tpp_ntpp: bool = False
    year_semester_structure: str = "semester"

class BranchSchema(BaseModel):
    id: Optional[int]
    branch_name: str
    program_id: int
    batch_size: int = 0
    is_low_strength: bool = False

class TrackSchema(BaseModel):
    id: Optional[int]
    track_type: str
    track_code: str
    is_combined_track: bool = False

class BatchSchema(BaseModel):
    id: Optional[int]
    branch_id: int
    track_code: Optional[str]
    section_id: Optional[str]
    year_sem: Optional[str]
    student_count: int = 0
    subject_list: List[str] = []
    lab_groups: List[str] = []
    weekly_lecture_requirements: Dict[str,int] = {}
    allowed_timings: List[str] = []
    break_times: List[str] = []

class SubjectSchema(BaseModel):
    id: Optional[int]
    subject_code: str
    subject_name: str
    subject_type: str
    program_id: Optional[int] = None
    branch_id: Optional[int] = None
    track_type: str = "common"
    duration: int = 1
    requires_continuous_slots: bool = False
    preferred_faculty_list: List[int] = []
    room_type_required: str = "classroom"
    shared_across_tracks: bool = False

class FacultySchema(BaseModel):
    id: Optional[int]
    faculty_name: str
    subjects_can_teach: List[str] = []
    assigned_tracks: List[str] = []
    max_lectures_per_day: int = 4
    max_lectures_per_week: int = 22
    preferred_slots: List[str] = []
    available_days: List[str] = ["Mon","Tue","Wed","Thu","Fri","Sat"]
    available_slots: List[str] = []
    no_consecutive_slots: bool = False
    lab_specialization: List[str] = []
    tpp_only_subjects: List[str] = []
    ntpp_only_subjects: List[str] = []
    common_subjects: List[str] = []
    faculty_subject_category: str = "general"
    faculty_institute_type: str = "full-time"
    faculty_priority_level: str = "junior"
    meta: Dict[str,Any] = {}

class RoomSchema(BaseModel):
    id: Optional[int]
    room_name: str
    room_type: str = "classroom"
    capacity: int = 30
    branch_specific: bool = False
    available_days: List[str] = ["Mon","Tue","Wed","Thu","Fri","Sat"]
    available_slots: List[str] = []
    restricted_subjects: List[str] = []
    lab_block_supported: bool = False
    room_affinity: List[str] = []
    room_priority_level: int = 1
    meta: Dict[str,Any] = {}

class TimeSlotSchema(BaseModel):
    id: str
    day: str
    start_time: time
    end_time: time
    slot_type: str = "regular"
    is_mandatory_slot: bool = False

class LabSchema(BaseModel):
    id: Optional[int]
    lab_subject_code: str
    lab_group_size: int = 20
    lab_duration: int = 2
    requires_continuous_slots: bool = True
    lab_room_id: Optional[int]
    lab_instructor: Optional[int]
    lab_instructor_track: str = "TPP"

class ConstraintPolicySchema(BaseModel):
    id: Optional[int]
    no_lecture_after: str = "16:00"
    minimum_gap_between_labs: int = 1
    minimum_gap_between_theory_and_lab: int = 1
    faculty_free_day: Optional[str] = None
    batch_free_day: Optional[str] = None
    max_lectures_batch_per_day: int = 4
    max_labs_per_day: int = 1
    no_cross_track_collision: bool = True
    fixed_classes: Dict[str,Any] = {}
    track_priority: Dict[str,int] = {}
    avoid_last_slot_for_core_subjects: bool = True
    avoid_first_slot_for_labs: bool = False

class OptimizationMetadataSchema(BaseModel):
    id: Optional[int]
    cost_function_weights: Dict[str,float] = Field(default_factory=lambda:{
        "faculty_satisfaction": 1.0,
        "student_satisfaction": 1.0,
        "room_utilization": 1.0,
        "timetable_compactness": 1.0
    })
    penalty_hard_constraints: Dict[str,int] = {}
    penalty_soft_constraints: Dict[str,int] = {}
    ai_optimizer_metadata: Dict[str,Any] = {}
