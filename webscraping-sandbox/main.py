from fastapi import FastAPI
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
import asyncio

# --- schemas ---

class ScrapeResponse(BaseModel):
    name: str
    markdown: str


# --- setup for functions + functions ---

async def scrape_to_markdown(url: str) -> str:  # Type hinting it as returning a string helps!
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    
    print(response.status_code)
    
    if response.status_code == 200:
        doc = BeautifulSoup(response.content, 'html.parser')
        return doc.get_text()  # This returns a string!
    else:
        # Instead of throwing a generic error, returning an error string keeps Pydantic happy
        # Or you can let it raise an exception, but returning a string matches your schema
        return f"Failed to fetch URL: {url} with status code: {response.status_code}"


# --- fastAPI set-up + Routes ---

app = FastAPI()

@app.get("/")
def home():
    return {}


@app.post("/url_to_markdown", response_model=ScrapeResponse)
async def upload_file_to_markdown(name: str, url: str):
    markdown_content = await scrape_to_markdown(url)
    
    return {
        "name": name,
        "markdown": markdown_content
    }

