# Recipe Backend

A FastAPI backend that parses recipes from URLs, uploaded files, or images using Claude AI, and stores them in a local SQLite database.

## Features

- Parse recipes from a URL (web scraping)
- Parse recipes from uploaded files (images, PDFs, text files)
- Store, retrieve, update, and delete recipes
- Auto-assigns an emoji to each recipe based on its content

## Setup

### 1. Prerequisites

- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com/)

### 2. Clone and navigate to the backend

```bash
cd backend
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

Create a `.env` file in the `backend/` directory:

```env
CLAUDE_TOKEN="your-anthropic-api-key-here"
DATABASE_URL="database.db"
```

### 6. Run the server

```bash
python main.py
```

The server starts at `http://127.0.0.1:8000`. Interactive API docs are available at `http://127.0.0.1:8000/docs`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload_file_to_json` | Upload a file (image, PDF, txt) and parse it into a recipe |
| `POST` | `/url_to_json` | Pass a URL and parse the page into a recipe |
| `POST` | `/recipe_to_db` | Save a parsed recipe to the database |
| `GET` | `/recipes` | Get all recipes (supports `query`, `page`, `limit` params) |
| `GET` | `/{recipeid}` | Get a single recipe by ID |
| `PUT` | `/{recipeid}` | Update a recipe by ID |
| `DELETE` | `/{recipeid}` | Delete a recipe by ID |

## Supported File Formats

Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`  
Documents: `.pdf`  
Text: `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`

## Project Structure

```
backend/
├── api/
│   ├── app.py          # FastAPI routes and logic
│   ├── config.py       # Claude AI prompt
│   └── database.py     # SQLite connection helpers
├── main.py             # Entry point (runs uvicorn)
├── requirements.txt
└── .env                # API keys (not committed)
```
