import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ParseRecipeRequest {
  recipeText: string;
  language?: string;
}

export interface ParseRecipeResponse {
  recipeName: string;
  ingredients: Array<{
    name: string;
    quantity: string;
    notes?: string;
  }>;
  instructions: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseRecipeRequest = await request.json();
    const { recipeText, language = 'English' } = body;

    if (!recipeText || !recipeText.trim()) {
      return NextResponse.json(
        { error: 'Recipe text is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 500 }
      );
    }

    // Use Gemini to parse the recipe
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a recipe parser. Parse the following recipe text into structured JSON format.
Return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):

{
  "recipeName": "string",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount with unit",
      "notes": "optional notes like 'diced' or 'room temperature'"
    }
  ],
  "instructions": "step by step cooking instructions",
  "prepTime": "preparation time (e.g., '15 min')",
  "cookTime": "cooking time (e.g., '30 min')",
  "servings": "number of servings (e.g., '4 servings')"
}

Important rules:
- Extract the recipe name from the text
- Parse each ingredient with its quantity and name
- If measurements or notes are mentioned, include them
- Combine all instructions into a single paragraph or numbered steps
- Extract timing information if mentioned
- If any field is not found, use reasonable defaults or empty strings
- All text should be in ${language}

Recipe text to parse:
${recipeText}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let parsedRecipe: ParseRecipeResponse;
    try {
      parsedRecipe = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', text);
      throw new Error('AI returned invalid response format');
    }

    // Validate required fields
    if (!parsedRecipe.recipeName || !parsedRecipe.ingredients || !parsedRecipe.instructions) {
      throw new Error('AI response missing required fields');
    }

    if (parsedRecipe.ingredients.length === 0) {
      throw new Error('AI response missing ingredients');
    }

    // Ensure all ingredients have required fields
    for (const ingredient of parsedRecipe.ingredients) {
      if (!ingredient.name || !ingredient.quantity) {
        throw new Error('Invalid ingredient format in AI response');
      }
    }

    return NextResponse.json(parsedRecipe);

  } catch (error) {
    console.error('Recipe parsing API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: `Failed to parse recipe: ${errorMessage}` },
      { status: 500 }
    );
  }
}
