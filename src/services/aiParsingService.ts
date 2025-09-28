import { GoogleGenAI, Type } from "@google/genai";
import { ParsedRecipeIngredient, ParsedRecipeData } from "../types";

// Use client-side environment variable since this runs in the browser
if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

// Legacy interface for backward compatibility
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

export interface StructuredParsingResult {
    success: boolean;
    data?: ParsedRecipeData;
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

const structuredParsingSchema = {
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
            type: Type.STRING,
            description: "Number of servings as a string (e.g., '4', '6-8', '2-3'). If not specified, use '4'."
        },
        instructions: {
            type: Type.STRING,
            description: "Step-by-step cooking instructions as a single formatted string with line breaks between steps."
        },
        ingredients: {
            type: Type.ARRAY,
            description: "Structured ingredient objects with clean names, quantities, and optional preparation notes.",
            items: {
                type: Type.OBJECT,
                properties: {
                    cleanName: {
                        type: Type.STRING,
                        description: "Clean ingredient name without quantities or measurements (e.g., 'chicken breast', 'olive oil', 'garlic')"
                    },
                    quantity: {
                        type: Type.STRING,
                        description: "Quantity with measurement (e.g., '100g', '2 cups', '1 tbsp', '3 cloves')"
                    },
                    notes: {
                        type: Type.STRING,
                        description: "Optional preparation notes (e.g., 'diced', 'minced', 'at room temperature', 'sifted')"
                    }
                },
                required: ['cleanName', 'quantity']
            }
        },
    },
    required: ['recipeName', 'prepTime', 'cookTime', 'servings', 'instructions', 'ingredients'],
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

// New structured parsing function for the junction table system
export const parseRecipeTextStructured = async (recipeText: string): Promise<StructuredParsingResult> => {
    if (!recipeText.trim()) {
        return {
            success: false,
            error: "Recipe text cannot be empty"
        };
    }

    const prompt = `Parse the following recipe text and extract structured data with separated ingredient quantities. This recipe may be in any language (English, Romanian, Spanish, French, etc.).

${recipeText}

CRITICAL INSTRUCTIONS - PRESERVE ALL QUANTITIES:
1. Extract the recipe name, prep time, cook time, and servings
2. For each ingredient, separate into three parts:
   - cleanName: ONLY the ingredient name in its original language (e.g., "carne de pui", "chicken breast", "olive oil", "smântână")
   - quantity: The COMPLETE measurement amount including units (e.g., "700g", "2 cups", "1 tbsp", "3 cloves", "1/2", "300 ml")
   - notes: Optional preparation instructions (e.g., "cu os", "diced", "minced", "sifted", "at room temperature")

3. MEASUREMENT EXAMPLES FOR VARIOUS LANGUAGES:

   ROMANIAN EXAMPLES (CRITICAL - STUDY THESE PATTERNS):
   Romanian: "700 g de carne de pui cu os" → cleanName: "carne de pui", quantity: "700g", notes: "cu os"
   Romanian: "4 kg varză murată" → cleanName: "varză murată", quantity: "4kg", notes: ""
   Romanian: "1 ½ kg afumătură" → cleanName: "afumătură", quantity: "1.5kg", notes: ""
   Romanian: "3-4 linguri de ulei de floarea soarelui" → cleanName: "ulei de floarea soarelui", quantity: "3-4 linguri", notes: ""
   Romanian: "1 ceapă" → cleanName: "ceapă", quantity: "1", notes: ""
   Romanian: "1 morcov" → cleanName: "morcov", quantity: "1", notes: ""
   Romanian: "1 ardei gras roșu" → cleanName: "ardei gras roșu", quantity: "1", notes: ""
   Romanian: "1 cană de bulion de casă" → cleanName: "bulion de casă", quantity: "1 cană", notes: ""
   Romanian: "1 linguriță de cimbru uscat" → cleanName: "cimbru uscat", quantity: "1 linguriță", notes: ""
   Romanian: "un ardei gras" → cleanName: "ardei gras", quantity: "1", notes: ""
   Romanian: "o jumătate de țelină" → cleanName: "țelină", quantity: "1/2", notes: ""
   Romanian: "două cepe" → cleanName: "ceapă", quantity: "2", notes: ""
   Romanian: "două rădăcini de păstârnac" → cleanName: "păstârnac", quantity: "2", notes: "rădăcini"
   Romanian: "300 g de smântână" → cleanName: "smântână", quantity: "300g", notes: ""
   Romanian: "două trei linguri de oțet" → cleanName: "oțet", quantity: "2-3 linguri", notes: ""
   Romanian: "patru gălbenușuri" → cleanName: "gălbenușuri", quantity: "4", notes: ""
   Romanian: "o legătură de pătrunjel" → cleanName: "pătrunjel", quantity: "1 legătură", notes: ""
   Romanian: "trei foi de dafin" → cleanName: "foi de dafin", quantity: "3", notes: ""

   ENGLISH EXAMPLES:
   English: "100g flour, sifted" → cleanName: "flour", quantity: "100g", notes: "sifted"
   English: "2 large eggs" → cleanName: "eggs", quantity: "2 large", notes: ""
   English: "1 onion, finely chopped" → cleanName: "onion", quantity: "1", notes: "finely chopped"

4. QUANTITY FORMATS TO RECOGNIZE:
   - Metric: g, kg, ml, l, litri, grame, kilograme
   - Imperial: cups, tbsp, tsp, tablespoon, teaspoon, ounce, pound, lb
   - Count: 1, 2, 3, pieces, bucăți, bucată
   - Fractions: 1/2, 1/3, 1/4, 3/4
   - Descriptive: large, small, medium, mare, mic, mijlociu

   ROMANIAN NUMBER WORDS (ESSENTIAL):
   - un/o = 1 (masculine/feminine)
   - doi/două = 2 (masculine/feminine)
   - trei = 3
   - patru = 4
   - cinci = 5
   - șase = 6
   - șapte = 7
   - opt = 8
   - nouă = 9
   - zece = 10

   ROMANIAN FRACTIONS:
   - o jumătate = 1/2
   - un sfert = 1/4
   - trei sferturi = 3/4

   ROMANIAN MEASUREMENTS:
   - lingură/linguri = tablespoon(s)
   - linguriță/lingurițe = teaspoon(s)
   - cană/căni = cup(s)
   - legătură = bunch
   - rădăcină/rădăcini = root(s)
   - bucată/bucăți = piece(s)
   - foi = leaves

5. NEVER lose quantities - if you see a number or measurement, it MUST be captured in the quantity field
6. For instructions: Combine all steps into a single formatted string with line breaks
7. Handle various recipe text formats (with or without clear sections, bullet points, etc.)`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: structuredParsingSchema,
            },
        });

        const jsonText = response.text.trim();
        console.log('🔍 AI Raw Response:', jsonText);

        const parsedData = JSON.parse(jsonText) as ParsedRecipeData;
        console.log('📋 Parsed Recipe Data:', parsedData);

        // Basic validation
        if (!parsedData.recipeName || parsedData.ingredients.length === 0 || !parsedData.instructions) {
            console.error('❌ Basic validation failed:', {
                hasRecipeName: !!parsedData.recipeName,
                ingredientsCount: parsedData.ingredients?.length || 0,
                hasInstructions: !!parsedData.instructions
            });
            return {
                success: false,
                error: "Invalid recipe data: missing required fields"
            };
        }

        // Check for quantity preservation
        const ingredientsWithoutQuantities = parsedData.ingredients.filter(ing =>
            !ing.quantity || ing.quantity.trim() === '' || ing.quantity === '1'
        );

        if (ingredientsWithoutQuantities.length > 0) {
            console.warn('⚠️ Some ingredients may be missing quantities:', ingredientsWithoutQuantities);
        }

        // Log successful parsing details
        console.log('✅ Successfully parsed ingredients with quantities:',
            parsedData.ingredients.map(ing => `${ing.quantity} ${ing.cleanName}${ing.notes ? ` (${ing.notes})` : ''}`)
        );

        // Clean up ingredient names to ensure they don't contain quantities
        parsedData.ingredients = parsedData.ingredients.map(ingredient => ({
            ...ingredient,
            cleanName: ingredient.cleanName.toLowerCase().trim(),
            quantity: ingredient.quantity.trim(),
            notes: ingredient.notes?.trim() || undefined
        }));

        // Apply Romanian quantity extraction fallback if needed (but don't flag "1" as needing fixing)
        const ingredientsWithoutProperQuantities = parsedData.ingredients.filter(ing =>
            !ing.quantity ||
            ing.quantity.trim() === '' ||
            ing.quantity.toLowerCase() === 'not specified' ||
            ing.quantity.toLowerCase() === 'sufficient' ||
            ing.quantity.toLowerCase() === 'to taste'
        );

        if (ingredientsWithoutProperQuantities.length > 0) {
            console.log(`⚠️ ${ingredientsWithoutProperQuantities.length} ingredients missing quantities, applying fallback extraction`);
            parsedData.ingredients = extractRomanianQuantities(recipeText, parsedData.ingredients);
        }

        return {
            success: true,
            data: parsedData
        };

    } catch (error) {
        console.error("Error parsing structured recipe text:", error);

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

// Fallback quantity extraction for Romanian recipes
export const extractRomanianQuantities = (originalText: string, parsedIngredients: ParsedRecipeIngredient[]): ParsedRecipeIngredient[] => {
    console.log('🔧 Running Romanian quantity extraction fallback');

    const romanianNumberMap: { [key: string]: string } = {
        'un': '1', 'o': '1',
        'doi': '2', 'două': '2',
        'trei': '3',
        'patru': '4',
        'cinci': '5',
        'șase': '6',
        'șapte': '7',
        'opt': '8',
        'nouă': '9',
        'zece': '10',
        'o jumătate': '1/2',
        'un sfert': '1/4',
        'trei sferturi': '3/4'
    };

    const improvedIngredients = parsedIngredients.map(ingredient => {
        // Skip if already has good quantity (including valid "1" quantities)
        if (ingredient.quantity &&
            ingredient.quantity.trim() !== '' &&
            ingredient.quantity.toLowerCase() !== 'not specified' &&
            ingredient.quantity.toLowerCase() !== 'sufficient' &&
            ingredient.quantity.toLowerCase() !== 'to taste') {
            return ingredient;
        }

        console.log(`🔍 Analyzing ingredient: ${ingredient.cleanName}`);

        // Look for this ingredient in the original text with more comprehensive patterns
        const escapedIngredient = ingredient.cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
        const searchPatterns = [
            // Enhanced kilogram measurements (priority patterns first)
            new RegExp(`(\\d+\\s*½\\s*kg\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*[½¼¾]\\s*kg\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*kg\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*kg\\s+de\\s+${escapedIngredient})`, 'i'),
            // Enhanced range patterns (3-4 linguri)
            new RegExp(`(\\d+-\\d+\\s*linguri\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+-\\d+\\s*lingurițe\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+-\\d+\\s*căni\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+-\\d+\\s*grame\\s+de\\s+${escapedIngredient})`, 'i'),
            // Enhanced spoon measurements
            new RegExp(`(\\d+\\s*linguri\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*linguriță\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*lingurițe\\s+de\\s+${escapedIngredient})`, 'i'),
            // Enhanced gram measurements
            new RegExp(`(\\d+\\s*g\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*g\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*grame\\s+de\\s+${escapedIngredient})`, 'i'),
            // Cup/glass measurements
            new RegExp(`(\\d+\\s*cană\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(\\d+\\s*căni\\s+de\\s+${escapedIngredient})`, 'i'),
            // Simple count patterns
            new RegExp(`(\\d+\\s+${escapedIngredient})`, 'i'),
            // Count with words
            new RegExp(`(un\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(o\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(doi\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(două\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(trei\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(patru\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(cinci\\s+${escapedIngredient})`, 'i'),
            // Fractions
            new RegExp(`(o\\s+jumătate\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(un\\s+sfert\\s+de\\s+${escapedIngredient})`, 'i'),
            // Special measurements
            new RegExp(`(două\\s+rădăcini\\s+de\\s+${escapedIngredient})`, 'i'),
            new RegExp(`(o\\s+legătură\\s+de\\s+${escapedIngredient})`, 'i'),
            // With adjectives (like "1 ardei gras roșu")
            new RegExp(`(\\d+\\s+${escapedIngredient}\\s+\\w+)`, 'i'),
            new RegExp(`(un\\s+${escapedIngredient}\\s+\\w+)`, 'i'),
            new RegExp(`(o\\s+${escapedIngredient}\\s+\\w+)`, 'i'),
            // Broader patterns for complex ingredient names (like "ulei de floarea soarelui")
            new RegExp(`(\\d+-\\d+\\s*linguri\\s+de\\s+.*${escapedIngredient}.*?)(?=\\s|$|,|\\.| \\d)`, 'i'),
            new RegExp(`(\\d+\\s*[½¼¾]?\\s*kg\\s+.*${escapedIngredient}.*?)(?=\\s|$|,|\\.| \\d)`, 'i'),
            new RegExp(`(\\d+\\s*g\\s+de\\s+.*${escapedIngredient}.*?)(?=\\s|$|,|\\.| \\d)`, 'i'),
        ];

        for (const pattern of searchPatterns) {
            const match = originalText.match(pattern);
            if (match) {
                const matchedText = match[1];
                console.log(`✅ Found match for ${ingredient.cleanName}: "${matchedText}"`);

                // Extract quantity from matched text
                let extractedQuantity = ingredient.quantity;

                // Handle kilogram measurements (including fractions like "1 ½ kg")
                const kgMatch = matchedText.match(/(\d+)\s*(½|¼|¾)?\s*kg/i);
                if (kgMatch) {
                    let quantity = kgMatch[1];
                    if (kgMatch[2]) {
                        // Convert fractions to decimal
                        const fractionMap: { [key: string]: string } = {
                            '½': '.5',
                            '¼': '.25',
                            '¾': '.75'
                        };
                        quantity = quantity + (fractionMap[kgMatch[2]] || kgMatch[2]);
                    }
                    extractedQuantity = `${quantity}kg`;
                }
                // Handle gram measurements
                else if (matchedText.match(/(\d+)\s*g(?:\s|$|,)/i)) {
                    const gramMatch = matchedText.match(/(\d+)\s*g/i);
                    if (gramMatch) {
                        extractedQuantity = `${gramMatch[1]}g`;
                    }
                }
                // Handle range measurements (like "3-4 linguri")
                else if (matchedText.match(/(\d+)-(\d+)\s*(linguri|lingurițe|căni|grame)/i)) {
                    const rangeMatch = matchedText.match(/(\d+)-(\d+)\s*(linguri|lingurițe|căni|grame)/i);
                    if (rangeMatch) {
                        extractedQuantity = `${rangeMatch[1]}-${rangeMatch[2]} ${rangeMatch[3]}`;
                    }
                }
                // Handle single spoon measurements
                else if (matchedText.match(/(\d+)\s*(linguri|linguriță|lingurițe)/i)) {
                    const spoonMatch = matchedText.match(/(\d+)\s*(linguri|linguriță|lingurițe)/i);
                    if (spoonMatch) {
                        extractedQuantity = `${spoonMatch[1]} ${spoonMatch[2]}`;
                    }
                }
                // Handle cup measurements
                else if (matchedText.match(/(\d+)\s*(cană|căni)/i)) {
                    const cupMatch = matchedText.match(/(\d+)\s*(cană|căni)/i);
                    if (cupMatch) {
                        extractedQuantity = `${cupMatch[1]} ${cupMatch[2]}`;
                    }
                }
                // Handle Romanian fraction words
                else if (matchedText.includes('o jumătate')) {
                    extractedQuantity = '1/2';
                } else if (matchedText.includes('un sfert')) {
                    extractedQuantity = '1/4';
                } else if (matchedText.includes('trei sferturi')) {
                    extractedQuantity = '3/4';
                }
                // Handle Romanian number words
                else if (matchedText.includes('două rădăcini')) {
                    extractedQuantity = '2';
                } else if (matchedText.includes('două cepe') || matchedText.includes('două ')) {
                    extractedQuantity = '2';
                } else if (matchedText.includes('un ') || matchedText.includes('o ')) {
                    extractedQuantity = '1';
                } else {
                    // Handle general Romanian numbers
                    for (const [romanianWord, number] of Object.entries(romanianNumberMap)) {
                        if (matchedText.toLowerCase().includes(romanianWord)) {
                            extractedQuantity = number;
                            break;
                        }
                    }

                    // Fallback: extract any number at the beginning of the match
                    const numberMatch = matchedText.match(/^(\d+)/);
                    if (numberMatch && extractedQuantity === ingredient.quantity) {
                        extractedQuantity = numberMatch[1];
                    }
                }

                // Handle special measurements (only if not already handled above)
                if (extractedQuantity === ingredient.quantity) {
                    if (matchedText.includes('legătură')) {
                        const legMatch = matchedText.match(/(\d+|un|o)\s*legătură/i);
                        if (legMatch) {
                            const num = romanianNumberMap[legMatch[1].toLowerCase()] || legMatch[1];
                            extractedQuantity = `${num} legătură`;
                        } else {
                            extractedQuantity = '1 legătură';
                        }
                    }
                    else if (matchedText.includes('rădăcini')) {
                        const numMatch = matchedText.match(/(\d+|două|trei|patru)/i);
                        if (numMatch) {
                            const num = romanianNumberMap[numMatch[1].toLowerCase()] || numMatch[1];
                            extractedQuantity = num;
                        }
                    }
                }

                if (extractedQuantity !== ingredient.quantity) {
                    console.log(`🔄 Updated ${ingredient.cleanName}: "${ingredient.quantity}" → "${extractedQuantity}"`);
                    return {
                        ...ingredient,
                        quantity: extractedQuantity
                    };
                }
            }
        }

        return ingredient;
    });

    return improvedIngredients;
};

export const validateStructuredRecipe = (data: ParsedRecipeData): { isValid: boolean; errors: string[] } => {
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

    if (!data.servings || data.servings.trim().length === 0) {
        errors.push("Servings is required");
    }

    if (!data.ingredients || data.ingredients.length === 0) {
        errors.push("At least one ingredient is required");
    }

    if (!data.instructions || data.instructions.trim().length === 0) {
        errors.push("Instructions are required");
    }

    // Validate each ingredient
    data.ingredients.forEach((ingredient, index) => {
        if (!ingredient.cleanName || ingredient.cleanName.trim().length === 0) {
            errors.push(`Ingredient ${index + 1}: Clean name is required`);
        }
        if (!ingredient.quantity || ingredient.quantity.trim().length === 0) {
            errors.push(`Ingredient ${index + 1} (${ingredient.cleanName}): Quantity is required`);
        }

        // Check for potential missing quantities (when quantity is just "1" for typically measured ingredients)
        const typicallyMeasuredIngredients = /\b(flour|sugar|salt|oil|butter|cream|milk|water|făină|zahăr|sare|ulei|unt|smântână|lapte|apă|orez|paste|macaroane)\b/i;
        const typicallyCountedIngredients = /\b(egg|eggs|onion|garlic|clove|potato|carrot|pepper|ou|ouă|ceapă|usturoi|cartof|morcov|ardei|țelină|păstârnac)\b/i;

        if (ingredient.quantity === "1" && typicallyMeasuredIngredients.test(ingredient.cleanName) && !typicallyCountedIngredients.test(ingredient.cleanName)) {
            errors.push(`Ingredient "${ingredient.cleanName}" has quantity "1" - this might indicate a missing measurement unit`);
        }

        // Check if cleanName contains quantities (should be clean) - but be less strict for Romanian
        const quantityWords = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|cup|cups|tbsp|tsp|tablespoon|teaspoon|ounce|ounces|pound|pounds|lb|lbs|gram|grams|grame|kilogram|kg|milliliter|ml|liter|liters|litri)\b/i;
        const romanianQuantityWords = /\b(un|o|doi|două|trei|patru|cinci|șase|șapte|opt|nouă|zece|jumătate|sfert|lingură|linguri|linguriță|lingurițe|legătură|rădăcină|rădăcini|bucată|bucăți|foi)\b/i;

        // Only flag as error if it contains English/metric quantities, not Romanian number words
        if (ingredient.cleanName && quantityWords.test(ingredient.cleanName) && !romanianQuantityWords.test(ingredient.cleanName)) {
            errors.push(`Ingredient "${ingredient.cleanName}" appears to contain quantities in the clean name - quantities should be in the quantity field`);
        }

        // Check for very short quantities that might indicate parsing issues
        if (ingredient.quantity && ingredient.quantity.length === 1 && !ingredient.quantity.match(/[0-9]/)) {
            errors.push(`Ingredient "${ingredient.cleanName}" has suspicious quantity "${ingredient.quantity}" - check if measurement was lost`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};