import { GoogleGenAI, Type } from "@google/genai";
import type { Recipe } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        recipeName: { type: Type.STRING, description: "The name of the recipe." },
        description: { type: Type.STRING, description: "A short, enticing description of the dish." },
        prepTime: { type: Type.STRING, description: "Preparation time, e.g., '15 minutes'." },
        cookTime: { type: Type.STRING, description: "Cooking time, e.g., '30 minutes'." },
        servings: { type: Type.STRING, description: "Number of servings the recipe makes, e.g., '4 servings'." },
        ingredients: {
            type: Type.ARRAY,
            description: "A list of all ingredients required for the recipe, with measurements.",
            items: { type: Type.STRING },
        },
        instructions: {
            type: Type.ARRAY,
            description: "Step-by-step instructions to prepare the dish.",
            items: { type: Type.STRING },
        },
    },
    required: ['recipeName', 'description', 'prepTime', 'cookTime', 'servings', 'ingredients', 'instructions'],
};


export const generateRecipe = async (ingredients: string, cuisine: string, language: string): Promise<{ recipe: Recipe; imageUrl: string }> => {
    const prompt = `Generate a recipe in ${language || 'English'}.
    - Main ingredients available: ${ingredients}.
    - Preferred cuisine: ${cuisine || 'Any'}.

    Provide a single, complete recipe with a name, short description, prep time, cook time, number of servings, a list of ingredients with quantities, and step-by-step instructions. The entire response must be in ${language || 'English'}.`;

    try {
        // Step 1: Generate the recipe text content
        const recipeResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: recipeSchema,
            },
        });

        const jsonText = recipeResponse.text.trim();
        const recipeData = JSON.parse(jsonText) as Recipe;

        let imageUrl = '';
        try {
            // Step 2: Generate an image based on the recipe
            const imagePrompt = `A high-quality, professional food photograph of "${recipeData.recipeName}". ${recipeData.description}. The dish should look appetizing and be presented beautifully on a plate, ready to be served.`;
            
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imagePrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '4:3',
                },
            });

            const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
            imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        } catch (imageError) {
            console.warn("Image generation failed. Proceeding without an image. Error:", imageError);
            // Image generation failed, but we can still return the recipe.
            // imageUrl is already initialized to '', so we just continue.
        }

        return { recipe: recipeData, imageUrl };

    } catch (error) {
        console.error("Error generating recipe:", error);
        throw new Error("Failed to generate recipe from the Gemini API. Please check your input or API key.");
    }
};