import asyncio
from pathlib import Path

import speech_recognition as sr
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from database import init_db, seed_data

app = FastAPI(title="Sandbox FastAPI")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@app.on_event("startup") # when the fasapi, starts the following happens
def startup_event() -> None: 
    init_db()   # initializes the database and creates the table if it doesn't exist
    seed_data() # just inserts something random if there's nothing


@app.get("/") # for endpoint /
def read_root() -> dict[str, str]:
    return {"message": "FastAPI backend is running"}


@app.websocket("/ws") # for endpoint /ws
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept() # accepts the connection

    # the frontend tells us the sample rate its microphone was captured at
    # via a query param, e.g. ws://host/ws?rate=48000
    sample_rate = int(websocket.query_params.get("rate", 16000))
    sample_width = 2  # 16-bit PCM

    recognizer = sr.Recognizer()

    try:
        while True:
            data = await websocket.receive_bytes() # raw 16-bit PCM audio from the client

            audio = sr.AudioData(data, sample_rate, sample_width)

            try:
                # recognize_google is a blocking network call, so run it off the event loop
                transcript = await asyncio.to_thread(recognizer.recognize_google, audio)
                rtn_msg = f"You said: {transcript}"
            except sr.UnknownValueError:
                rtn_msg = "Could not understand audio"
            except sr.RequestError as e:
                rtn_msg = f"Speech recognition service error: {e}"

            await websocket.send_text(rtn_msg) # sends the transcript back to the client

    except WebSocketDisconnect:
        print("Client disconnected") # if the client disconnects, it prints this message
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()


# serves the built React frontend at /frontend/ so the backend hosts its own UI
# (run `npm install && npm run build` inside frontend/ first to generate dist/)
if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")



if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)