from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup

# --- schemas ---

class ScrapeResponse(BaseModel):
    name: str
    markdown: str


# --- setup for functions + functions ---

def scrape_to_markdown(url: str):
    pass

# --- fastAPI set-up + Routes ---

app = FastAPI()

@app.get("/")
def home():
    return {}


@app.post("/url_to_markdown", response_model=ScrapeResponse)
def upload_file_to_markdown(name: str, url: str):
    return {
        "name": name,
        "markdown": scrape_to_markdown(url)
    }