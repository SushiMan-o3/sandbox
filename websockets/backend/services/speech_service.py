from deepgram import DeepgramClient  # official Deepgram Python SDK client

from config import DEEPGRAM_API_KEY, STT_MODEL, TTS_MODEL  # our own settings, loaded from .env

# One client, reused for both directions (speech-to-text and text-to-speech):
# it's just an HTTP wrapper around Deepgram's REST API, so there's no
# per-request setup cost to constructing it fresh, but reusing one avoids
# doing it twice and keeps a single place that owns the API key.
_client = DeepgramClient(api_key=DEEPGRAM_API_KEY)


def transcribe_audio(audio_bytes: bytes) -> str:
    """Speech-to-text: sends raw audio bytes to Deepgram and returns the transcribed text."""
    # This is a synchronous (blocking) network call under the hood, which is
    # why callers run it inside asyncio.to_thread rather than awaiting it directly.
    response = _client.listen.v1.media.transcribe_file(
        request=audio_bytes,  # the raw audio bytes exactly as captured by the browser (e.g. webm/opus)
        model=STT_MODEL,  # which Deepgram model to run the audio through (see config.py)
        smart_format=True,  # asks Deepgram to add punctuation/capitalization to the raw transcript
    )
    # Deepgram's response is a nested object: one result per audio file, one
    # channel per audio channel (we only ever send mono, so channel 0), and one
    # alternative per possible transcription guess (we just want the top guess).
    return response.results.channels[0].alternatives[0].transcript


def synthesize_speech(text: str) -> bytes:
    """Text-to-speech: converts text to speech via Deepgram and returns the raw MP3 audio bytes."""
    # generate() is also a blocking network call (see transcribe_audio's note
    # on asyncio.to_thread). It returns an iterator of audio byte chunks rather
    # than the whole file at once, so we have to collect it ourselves below.
    audio_chunks = _client.speak.v1.audio.generate(text=text, model=TTS_MODEL)
    # b"".join(...) concatenates every chunk into one bytes object; we need the
    # complete file in memory anyway since we send it back over the socket in
    # a single message rather than streaming it out chunk-by-chunk.
    return b"".join(audio_chunks)
