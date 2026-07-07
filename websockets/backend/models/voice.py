import uuid  # generates a unique id for each transcript, in case we ever want to log/store them
from dataclasses import dataclass, field  # dataclass auto-generates __init__/__repr__ from the fields below
from datetime import datetime, timezone  # timestamp the moment a transcript was produced


@dataclass
class VoiceTranscript:
    """Domain model holding the result of a voice-reversal request."""

    # required fields (no default) must be passed in by the caller
    original_text: str  # exactly what Deepgram STT heard, before any reversal
    reversed_text: str  # original_text with its word order flipped by chat_engine

    # default_factory runs the lambda once per instance (not once at class
    # definition time), so every VoiceTranscript gets its own fresh id/timestamp
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
