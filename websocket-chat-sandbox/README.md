# Websocket Chat Sandbox

A small chat app for testing websockets: a browser client talks to a FastAPI server over a single websocket connection, and the server replies using the Anthropic API. Includes an optional voice-input feature powered by Deepgram's speech-to-text API.

## Features

- Realtime chat over a single websocket connection (`/ws/chat`)
- Full (non-streaming) replies from Claude, with a simple in-memory conversation history per connection
- Voice input: record audio in the browser and have it automatically sent to Claude as a chat message
  - With `DEEPGRAM_API_KEY` set, audio is transcribed server-side via Deepgram
  - Without it, the browser's own built-in speech recognition is used instead — no API key needed, with live partial captions while you speak
- Text-to-speech: Claude's replies are read aloud using the browser's built-in speech synthesis, with a mute/unmute toggle in the header
- Graceful degradation — if neither Deepgram nor browser speech recognition/synthesis is available, the app falls back cleanly (text-only chat, disabled buttons with explanatory tooltips)
- Zero-build static frontend (plain HTML/CSS/JS) served directly by FastAPI — no separate frontend dev server needed

## Setup

### 1. Prerequisites

- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com/)
- Optionally, a [Deepgram API key](https://console.deepgram.com/) for voice input (paid/metered API)

### 2. Navigate to the project

```bash
cd websocket-chat-sandbox
```

### 3. Create a virtual environment

```bash
python -m venv venv
```

Activate it:

- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=your-anthropic-api-key-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here
```

`DEEPGRAM_API_KEY` is optional — leave it blank to run text-only chat.

### 6. Run the server

```bash
python main.py
```

Open `http://127.0.0.1:8000` in your browser.

## Websocket protocol (`/ws/chat`)

**Client → Server**

| Frame type | Shape |
|---|---|
| text | `{"type": "user_message", "text": "..."}` |
| binary | raw bytes of a recorded audio clip (from the browser's `MediaRecorder`) |

**Server → Client** (always JSON text frames)

| `type` | Shape | Meaning |
|---|---|---|
| `config` | `{"type": "config", "deepgram_enabled": bool}` | Sent once right after connecting, so the client knows whether to use server-side (Deepgram) or browser-side speech recognition for the mic button |
| `assistant_message` | `{"type": "assistant_message", "text": "..."}` | Claude's reply |
| `transcript` | `{"type": "transcript", "text": "..."}` | What your recorded audio was transcribed to (Deepgram path only), sent right before it's forwarded to Claude |
| `error` | `{"type": "error", "code": "...", "message": "..."}` | See error codes below |

Error `code` values: `invalid_message`, `anthropic_error`, `deepgram_unavailable`, `deepgram_error`, `empty_transcript`.

## Voice feature notes

There are two ways the mic button can work, chosen automatically based on whether the server has a Deepgram key configured:

1. **With `DEEPGRAM_API_KEY` set**: audio is recorded in-browser and sent to the server as binary websocket frames, which [Deepgram](https://deepgram.com/) (a paid/metered API, `nova-3` model) transcribes server-side. Recordings auto-stop after 60 seconds. Tested against browsers that record `audio/webm;codecs=opus` by default (Chrome, Firefox); Safari's default recording format may not transcribe correctly.
2. **Without it**: the browser's own built-in speech recognition (the Web Speech API) transcribes locally — no server round-trip, no API key needed. It shows live partial captions as you speak and auto-finalizes when you pause. Solid support in Chromium-based browsers (Chrome, Edge); unsupported in Firefox and only partially supported in Safari.

Either way, once a transcript is ready it's shown in the chat log and immediately sent to Claude — there's no manual review/edit step before sending. If neither mechanism is available, the mic button is disabled with a tooltip explaining why; text chat is unaffected.

## Text-to-speech

Claude's replies are read aloud automatically using the browser's built-in `speechSynthesis` API — no server involvement or API key needed. Click the 🔊 button in the header to mute/unmute. If the browser doesn't support speech synthesis, the button is disabled.

## Project Structure

```
websocket-chat-sandbox/
├── api/
│   ├── app.py            # FastAPI app, static routes, websocket endpoint
│   ├── config.py         # env loading, Anthropic/Deepgram client construction
│   ├── chat.py            # Claude call + conversation history
│   ├── transcription.py   # Deepgram transcription helper
│   └── static/
│       ├── index.html
│       ├── app.js
│       └── style.css
├── main.py                # Entry point (runs uvicorn)
├── requirements.txt
├── .env.example
└── .env                    # API keys (not committed)
```
