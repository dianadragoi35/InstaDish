import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ParsedRecipe {
    recipeName: string;
    prepTime: string;
    cookTime: string;
    servings: number;
    cleanIngredientNames: string[];
    instructions: string[];
}

export interface ParsingResult {
    success: boolean;
    data?: ParsedRecipe;
    error?: string;
}

const parsingSchema = {
    type: Type.OBJECT,
    properties: {
        recipeName: {
            type: Type.STRING,
            description: "The name of the recipe extracted from the text."
        },
        prepTime: {
            type: Type.STRING,
            description: "Preparation time in format like '15 minutes' or '1 hour'. If not specified, use 'Not specified'."
        },
        cookTime: {
            type: Type.STRING,
            description: "Cooking time in format like '30 minutes' or '2 hours'. If not specified, use 'Not specified'."
        },
        servings: {
            type: Type.NUMBER,
            description: "Number of servings as a number. If not specified, use 4 as default."
        },
        cleanIngredientNames: {
            type: Type.ARRAY,
            description: "Clean ingredient names without quantities, measurements, or preparation instructions. Just the ingredient name (e.g., 'chicken breast', 'olive oil', 'garlic').",
            items: { type: Type.STRING },
        },
        instructions: {
            type: Type.ARRAY,
            description: "Step-by-step cooking instructions with quantities and measurements preserved as they appear in the original text.",
            items: { type: Type.STRING },
        },
    },
    required: ['recipeName', 'prepTime', 'cookTime', 'servings', 'cleanIngredientNames', 'instructions'],
};

export const parseRecipeText = async (recipeText: string): Promise<ParsingResult> => {
    if (!recipeText.trim()) {
        return {
            success: false,
            error: "Recipe text cannot be empty"
        };
    }

    const prompt = `Parse the following recipe text and extract structured data:

${recipeText}

Instructions:
1. Extract the recipe name, prep time, cook time, and servings
2. For cleanIngredientNames: Extract ONLY the ingredient names without any quantities, measurements, or preparation instructions
   - Good: "chicken breast", "olive oil", "garlic", "onion"
   - Bad: "2 lbs chicken breast", "1 tbsp olive oil", "3 cloves garlic minced"
3. For instructions: Keep the original step-by-step instructions with all quantities and measurements intact
4. If prep time, cook time, or servings are not explicitly mentioned, use reasonable defaults
5. Handle various recipe text formats (with or without clear sections, bullet points, etc.)`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: parsingSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as ParsedRecipe;

        // Basic validation
        if (!parsedData.recipeName || parsedData.cleanIngredientNames.length === 0 || parsedData.instructions.length === 0) {
            return {
                success: false,
                error: "Invalid recipe data: missing required fields"
            };
        }

        // Clean up ingredient names to ensure they don't contain quantities
        parsedData.cleanIngredientNames = parsedData.cleanIngredientNames.map(ingredient =>
            ingredient.toLowerCase().trim()
        );

        return {
            success: true,
            data: parsedData
        };

    } catch (error) {
        console.error("Error parsing recipe text:", error);

        // Handle specific error cases
        if (error instanceof SyntaxError) {
            return {
                success: false,
                error: "Failed to parse AI response as JSON"
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown parsing error"
        };
    }
};

export const validateParsedRecipe = (data: ParsedRecipe): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.recipeName || data.recipeName.trim().length === 0) {
        errors.push("Recipe name is required");
    }

    if (!data.prepTime || data.prepTime.trim().length === 0) {
        errors.push("Prep time is required");
    }

    if (!data.cookTime || data.cookTime.trim().length === 0) {
        errors.push("Cook time is required");
    }

    if (!data.servings || data.servings < 1) {
        errors.push("Servings must be a positive number");
    }

    if (!data.cleanIngredientNames || data.cleanIngredientNames.length === 0) {
        errors.push("At least one ingredient is required");
    }

    if (!data.instructions || data.instructions.length === 0) {
        errors.push("At least one instruction step is required");
    }

    // Check for potential quantities in ingredient names
    const quantityWords = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|cup|cups|tbsp|tsp|tablespoon|teaspoon|ounce|ounces|pound|pounds|lb|lbs|gram|grams|kilogram|kg|milliliter|ml|liter|liters)\b/i;

    data.cleanIngredientNames.forEach((ingredient, index) => {
        if (quantityWords.test(ingredient)) {
            errors.push(`Ingredient "${ingredient}" appears to contain quantities or measurements`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};