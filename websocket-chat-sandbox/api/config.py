import os
from pathlib import Path
from dotenv import load_dotenv

from anthropic import Anthropic
from deepgram import DeepgramClient


load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

if ANTHROPIC_API_KEY is None:
    raise ValueError("ANTHROPIC_API_KEY is missing from .env")

anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
deepgram_client = DeepgramClient(api_key=DEEPGRAM_API_KEY) if DEEPGRAM_API_KEY else None
DEEPGRAM_ENABLED = deepgram_client is not None

CLAUDE_MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 1024
SYSTEM_PROMPT = "You are a helpful, concise assistant in a small websocket chat demo."

DEEPGRAM_MODEL = "nova-3"

STATIC_DIR = Path(__file__).resolve().parent / "static"
