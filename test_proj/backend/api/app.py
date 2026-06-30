import os
import re
import json
import base64
import shutil
import tempfile
from pathlib import Path
from dotenv import load_dotenv


import httpx
from anthropic import Anthropic
from bs4 import BeautifulSoup
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from api.config import PROMPT
from api.database import connect_db, close_db, init_db


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
    emoji: str
    recipe: RecipeCreate
    ingredients: list[IngredientOut] = []
    equipments: list[EquipmentOut] = []

    
# --- setup for functions + functions ---

load_dotenv()

CLAUDE_TOKEN = os.getenv("CLAUDE_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")

if CLAUDE_TOKEN is None:
    raise ValueError("CLAUDE_TOKEN is missing from .env")

client = Anthropic(
    api_key=CLAUDE_TOKEN,
)


async def convert_to_markdown(upload: UploadFile) -> str:
    """
    Extract text from uploaded files using Claude's API.
    Supports: images (JPEG, PNG, GIF, WebP), PDFs, Word docs (.docx, .doc), 
    text files, and other document formats.
    Returns markdown-formatted text.
    """
    suffix = Path(upload.filename).suffix.lower()
    
    image_formats = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    document_formats = {'.pdf'}
    text_formats = {'.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm'}
    
    all_formats = image_formats | document_formats | text_formats
    
    if suffix not in all_formats:
        raise ValueError(f"Unsupported format: {suffix}. Supported: {all_formats}")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(upload.file, tmp)
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            file_data = base64.standard_b64encode(f.read()).decode('utf-8')
        
        if suffix in image_formats:
            media_type_map = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            
            content = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type_map[suffix],
                        "data": file_data
                    }
                },
                {
                    "type": "text",
                    "text": "Extract all text from this image and return it as well-formatted markdown. Preserve the structure and layout where possible. Do not add commentary, just return the extracted text in markdown format."
                }
            ]
        
        elif suffix in document_formats:
            # Document handling (PDF, Word, Excel, PowerPoint, etc.)
            media_type_map = {
                '.pdf': 'application/pdf',
            }
            
            content = [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": media_type_map[suffix],
                        "data": file_data
                    }
                },
                {
                    "type": "text",
                    "text": "Extract all text and content from this document and return it as well-formatted markdown. Preserve the structure, headings, lists, tables, and layout where possible. For spreadsheets, format tables clearly. For presentations, include slide content in order. Do not add commentary, just return the extracted text in markdown format."
                }
            ]
        
        else:
            # Text file handling
            with open(tmp_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
            
            content = [
                {
                    "type": "text",
                    "text": f"Here is the content of a {suffix} file. Return it as well-formatted markdown, preserving structure where applicable:\n\n{text_content}"
                }
            ]
        
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ]
        )
        
        return message.content[0].text
    
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
        model="claude-haiku-4-5-20251001",
    )

    text = message.content[0].text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text.strip())


def get_recipe_emoji(title: str, description: str = "", ingredients: list[str] = None) -> str:
    ingredients = ingredients or []

    text = " ".join([title, description, *ingredients]).lower()

    emoji_rules = [
        (["spaghetti", "pasta", "noodle", "noodles", "carbonara", "alfredo", "lasagna", "macaroni", "mac and cheese"], "🍝"),
        (["ramen"], "🍜"),
        (["cookie", "cookies", "chocolate chip", "biscuit"], "🍪"),
        (["avocado"], "🥑"),
        (["toast"], "🍞"),
        (["soup", "broth", "stew", "chili"], "🍲"),
        (["banana bread", "loaf"], "🍞"),
        (["salad", "lettuce", "cucumber", "tomato", "caesar"], "🥗"),
        (["pizza", "pepperoni"], "🍕"),
        (["burger", "cheeseburger"], "🍔"),
        (["fries", "french fries"], "🍟"),
        (["rice", "fried rice", "risotto"], "🍚"),
        (["sushi"], "🍣"),
        (["chicken", "wings", "drumstick"], "🍗"),
        (["beef", "steak", "ribeye"], "🥩"),
        (["bacon"], "🥓"),
        (["fish", "salmon", "tuna"], "🐟"),
        (["shrimp", "prawn"], "🍤"),
        (["egg", "eggs", "omelette", "omelet"], "🥚"),
        (["cake", "cupcake"], "🍰"),
        (["pie", "tart"], "🥧"),
        (["pancake", "pancakes", "waffle", "waffles"], "🥞"),
        (["ice cream", "gelato"], "🍨"),
        (["donut", "doughnut"], "🍩"),
        (["coffee", "latte", "espresso"], "☕"),
        (["tea", "matcha"], "🍵"),
        (["smoothie", "juice"], "🥤"),
        (["taco", "burrito", "quesadilla"], "🌮"),
        (["sandwich", "sub"], "🥪"),
        (["hot dog"], "🌭"),
        (["dumpling", "gyoza"], "🥟"),
        (["curry"], "🍛"),
        (["cheese"], "🧀"),
        (["apple"], "🍎"),
        (["orange"], "🍊"),
        (["strawberry", "berry", "berries"], "🍓"),
    ]

    for keywords, emoji in emoji_rules:
        if any(word in text for word in keywords):
            return emoji

    return "🍽️"


# --- fastAPI set-up + endpoints and routes --- 

init_db()

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"], # block methods or only allow certain
    allow_headers=["*"], # block header or only allow certain
)


@app.get("/")
def home():
    return {}


@app.post("/upload_file_to_json", response_model=AIRecipeParseOut)
async def upload_file_to_json(file: UploadFile = File(...)):
    markdown_content = await convert_to_markdown(file)
    json_content = convert_to_json(markdown_content)
    
    return json_content
    
    
@app.post("/url_to_json", response_model=AIRecipeParseOut)
async def upload_url_to_json(url: str):
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

        emoji = get_recipe_emoji(recipe.title, recipe.description, [i.name for i in data.ingredients])

        return {
            "id": recipe_id,
            "emoji": emoji,
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
            

@app.put("/{recipeid}", response_model=RecipeDBOut)
def update_recipe(recipeid: int, data: RecipeToDB):
    connection = None
    cursor = None

    try:
        connection, cursor = connect_db()

        # check recipe exists
        cursor.execute("SELECT id FROM recipes WHERE id = ?", (recipeid,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Recipe not found")

        recipe = data.recipe

        cursor.execute("""
            UPDATE recipes SET
                title = ?,
                description = ?,
                instructions = ?,
                durationInMinutes = ?,
                serving = ?,
                notes = ?
            WHERE id = ?
        """, (
            recipe.title,
            recipe.description,
            recipe.instructions,
            recipe.durationInMinutes,
            recipe.serving,
            recipe.notes,
            recipeid,
        ))

        # replace ingredients and equipments wholesale
        cursor.execute("DELETE FROM ingredients WHERE recipeid = ?", (recipeid,))
        cursor.execute("DELETE FROM equipments WHERE recipeid = ?", (recipeid,))

        for ingredient in data.ingredients:
            cursor.execute(
                "INSERT INTO ingredients (name, recipeid) VALUES (?, ?)",
                (ingredient.name, recipeid)
            )

        for equipment in data.equipments:
            cursor.execute(
                "INSERT INTO equipments (name, recipeid) VALUES (?, ?)",
                (equipment.name, recipeid)
            )

        connection.commit()

        emoji = get_recipe_emoji(recipe.title, recipe.description, [i.name for i in data.ingredients])

        return {
            "id": recipeid,
            "emoji": emoji,
            "recipe": recipe,
            "ingredients": data.ingredients,
            "equipments": data.equipments
        }

    except HTTPException:
        raise
    except Exception as error:
        if connection:
            connection.rollback()
        raise HTTPException(status_code=500, detail=f"Was not able to update recipe: {str(error)}")

    finally:
        if cursor and connection:
            close_db(cursor, connection)


@app.get("/recipes", response_model=list[RecipeDBOut])
def get_recipes(query: str = "", page: int = 0, limit: int = 6):
    connection = None
    cursor = None

    try:
        connection, cursor = connect_db()

        if query:
            like = f"%{query}%"
            cursor.execute(
                """
                SELECT id, title, description, instructions, durationInMinutes, serving, notes
                FROM recipes
                WHERE title LIKE ? OR description LIKE ? OR notes LIKE ?
                LIMIT ? OFFSET ?
                """,
                (like, like, like, limit, page * limit),
            )
        else:
            cursor.execute(
                "SELECT id, title, description, instructions, durationInMinutes, serving, notes FROM recipes LIMIT ? OFFSET ?",
                (limit, page * limit),
            )

        recipe_rows = cursor.fetchall()

        if not recipe_rows:
            return []

        recipe_ids = [row[0] for row in recipe_rows]
        placeholders = ",".join("?" * len(recipe_ids))

        cursor.execute(
            f"SELECT name, recipeid FROM ingredients WHERE recipeid IN ({placeholders})",
            recipe_ids,
        )
        ingredients_by_recipe: dict[int, list[IngredientOut]] = {}
        for name, rid in cursor.fetchall():
            ingredients_by_recipe.setdefault(rid, []).append(IngredientOut(name=name))

        cursor.execute(
            f"SELECT name, recipeid FROM equipments WHERE recipeid IN ({placeholders})",
            recipe_ids,
        )
        equipments_by_recipe: dict[int, list[EquipmentOut]] = {}
        for name, rid in cursor.fetchall():
            equipments_by_recipe.setdefault(rid, []).append(EquipmentOut(name=name))

        return [
            {
                "id": row[0],
                "emoji": get_recipe_emoji(row[1], row[2], [i.name for i in ingredients_by_recipe.get(row[0], [])]),
                "recipe": RecipeCreate(
                    title=row[1],
                    description=row[2],
                    instructions=row[3],
                    durationInMinutes=row[4],
                    serving=row[5],
                    notes=row[6],
                ),
                "ingredients": ingredients_by_recipe.get(row[0], []),
                "equipments": equipments_by_recipe.get(row[0], []),
            }
            for row in recipe_rows
        ]

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to get recipes: {str(error)}")

    finally:
        if cursor and connection:
            close_db(cursor, connection)


@app.get("/{recipeid}", response_model=RecipeDBOut)
def get_recipe(recipeid: int):
    connection = None
    cursor = None

    try:
        connection, cursor = connect_db()

        cursor.execute(
            "SELECT id, title, description, instructions, durationInMinutes, serving, notes FROM recipes WHERE id = ?",
            (recipeid,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Recipe not found")

        recipe_data = RecipeCreate(
            title=row[1],
            description=row[2],
            instructions=row[3],
            durationInMinutes=row[4],
            serving=row[5],
            notes=row[6],
        )

        cursor.execute("SELECT name FROM ingredients WHERE recipeid = ?", (recipeid,))
        ingredients = [IngredientOut(name=r[0]) for r in cursor.fetchall()]

        cursor.execute("SELECT name FROM equipments WHERE recipeid = ?", (recipeid,))
        equipments = [EquipmentOut(name=r[0]) for r in cursor.fetchall()]

        return {
            "id": row[0],
            "emoji": get_recipe_emoji(recipe_data.title, recipe_data.description, [i.name for i in ingredients]),
            "recipe": recipe_data,
            "ingredients": ingredients,
            "equipments": equipments,
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to get recipe: {str(error)}")

    finally:
        if cursor and connection:
            close_db(cursor, connection)


@app.delete("/{recipeid}")
def delete_recipe(recipeid: int):
    connection = None
    cursor = None

    try:
        connection, cursor = connect_db()

        cursor.execute("SELECT id FROM recipes WHERE id = ?", (recipeid,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Recipe not found")

        cursor.execute("DELETE FROM ingredients WHERE recipeid = ?", (recipeid,))
        cursor.execute("DELETE FROM equipments WHERE recipeid = ?", (recipeid,))
        cursor.execute("DELETE FROM recipes WHERE id = ?", (recipeid,))
        connection.commit()

        return {"message": f"Recipe {recipeid} deleted successfully"}

    except HTTPException:
        raise
    except Exception as error:
        if connection:
            connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete recipe: {str(error)}")

    finally:
        if cursor and connection:
            close_db(cursor, connection)