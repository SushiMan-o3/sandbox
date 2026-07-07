from pydantic import BaseModel  # gives us validation + JSON (de)serialization for free


class VoiceTranscriptSchema(BaseModel):
    """API-facing representation of a voice-reversal result.

    This is the JSON shape sent to the frontend over the websocket
    (via .model_dump() in routes/voice.py) — deliberately separate from
    models.VoiceTranscript so the wire format can evolve independently of the
    internal domain object (e.g. we don't want to leak `id`/`created_at`
    to the client unless we decide we actually need them there).
    """

    original_text: str  # sent so the frontend can display "you said: ..."
    reversed_text: str  # sent so the frontend can display "reversed: ..." alongside the audio
