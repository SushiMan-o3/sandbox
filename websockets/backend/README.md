# Backend — Voice Word-Reverser

A FastAPI backend that takes spoken audio, transcribes it, reverses the order
of the words, and speaks the reversed sentence back — all over a single
WebSocket connection.

## The flow, end to end

1. The frontend opens **one** WebSocket connection to `ws://localhost:8000/api/voice/ws` when the page loads, and keeps it open.
2. The user presses "Start Recording", speaks, then presses "Stop Recording". The browser's `MediaRecorder` has been buffering audio chunks locally the whole time; on stop, those chunks are joined into a single `Blob` — this is **the entire recording as one audio file**, not a live stream.
3. That single Blob is sent over the WebSocket as **one binary message**. The audio is not chunked across multiple websocket frames — one press-to-talk cycle is one message.
4. The backend's `receive_bytes()` call returns that whole file as one `bytes` object. From here everything happens for that one recording before the loop goes back to waiting for the next one:
   - `services/speech_service.py`'s `transcribe_audio()` sends the bytes to Deepgram and gets back the transcript (e.g. `"abc cde"`).
   - `services/chat_engine.py` reverses the word order (`"abc cde"` → `"cde abc"`).
   - `services/speech_service.py`'s `synthesize_speech()` sends the reversed sentence to Deepgram's text-to-speech API and gets back a complete MP3 file as bytes.
5. The backend replies with **two messages**: a JSON text frame (`{"original_text": ..., "reversed_text": ...}`) so the frontend can display what was heard, followed by **one binary frame** containing the full reversed-speech MP3.
6. The frontend wraps that binary frame in a `Blob`, turns it into an object URL, and plays it in an `<audio>` element.

Nothing here is streamed incrementally in either direction — it's always
"send one complete recording, get back one complete reply" per press of the button.

## Why a WebSocket instead of a plain HTTP endpoint

A regular `POST /transcribe`-style REST endpoint would work fine for a single
request/response pair, but it means reconnecting (a new TCP + TLS + HTTP
handshake) for every single recording. A WebSocket connects once and then the
same open connection is reused for every subsequent recording — the `while
True` loop in `routes/voice.py` just keeps waiting for the next audio message
on the same socket, so we pay the connection-setup cost once per page load
instead of once per recording.

## File-by-file

```
backend/
├── main.py                 # creates the FastAPI app, wires up CORS + the router, entry point
├── config.py                # loads DEEPGRAM_API_KEY and model names from .env
├── requirements.txt          # Python dependencies
├── .env.example              # template for the real .env file (never commit the real one)
├── models/
│   └── voice.py              # VoiceTranscript: internal dataclass for one request's result
├── schemas/
│   └── voice.py               # VoiceTranscriptSchema: the JSON shape sent to the frontend
├── routes/
│   └── voice.py                # the /api/voice/ws WebSocket endpoint itself (the request loop)
└── services/
    ├── speech_service.py         # both Deepgram directions: audio bytes -> transcript, and text -> MP3 bytes
    └── chat_engine.py             # transcript string -> word-reversed string (pure Python, no I/O)
```

### `main.py`
Creates the `FastAPI()` app, adds `CORSMiddleware` (so the Vite dev server on
`:5173` is allowed to talk to this API on `:8000`), mounts `routes/voice.py`'s
router under the `/api/voice` prefix, and exposes a plain `GET /` health
check. The `if __name__ == "__main__"` block lets you run this file directly
with `python main.py`, which starts uvicorn on `127.0.0.1:8000`.

### `config.py`
The one place environment variables are read. Calls `load_dotenv()` (from
`python-dotenv`) so a local `.env` file gets pulled into `os.environ` before
`DEEPGRAM_API_KEY`, `STT_MODEL`, and `TTS_MODEL` are read out of it. Every
other file that needs one of these values imports it from here rather than
reading `os.environ` itself.

### `models/voice.py`
`VoiceTranscript` is a plain `@dataclass` — an internal, in-memory
representation of "one recording's result" (`original_text`, `reversed_text`,
plus an auto-generated `id`/`created_at` in case this ever needs to be logged
or persisted later). It never gets serialized directly to the client; that's
what the schema is for.

### `schemas/voice.py`
`VoiceTranscriptSchema` is a Pydantic `BaseModel` — this is the type that
actually gets turned into JSON and sent to the browser
(`schema.model_dump()` in `routes/voice.py`). Keeping this separate from
`models/voice.py` means the wire format (what the frontend receives) can
change independently of the internal domain object.

### `routes/voice.py`
The actual WebSocket endpoint, `@router.websocket("/ws")`. After
`websocket.accept()` completes the handshake, it loops forever:
`receive_bytes()` → run the audio through `_build_transcript()` (STT +
reversal) → `send_json()` the text result → `send_bytes()` the synthesized
audio → loop back and wait for the next recording. `_build_transcript()`
raises a plain `ValueError` (not `HTTPException`, since there's no HTTP
response here to attach a status code to) for empty audio or silence, which
gets caught and sent back as an `{"error": "..."}` JSON message instead of
crashing the connection. Both Deepgram calls are wrapped in
`asyncio.to_thread(...)` because the Deepgram SDK makes plain blocking
network calls — without `to_thread`, one recording being transcribed would
freeze the event loop (and therefore every other connected client) until
Deepgram responded.

### `services/speech_service.py`
Both Deepgram directions live here, sharing one module-level `DeepgramClient`
(there's no per-request setup cost to the client itself, so one instance is
reused for every call in both directions):
- `transcribe_audio(audio_bytes) -> str` — speech-to-text. Calls Deepgram's
  prerecorded transcription REST endpoint
  (`client.listen.v1.media.transcribe_file`) and pulls the transcript string
  out of the (fairly deeply nested) response object.
- `synthesize_speech(text) -> bytes` — text-to-speech. Calls Deepgram's TTS
  REST endpoint (`client.speak.v1.audio.generate`), which returns an iterator
  of audio byte chunks rather than one blob, so this joins them into a single
  `bytes` object before returning — we need the whole file in memory anyway
  since it's sent back to the client as one binary websocket message.

Both functions make plain synchronous/blocking network calls, which is why
`routes/voice.py` wraps every call to either of them in `asyncio.to_thread(...)`.

### `services/chat_engine.py`
The actual "reverse the words" logic, and the only piece of this app with no
network I/O at all — `reverse_word_order("abc cde")` returns `"cde abc"` via
`" ".join(reversed(text.split()))`. Kept separate from `speech_service.py` so
the core transformation is trivially unit-testable without mocking any
network calls.

## Running it

```
cd backend
cp .env.example .env      # then edit .env and set a real DEEPGRAM_API_KEY
pip install -r requirements.txt
python main.py             # serves on http://127.0.0.1:8000, websocket at /api/voice/ws
```
