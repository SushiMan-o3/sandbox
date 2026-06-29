PROMPT = """
Your job is to take messy scraped recipe text or OCR-scanned recipe text and convert it into clean JSON that fits my SQLite database structure and FastAPI response schema.

My database structure is:

recipes table:

* title: string, required, max 100 characters
* description: string, required
* instructions: string, required
* durationInMinutes: integer, required
* serving: integer, required
* notes: string or null

ingredients table:

* name: string, required
* recipeid will be added by the backend after the recipe is created

equipments table:

* name: string, required
* recipeid will be added by the backend after the recipe is created

Output rules:

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Do not include comments.
Do not include extra text outside the JSON.

The JSON must follow this exact structure:

{
"recipe": {
"title": "",
"description": "",
"instructions": "",
"durationInMinutes": 0,
"serving": 0,
"notes": null
},
"ingredients": [
{
"name": ""
}
],
"equipments": [
{
"name": ""
}
],
"unmapped_text": []
}

Recipe field rules:

The title should be the recipe name.
Keep the title under 100 characters.

The description should be a short summary of what the recipe is.
Example:
"A simple homemade chocolate chip cookie recipe."

The instructions field should contain the actual cooking steps as one clean string.
Use numbered steps inside the string.
Example:
"1. Preheat the oven to 350°F.
2. Mix the flour, sugar, and butter.
3. Bake for 12 minutes."

If a recipe step includes temperature, timing, or cooking settings, keep that information inside the instructions string.
Example:
"Bake at 350°F for 25 minutes."

durationInMinutes must be an integer number of minutes.
Make reasonable time conversions only.
Examples:

* "1 hour" becomes 60
* "1 hour 30 minutes" becomes 90
* "half an hour" becomes 30

serving must be an integer.
If the recipe says "serves 4", use 4.
If the recipe says "makes 12 cookies", use 12.

Use notes only for extra recipe information that is not part of the main cooking instructions.
Good notes include:

* storage tips
* substitutions
* optional toppings
* serving suggestions
* make-ahead advice
* leftover advice
* warnings or special tips

Do not put the full recipe instructions inside notes.

Ingredient rules:

The ingredients table only has a name column.
Store the full ingredient line as the name.

Examples:

* "2 cups flour"
* "1 tbsp olive oil"
* "3 cloves garlic, minced"

Do not split ingredients into quantity, unit, or item fields.

Remove duplicate ingredients.

If no ingredients are found, return an empty ingredients array.

Equipment rules:

The equipments table only has a name column.
Store only the equipment name.

Examples:

* "mixing bowl"
* "oven"
* "baking tray"
* "knife"
* "pan"

Do not include recipeid.
The backend will add recipeid after the recipe is inserted.

Remove duplicate equipment.

If no equipment is found, return an empty equipments array.

Missing information rules:

If title, description, instructions, durationInMinutes, or serving cannot be found, set that field to null.
Do not invent exact values.
Do not add a missing_required_fields field.
Do not add a database_ready field.

Cleaning rules:

Clean obvious OCR mistakes.
Remove duplicated repeated text.
Ignore website navigation text, ads, comments, unrelated buttons, and unrelated page text.
If text does not clearly fit into recipe, ingredients, equipment, instructions, or notes, put it inside unmapped_text.

Do not create these fields:

* database_ready
* missing_required_fields
* userid
* recipeid
* quantity
* unit
* calories
* category
* nutrition
* image
* tag
* step
* stepNumber

The recipe text begins below:
"""
