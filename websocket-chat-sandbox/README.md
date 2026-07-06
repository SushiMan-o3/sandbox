# Websocket Chat Sandbox

A small chat app for testing websockets: a browser client talks to a FastAPI server over a single websocket connection, and the server replies using the Anthropic API. Includes an optional voice-input feature powered by Deepgram's speech-to-text API.

## Features

- Realtime chat over a single websocket connection (`/ws/chat`)
- Full (non-streaming) replies from Claude, with a simple in-memory conversation history per connection
- Optional voice input: record audio in the browser, it's transcribed via Deepgram and automatically sent to Claude as a chat message
- Graceful degradation — if no Deepgram key is configured, text chat still works and the mic button reports itself as unavailable
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
| `assistant_message` | `{"type": "assistant_message", "text": "..."}` | Claude's reply |
| `transcript` | `{"type": "transcript", "text": "..."}` | What your recorded audio was transcribed to, sent right before it's forwarded to Claude |
| `error` | `{"type": "error", "code": "...", "message": "..."}` | See error codes below |

Error `code` values: `invalid_message`, `anthropic_error`, `deepgram_unavailable`, `deepgram_error`, `empty_transcript`.

## Voice feature notes

- Requires `DEEPGRAM_API_KEY` — [Deepgram](https://deepgram.com/) is a paid/metered speech-to-text API, billed by usage.
- Uses the `nova-3` model.
- Recordings auto-stop after 60 seconds.
- Tested against browsers that record `audio/webm;codecs=opus` by default (Chrome, Firefox). Safari's default recording format may not transcribe correctly.
- When a transcript comes back, it's shown in the chat log and immediately sent to Claude — there's no manual review/edit step before sending.

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
