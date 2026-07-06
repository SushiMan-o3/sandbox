import json

import anthropic
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.config import STATIC_DIR, DEEPGRAM_ENABLED
from api.chat import ask_claude
from api.transcription import DeepgramNotConfigured, transcribe_audio


app = FastAPI(title="Websocket Chat Sandbox")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


async def _send_chat_reply(websocket: WebSocket, history: list[dict], text: str):
    try:
        reply = ask_claude(history, text)
    except anthropic.APIError as error:
        await websocket.send_json({
            "type": "error",
            "code": "anthropic_error",
            "message": str(error),
        })
        return

    await websocket.send_json({"type": "assistant_message", "text": reply})


async def _handle_text(websocket: WebSocket, history: list[dict], raw_text: str):
    try:
        payload = json.loads(raw_text)
        text = payload["text"]
        if payload.get("type") != "user_message" or not isinstance(text, str):
            raise ValueError("unexpected message shape")
    except (json.JSONDecodeError, KeyError, ValueError):
        await websocket.send_json({
            "type": "error",
            "code": "invalid_message",
            "message": "Expected {\"type\": \"user_message\", \"text\": \"...\"}",
        })
        return

    await _send_chat_reply(websocket, history, text)


async def _handle_audio(websocket: WebSocket, history: list[dict], audio_bytes: bytes):
    try:
        transcript = transcribe_audio(audio_bytes)
    except DeepgramNotConfigured:
        await websocket.send_json({
            "type": "error",
            "code": "deepgram_unavailable",
            "message": "Voice transcription is not configured on this server.",
        })
        return
    except Exception as error:
        # Deepgram's SDK only wraps structured API error responses in ApiError;
        # transport-level failures (timeouts, proxy/connection errors) surface as
        # raw httpx exceptions, so we catch broadly here to avoid crashing the
        # websocket connection on any Deepgram call failure.
        await websocket.send_json({
            "type": "error",
            "code": "deepgram_error",
            "message": str(error),
        })
        return

    if not transcript.strip():
        await websocket.send_json({
            "type": "error",
            "code": "empty_transcript",
            "message": "No speech detected.",
        })
        return

    await websocket.send_json({"type": "transcript", "text": transcript})
    await _send_chat_reply(websocket, history, transcript)


@app.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"type": "config", "deepgram_enabled": DEEPGRAM_ENABLED})
    history: list[dict] = []

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if message.get("bytes") is not None:
                await _handle_audio(websocket, history, message["bytes"])
            elif message.get("text") is not None:
                await _handle_text(websocket, history, message["text"])
    except WebSocketDisconnect:
        pass
