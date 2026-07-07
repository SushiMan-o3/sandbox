import os  # gives us access to environment variables via os.environ

from dotenv import load_dotenv  # reads a local .env file and loads it into the process environment

load_dotenv()  # must run before we read any os.environ values below, or .env values won't be visible yet

# Deepgram needs this to authenticate every API call; empty string means requests will fail with 401
# until a real key is supplied via .env (see .env.example for the expected file).
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "")

# Which Deepgram speech-to-text model to transcribe with. nova-3 is Deepgram's current
# cheapest/fastest general-purpose model, so it's the default if the env var isn't set.
STT_MODEL = os.environ.get("DEEPGRAM_STT_MODEL", "nova-3")

# Which Deepgram text-to-speech voice/model to synthesize the reversed sentence with.
# aura-asteria-en (Aura-1) is Deepgram's cheapest TTS tier, used as the default here.
TTS_MODEL = os.environ.get("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
