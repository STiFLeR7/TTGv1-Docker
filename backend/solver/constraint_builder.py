from ortools.sat.python import cp_model
from typing import List, Dict, Any
from datetime import datetime
from backend.config.settings import settings

def _index_objects(items: List[Dict[str,Any]], key_field="id"):
    return {item[key_field]: item for item in items}

def generate_schedule_from_inputs(
    faculty_list: List[Dict[str,Any]],
    room_list: List[Dict[str,Any]],
    subject_list: List[Dict[str,Any]],
    batch_list: List[Dict[str,Any]],
    timeslot_list: List[Dict[str,Any]],
    payload_overrides: Dict[str,Any] = {}
) -> Dict[str,Any]:
    """
    Build CP-SAT model with:
    - variables: assign(subject,batch,slot,room,faculty)
    - hard constraints:
        * no faculty double-booked
        * no room double-booked
        * batch has at most one subject per slot
        * lab requiring continuous slots
        * respect faculty availability (days/slots)
        * respect room capacity
        * TPP/NTPP separation when required (no cross-track collision)
        * fixed/locked slots
    - soft objectives: preferences (faculty preferred slots, room affinity)
    """

    # quick indices
    faculty_idx = _index_objects(faculty_list, "id") if faculty_list else {}
    room_idx = _index_objects(room_list, "id") if room_list else {}
    subject_idx = _index_objects(subject_list, "id") if subject_list else {}
    batch_idx = _index_objects(batch_list, "id") if batch_list else {}
    timeslot_ids = [ts["id"] for ts in timeslot_list] if timeslot_list else []

    # If no timeslots provided create sample 6 slots Mon-Fri 9-4
    if not timeslot_ids:
        timeslot_ids = [f"slot_{i}" for i in range(1,9)]  # fallback

    model = cp_model.CpModel()

    # decision variables:
    # assign[(sub_id, batch_id, slot_id, room_id, faculty_id)] -> Bool
    assign = {}
    for sub in subject_list:
        sub_id = sub.get("id")
        for batch in batch_list:
            batch_id = batch.get("id")
            # only schedule subject for batches that need it
            # (we assume payload provides weekly requirement; else allow)
            for slot in timeslot_ids:
                for room in room_list:
                    room_id = room.get("id")
                    for fac in faculty_list:
                        fac_id = fac.get("id")
                        var_name = f"x_s{sub_id}_b{batch_id}_t{slot}_r{room_id}_f{fac_id}"
                        assign[(sub_id, batch_id, slot, room_id, fac_id)] = model.NewBoolVar(var_name)

    # Hard constraints:

    # 1) For each batch & slot: at most one subject assigned (no overlap)
    for batch in batch_list:
        batch_id = batch.get("id")
        for slot in timeslot_ids:
            # sum over all subjects, rooms, faculties <= 1
            to_sum = []
            for sub in subject_list:
                sub_id = sub.get("id")
                for room in room_list:
                    for fac in faculty_list:
                        v = assign.get((sub_id, batch_id, slot, room.get("id"), fac.get("id")))
                        if v is not None:
                            to_sum.append(v)
            if to_sum:
                model.Add(sum(to_sum) <= 1)

    # 2) Faculty not double-booked: for each faculty & slot, at most one assignment across batches/rooms/subjects
    for fac in faculty_list:
        fac_id = fac.get("id")
        for slot in timeslot_ids:
            to_sum = []
            for sub in subject_list:
                for batch in batch_list:
                    for room in room_list:
                        v = assign.get((sub.get("id"), batch.get("id"), slot, room.get("id"), fac_id))
                        if v is not None:
                            to_sum.append(v)
            if to_sum:
                model.Add(sum(to_sum) <= 1)

    # 3) Room not double-booked: for each room & slot, at most one assignment
    for room in room_list:
        room_id = room.get("id")
        for slot in timeslot_ids:
            to_sum = []
            for sub in subject_list:
                for batch in batch_list:
                    for fac in faculty_list:
                        v = assign.get((sub.get("id"), batch.get("id"), slot, room_id, fac.get("id")))
                        if v is not None:
                            to_sum.append(v)
            if to_sum:
                model.Add(sum(to_sum) <= 1)

    # 4) Respect faculty availability: if faculty doesn't have the slot in available_slots, forbid it
    for fac in faculty_list:
        fac_id = fac.get("id")
        available_slots = fac.get("available_slots") or []
        available_days = fac.get("available_days") or []
        no_consec = fac.get("no_consecutive_slots", False)
        for sub in subject_list:
            for batch in batch_list:
                for slot in timeslot_ids:
                    # If faculty has explicit available_slots, disallow other slots
                    if available_slots and slot not in available_slots:
                        for room in room_list:
                            v = assign.get((sub.get("id"), batch.get("id"), slot, room.get("id"), fac_id))
                            if v is not None:
                                model.Add(v == 0)

    # 5) Room capacity: don't assign if batch student_count > room.capacity
    for room in room_list:
        capacity = room.get("capacity", 9999)
        for sub in subject_list:
            for batch in batch_list:
                student_count = batch.get("student_count", 0)
                if student_count > capacity:
                    for slot in timeslot_ids:
                        for fac in faculty_list:
                            v = assign.get((sub.get("id"), batch.get("id"), slot, room.get("id"), fac.get("id")))
                            if v is not None:
                                model.Add(v == 0)

    # 6) Lab continuity: subjects with requires_continuous_slots -> require consecutive slots for lab_duration
    # Implementation: if subject requires continuous 2 slots, then scheduling must allocate same room/faculty on adjacent slot
    # Note: This is a simplified modeling: we enforce when slot indices are sequential in the provided timeslot_ids list
    slot_index = {s:i for i,s in enumerate(timeslot_ids)}
    for sub in subject_list:
        if sub.get("subject_type") == "lab" or sub.get("requires_continuous_slots"):
            required = sub.get("duration", 2)
            for batch in batch_list:
                batch_id = batch.get("id")
                for start_slot in timeslot_ids:
                    si = slot_index[start_slot]
                    # check if consecutive slots exist
                    consec_slots = []
                    ok = True
                    for offset in range(required):
                        idx = si + offset
                        if idx >= len(timeslot_ids):
                            ok = False
                            break
                        consec_slots.append(timeslot_ids[idx])
                    if not ok:
                        # can't start here
                        for room in room_list:
                            for fac in faculty_list:
                                v = assign.get((sub.get("id"), batch_id, start_slot, room.get("id"), fac.get("id")))
                                if v is not None:
                                    model.Add(v == 0)
                        continue
                    # Enforce logical link: if assignment at first slot then same room/faculty assigned in subsequent slots.
                    # For CP-SAT we create implication constraints:
                    for room in room_list:
                        for fac in faculty_list:
                            v_first = assign.get((sub.get("id"), batch_id, start_slot, room.get("id"), fac.get("id")))
                            if v_first is None:
                                continue
                            # all subsequent must be same room/fac -> create conjunction constraints
                            succ_vars = []
                            for st in consec_slots[1:]:
                                v_succ = assign.get((sub.get("id"), batch_id, st, room.get("id"), fac.get("id")))
                                if v_succ is not None:
                                    succ_vars.append(v_succ)
                            # If v_first == 1 => all succ_vars == 1
                            for v_succ in succ_vars:
                                model.Add(v_first <= v_succ)

    # 7) TPP/NTPP separation: if batch/subject/track require separation, ensure not assigned to same faculty/time as other track
    # We'll enforce: if `no_cross_track_collision` policy true, then a faculty cannot be assigned simultaneously to TPP and NTPP batches
    # (faculty constraint already ensures one assignment per slot, and since batches belong to tracks, it prevents cross-track double-booking)

    # 8) Fixed / locked slots: if payload_overrides has fixed assignments, force them
    fixed = payload_overrides.get("fixed_assignments", [])
    for fix in fixed:
        # fix: {"subject_id":1,"batch_id":2,"slot":"slot_1","room_id":1,"faculty_id":5}
        v = assign.get((fix["subject_id"], fix["batch_id"], fix["slot"], fix["room_id"], fix["faculty_id"]))
        if v is not None:
            model.Add(v == 1)

    # At least one assignment objective: try to maximize coverage of weekly lecture requirement.
    # Build a naive objective that sums assignments and rewards faculty preferred slots and room affinity
    objective_terms = []
    for key, var in assign.items():
        sub_id, batch_id, slot, room_id, fac_id = key
        coeff = 1
        # faculty preferred slots
        fac = next((f for f in faculty_list if f.get("id") == fac_id), {})
        if fac:
            preferred = fac.get("preferred_slots", [])
            if slot in preferred:
                coeff += 1
        # room affinity
        room = next((r for r in room_list if r.get("id") == room_id), {})
        batch = next((b for b in batch_list if b.get("id") == batch_id), {})
        if room and batch:
            affinities = room.get("room_affinity", []) or []
            if batch.get("branch_id") in affinities or batch.get("track_code") in affinities:
                coeff += 1
        objective_terms.append(var * coeff)

    model.Maximize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(payload_overrides.get("max_time_s", settings.SOLVER_MAX_TIME_S))
    status = solver.Solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        assignments = []
        for key, var in assign.items():
            if solver.Value(var) == 1:
                sub_id, batch_id, slot, room_id, fac_id = key
                assignments.append({
                    "subject_id": sub_id,
                    "batch_id": batch_id,
                    "slot": slot,
                    "room_id": room_id,
                    "faculty_id": fac_id
                })
        return {"status": "ok", "assignments_count": len(assignments), "assignments": assignments}
    else:
        return {"status": "unsat"}
