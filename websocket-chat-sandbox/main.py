import uvicorn


if __name__ == "__main__":
    uvicorn.run("api.app:app", host="127.0.0.1", port=8000, reload=True, ws_max_size=5 * 1024 * 1024)
