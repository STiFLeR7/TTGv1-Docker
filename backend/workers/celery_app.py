"""
backend/workers/celery_app.py

Celery app + task. This file defines the Celery app and the generate_timetable_task.
The task:
 - If payload is None/empty, fetches DB payload using db_adapter.fetch_payload_from_db_sync (sync)
 - Calls the solver: generate_schedule_from_inputs (assumed synchronous)
 - Saves schedule using db_adapter.save_schedule_into_db_sync (sync)
 - Returns a JSON-serializable dict with schedule_id on success or an error dict on failure
"""
from celery import Celery
import traceback
from backend.config.settings import settings

# Create Celery instance using settings (ensure correct URLs)
celery = Celery(
    "ttg_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Lazy-import solver + db adapter inside the task to avoid heavy imports at module import time.
@celery.task(bind=True)
def generate_timetable_task(self, payload: dict = None, save_name: str = "auto-schedule"):
    """
    Celery task entrypoint.

    Parameters:
      - payload: optional dict with keys faculty/rooms/subjects/batches/timeslots
                 if None/empty, the task will fetch payload from DB.
      - save_name: optional friendly name to save with schedule
    Returns:
      A JSON-serializable dict describing the result:
      {
        "status": "success",
        "schedule_id": <int>,
        "result_summary": { ... }
      }
      OR on error:
      {
        "status": "error",
        "error": "message",
        "traceback": "..."
      }
    """
    # Import inside function to avoid import-time side-effects in worker startup.
    try:
        from backend.solver.constraint_builder import generate_schedule_from_inputs
    except Exception as e:
        return {"status": "error", "error": f"solver_import_error: {e}", "traceback": traceback.format_exc()}

    try:
        from backend.solver.db_adapter import fetch_payload_from_db_sync, save_schedule_into_db_sync
    except Exception as e:
        return {"status": "error", "error": f"db_adapter_import_error: {e}", "traceback": traceback.format_exc()}

    # 1) fetch payload from DB if none provided or empty
    if not payload:
        try:
            payload = fetch_payload_from_db_sync()
        except Exception as e:
            return {"status": "error", "error": f"db_fetch_failed: {e}", "traceback": traceback.format_exc()}

    # 2) Run the solver (synchronous function expected)
    try:
        # The solver signature in your repo may differ. Adjust arguments as needed.
        result = generate_schedule_from_inputs(
            payload.get("faculty", []),
            payload.get("rooms", []),
            payload.get("subjects", []),
            payload.get("batches", []),
            payload.get("timeslots", []),
            payload_overrides=payload
        )
    except Exception as e:
        return {"status": "error", "error": f"solver_failed: {e}", "traceback": traceback.format_exc()}

    # Ensure result is JSON serializable. If not, convert or ping error.
    try:
        # Attempt a quick serialization check
        import json
        json.dumps(result)
    except Exception:
        # If result contains non-serializable objects, try to coerce to primitives.
        # Best practice: enforce solver returns dicts/lists with only primitives.
        try:
            # fallback: convert via repr for unknown objects to keep something
            def make_serializable(obj):
                if isinstance(obj, (str, int, float, bool, type(None))):
                    return obj
                if isinstance(obj, dict):
                    return {k: make_serializable(v) for k, v in obj.items()}
                if isinstance(obj, (list, tuple)):
                    return [make_serializable(v) for v in obj]
                return repr(obj)
            result = make_serializable(result)
        except Exception as e:
            return {"status": "error", "error": f"result_serialize_failed: {e}", "traceback": traceback.format_exc()}

    # 3) Save schedule to DB using synchronous helper
    try:
        schedule_id = save_schedule_into_db_sync(payload, result, name=save_name)
    except Exception as e:
        # Save failed, but solver produced result; return both result and error.
        return {"status": "error", "error": f"save_failed: {e}", "traceback": traceback.format_exc(), "result": result}

    # 4) Success: return schedule id and a small summary
    summary = {"events": len(result.get("assignments", [])) if isinstance(result, dict) and "assignments" in result else None}
    return {"status": "success", "schedule_id": schedule_id, "result_summary": summary}
