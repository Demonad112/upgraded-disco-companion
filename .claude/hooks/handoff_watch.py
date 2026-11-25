#!/usr/bin/env python3
"""Claude Code hook: nudges the session to run /handoff on time and context budgets.

A skill cannot watch the clock or the context window by itself, so this hook does it.
Register it for SessionStart and PostToolUse (see references/hooks-setup.md).

- SessionStart (startup/resume/clear): records the session start time.
- SessionStart (compact): clears the context flag (context dropped after compaction).
- PostToolUse: every HANDOFF_INTERVAL_MIN minutes of session time (default 30), and once
  when context use reaches HANDOFF_CONTEXT_PCT percent (default 70), injects a reminder
  telling Claude to run the handoff skill at the next task boundary.

Context use is read from the last assistant message's usage in the transcript
(input + cache_read + cache_creation tokens) divided by HANDOFF_CONTEXT_WINDOW
(default 200000; set 1000000 for 1M-context models). The transcript can lag one turn,
so the figure is approximate. Silent in subagents. Never blocks, never exits non-zero.
"""
import json
import os
import sys
import time
from pathlib import Path

INTERVAL_MIN = float(os.environ.get("HANDOFF_INTERVAL_MIN", "30"))
CONTEXT_PCT = float(os.environ.get("HANDOFF_CONTEXT_PCT", "70"))
WINDOW = int(os.environ.get("HANDOFF_CONTEXT_WINDOW", "200000"))
STATE_DIR = Path(os.environ.get("HANDOFF_STATE_DIR", Path.home() / ".claude" / "handoff-state"))


def load(sid):
    p = STATE_DIR / f"{sid}.json"
    try:
        return json.loads(p.read_text())
    except Exception:
        return {}


def save(sid, state):
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        (STATE_DIR / f"{sid}.json").write_text(json.dumps(state))
    except Exception:
        pass


def context_tokens(transcript_path):
    """Tokens in context at the last assistant turn, or None."""
    try:
        with open(transcript_path, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 2_000_000))
            lines = f.read().decode("utf-8", "ignore").splitlines()
    except Exception:
        return None
    for line in reversed(lines):
        try:
            entry = json.loads(line)
        except Exception:
            continue
        if entry.get("isSidechain"):
            continue
        usage = (entry.get("message") or {}).get("usage")
        if usage:
            return (usage.get("input_tokens", 0)
                    + usage.get("cache_read_input_tokens", 0)
                    + usage.get("cache_creation_input_tokens", 0))
    return None


def emit(event, text):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}))


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    if data.get("agent_id"):
        return  # subagents don't hand off
    sid = data.get("session_id") or "unknown"
    event = data.get("hook_event_name", "")
    now = time.time()
    state = load(sid)

    if event == "SessionStart":
        if data.get("source") == "compact":
            state["context_fired"] = False
        else:
            state.setdefault("start", now)
        save(sid, state)
        return

    if event != "PostToolUse":
        return

    state.setdefault("start", now)
    reasons = []

    elapsed_min = (now - state["start"]) / 60
    slots = int(elapsed_min // INTERVAL_MIN) if INTERVAL_MIN > 0 else 0
    if slots > state.get("time_slots_fired", 0):
        state["time_slots_fired"] = slots
        reasons.append(f"{int(elapsed_min)} min of session time (cache-burn checkpoint)")

    if not state.get("context_fired"):
        tokens = context_tokens(data.get("transcript_path", ""))
        if tokens and WINDOW and tokens / WINDOW * 100 >= CONTEXT_PCT:
            state["context_fired"] = True
            reasons.append(f"context ~{tokens / WINDOW * 100:.0f}% used ({tokens:,}/{WINDOW:,} tokens)")

    save(sid, state)
    if reasons:
        kind = "context" if any("context" in r for r in reasons) else "time"
        emit("PostToolUse",
             f"[handoff trigger: {kind}] " + "; ".join(reasons) + ". "
             "Finish the current atomic step (don't stop mid-edit), then run the handoff skill "
             f"with trigger={kind}. Follow its rules for {kind} triggers.")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
