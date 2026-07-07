import asyncio  # lets us run Deepgram's blocking SDK calls off the event loop (see asyncio.to_thread below)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models.voice import VoiceTranscript
from schemas.voice import VoiceTranscriptSchema
from services.chat_engine import reverse_word_order
from services.speech_service import synthesize_speech, transcribe_audio

router = APIRouter()  # collects this file's routes so main.py can mount them under a shared prefix


async def _build_transcript(audio_bytes: bytes) -> VoiceTranscript:
    """Runs one recording through STT + word-reversal. Raises ValueError (not
    HTTPException) for bad input, since this is used from a websocket loop
    where there is no HTTP response to attach an error status code to."""
    if not audio_bytes:
        # can happen if the client sends an empty/zero-byte blob
        raise ValueError("No audio data received")

    # transcribe_audio() is a synchronous/blocking call (real network I/O to
    # Deepgram); asyncio.to_thread runs it in a worker thread so this coroutine
    # doesn't freeze the whole event loop (and every other connected client)
    # while waiting on the response.
    original_text = await asyncio.to_thread(transcribe_audio, audio_bytes)
    if not original_text or not original_text.strip():
        # Deepgram returns an empty string rather than erroring when it hears silence/noise
        raise ValueError("Could not detect any speech in the audio")

    reversed_text = reverse_word_order(original_text)
    return VoiceTranscript(original_text=original_text, reversed_text=reversed_text)


@router.websocket("/ws")  # mounted at /api/voice/ws once main.py includes this router with that prefix
async def voice_ws(websocket: WebSocket) -> None:
    """Receives raw audio bytes from the client over the socket, transcribes and
    reverses the word order, then streams the resulting speech audio back over
    the same connection.

    Framing/protocol note: the frontend records a full utterance locally (button
    press to start, button press to stop) and sends the ENTIRE recording as one
    binary websocket message — audio does not arrive here in a stream of small
    chunks. Each iteration of the while-loop below handles exactly one such
    complete recording, and replies with exactly one JSON text message followed
    by one binary message (the full reversed-speech audio file), before looping
    back to wait for the next recording on the same connection.
    """
    # The websocket handshake is a plain HTTP request that gets upgraded; accept()
    # completes that upgrade so we can start exchanging framed messages.
    await websocket.accept()

    try:
        # Keep serving recordings on this one connection until the client
        # disconnects (closing the tab, navigating away, etc.)
        while True:
            # Blocks here until the browser sends the complete recording Blob
            # for one press-to-talk cycle; receive_bytes() gives us it as one
            # bytes object already reassembled by the websocket layer.
            audio_bytes = await websocket.receive_bytes()

            try:
                transcript = await _build_transcript(audio_bytes)
            except ValueError as exc:
                # Tell the client what went wrong (e.g. silence) as a JSON text
                # frame, then go back to waiting for their next recording
                # instead of tearing down the connection.
                await websocket.send_json({"error": str(exc)})
                continue

            # Wrap the domain object in the API-facing schema before sending it
            # out, keeping the wire format decoupled from the internal model.
            schema = VoiceTranscriptSchema(
                original_text=transcript.original_text,
                reversed_text=transcript.reversed_text,
            )
            # send_json sends this as a websocket *text* frame; the frontend
            # tells text and binary frames apart via typeof event.data.
            await websocket.send_json(schema.model_dump())

            # Same blocking-call concern as transcribe_audio above: run
            # synthesize_speech in a worker thread rather than awaiting it directly.
            reversed_audio_bytes = await asyncio.to_thread(
                synthesize_speech, transcript.reversed_text
            )
            # Sent as a single binary frame containing the whole MP3 file — the
            # frontend wraps it in a Blob and plays it, no chunk reassembly needed.
            await websocket.send_bytes(reversed_audio_bytes)
    except WebSocketDisconnect:
        # Normal, expected event when the client closes the connection; nothing to clean up.
        pass
