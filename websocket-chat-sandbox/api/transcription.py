from api.config import deepgram_client, DEEPGRAM_MODEL


class DeepgramNotConfigured(Exception):
    pass


def transcribe_audio(audio_bytes: bytes) -> str:
    if deepgram_client is None:
        raise DeepgramNotConfigured()

    response = deepgram_client.listen.v1.media.transcribe_file(
        request=audio_bytes,
        model=DEEPGRAM_MODEL,
    )

    return response.results.channels[0].alternatives[0].transcript
