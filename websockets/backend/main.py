from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.voice import router as voice_router

app = FastAPI(title="Voice Reverser")  # the ASGI application uvicorn actually serves

# The websocket handshake itself isn't blocked by browser CORS the way a fetch/
# axios call would be, but this middleware is kept in place for the plain HTTP
# "/" health-check route below (and any future HTTP routes) so the Vite dev
# server on :5173 is allowed to call this API on :8000 during local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # only the Vite dev server origin is allowed
    allow_methods=["*"],  # permits GET/POST/etc, not just simple requests
    allow_headers=["*"],  # permits any request headers the frontend sends
)

# Registers every route defined in routes/voice.py (currently just the
# websocket endpoint) under the /api/voice prefix, so @router.websocket("/ws")
# there becomes reachable at ws://host:8000/api/voice/ws here.
app.include_router(voice_router, prefix="/api/voice", tags=["voice"])


@app.get("/")  # plain HTTP GET, useful for confirming the server is up (e.g. curl http://localhost:8000/)
def read_root() -> dict[str, str]:
    return {"message": "FastAPI backend is running"}


if __name__ == "__main__":
    # Only runs when this file is executed directly (`python main.py`), not
    # when it's imported (e.g. by tests or by `uvicorn main:app` from the CLI,
    # which imports this module rather than running it as __main__).
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
