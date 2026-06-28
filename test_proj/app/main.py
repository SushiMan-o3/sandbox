import os
import shutil
import tempfile
from pathlib import Path

import httpx
from anthropic import Anthropic
from bs4 import BeautifulSoup
from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import sqlite3 as sql

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import EasyOcrOptions, PdfPipelineOptions

from config import CLAUDE_TOKEN, PROMPT
from database import connect_db, close_db, init_db


# --- schemas --- 

class IngredientOut(BaseModel):
    name: str


class EquipmentOut(BaseModel):
    name: str


class AIRecipeOut(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    instructions: Optional[str] = None
    durationInMinutes: Optional[int] = None
    serving: Optional[int] = None
    notes: Optional[str] = None


class AIRecipeParseOut(BaseModel):
    recipe: AIRecipeOut
    ingredients: list[IngredientOut] = []
    equipments: list[EquipmentOut] = []
    unmapped_text: list[str] = []
    
class RecipeCreate(BaseModel):
    title: str = Field(..., max_length=100)
    description: str
    instructions: str
    durationInMinutes: int
    serving: int
    notes: Optional[str] = None


class RecipeToDB(BaseModel):
    recipe: RecipeCreate
    ingredients: list[IngredientOut] = []
    equipments: list[EquipmentOut] = []
    
class RecipeDBOut(BaseModel):
    id: int
    recipe: RecipeCreate
    ingredients: list[IngredientOut] = []
    equipments: list[EquipmentOut] = []

    
# --- setup for functions + functions ---

client = Anthropic(
    api_key=os.environ.get(CLAUDE_TOKEN),
)


pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = True # enables it to read pdfs/images without text layer
pipeline_options.ocr_options = EasyOcrOptions() # EasyOcr is the best option, the other Ocrs suck

converter = DocumentConverter(   # adding format options for the converter
    format_options={
        InputFormat.IMAGE: PdfFormatOption(pipeline_options=pipeline_options),
        InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
    }
)


def convert_to_markdown(upload: UploadFile):
    suffix = Path(upload.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(upload.file, tmp)
        tmp_path = tmp.name

    try:
        doc = converter.convert(tmp_path).document
        return doc.export_to_markdown()
    finally:
        Path(tmp_path).unlink(missing_ok=True)
        
        
async def scrape_to_markdown(url: str) -> str:  
    async with httpx.AsyncClient() as client: # gets the html page from the url
        response = await client.get(url)
    
    print(response.status_code)
    
    if response.status_code == 200:
        doc = BeautifulSoup(response.content, 'html.parser')
        return doc.get_text() 
    else:
        return f"Failed to fetch URL: {url} with status code: {response.status_code}"


def convert_to_json(markdown: str) -> dict:
    message = client.messages.create(
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": PROMPT + markdown,
            }
        ],
        model="claude-haiku-4-5",
    )
    
    return message.content


# --- fastAPI set-up + Routes --- 

init_db()
app = FastAPI()


@app.get("/")
def home():
    return {}

"""
so the end below basically accept an input type then convert it into usable data
which it returns then redirect you to add_recipe manually which has all fields added
in there where the person can oversee what is happened and make edits as nesscary then
submit the recipe on their own as needed
"""

@app.post("/upload_file_to_markdown", response_model=AIRecipeParseOut)
def upload_file_to_markdown(file: UploadFile = File(...)):
    markdown_content = convert_to_markdown(file)
    json_content = convert_to_json(markdown_content)
    
    return json_content
    
    
@app.post("/url_to_markdown", response_model=AIRecipeParseOut)
async def upload_file_to_markdown(url: str):
    markdown_content = await scrape_to_markdown(url)
    json_content = convert_to_json(markdown_content)

    return json_content


@app.post("/recipe_to_db", response_model=RecipeDBOut)
def recipe_to_db(data: RecipeToDB):
    connection = None
    cursor = None

    try:
        connection, cursor = connect_db()

        recipe = data.recipe

        cursor.execute("""
            INSERT INTO recipes (
                title,
                description,
                instructions,
                durationInMinutes,
                serving,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            recipe.title,
            recipe.description,
            recipe.instructions,
            recipe.durationInMinutes,
            recipe.serving,
            recipe.notes,
        ))

        recipe_id = cursor.lastrowid

        for ingredient in data.ingredients:
            cursor.execute("""
                INSERT INTO ingredients (name, recipeid)
                VALUES (?, ?)
            """, (ingredient.name, recipe_id))

        for equipment in data.equipments:
            cursor.execute("""
                INSERT INTO equipments (name, recipeid)
                VALUES (?, ?)
            """, (equipment.name, recipe_id))

        connection.commit()

        return {
            "id": recipe_id,
            "recipe": recipe,
            "ingredients": data.ingredients,
            "equipments": data.equipments
        }

    except Exception as error:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Was not able to add recipe: {str(error)}"
        )

    finally:
        if cursor and connection:
            close_db(cursor, connection)