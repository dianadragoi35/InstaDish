import { describe, it, expect } from 'vitest';

// Define the types and validation function locally for testing
interface ParsedRecipe {
    recipeName: string;
    prepTime: string;
    cookTime: string;
    servings: number;
    cleanIngredientNames: string[];
    instructions: string[];
}

const validateParsedRecipe = (data: ParsedRecipe): { isValid: boolean; errors: string[] } => {
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

describe('AI Parsing Service Validation', () => {
    const validRecipe: ParsedRecipe = {
        recipeName: 'Pasta Carbonara',
        prepTime: '15 minutes',
        cookTime: '20 minutes',
        servings: 4,
        cleanIngredientNames: ['pasta', 'eggs', 'bacon', 'parmesan cheese'],
        instructions: ['Boil pasta', 'Cook bacon', 'Mix with eggs and cheese']
    };

    it('should validate a correct recipe', () => {
        const result = validateParsedRecipe(validRecipe);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing recipe name', () => {
        const recipe = { ...validRecipe, recipeName: '' };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Recipe name is required');
    });

    it('should fail validation for missing prep time', () => {
        const recipe = { ...validRecipe, prepTime: '' };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Prep time is required');
    });

    it('should fail validation for missing cook time', () => {
        const recipe = { ...validRecipe, cookTime: '' };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Cook time is required');
    });

    it('should fail validation for invalid servings', () => {
        const recipe = { ...validRecipe, servings: 0 };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Servings must be a positive number');
    });

    it('should fail validation for empty ingredients', () => {
        const recipe = { ...validRecipe, cleanIngredientNames: [] };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one ingredient is required');
    });

    it('should fail validation for empty instructions', () => {
        const recipe = { ...validRecipe, instructions: [] };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one instruction step is required');
    });

    it('should detect quantities in ingredient names', () => {
        const recipe = {
            ...validRecipe,
            cleanIngredientNames: ['2 cups flour', 'eggs', '1 tbsp salt']
        };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Ingredient "2 cups flour" appears to contain quantities or measurements');
        expect(result.errors).toContain('Ingredient "1 tbsp salt" appears to contain quantities or measurements');
    });

    it('should detect various quantity patterns', () => {
        const recipe = {
            ...validRecipe,
            cleanIngredientNames: ['three onions', '2 pounds chicken', '1 cup milk', 'five grams sugar']
        };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept clean ingredient names', () => {
        const recipe = {
            ...validRecipe,
            cleanIngredientNames: ['chicken breast', 'olive oil', 'garlic', 'onion', 'tomatoes']
        };
        const result = validateParsedRecipe(recipe);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    describe('Edge Cases', () => {
        it('should handle recipe with minimal information', () => {
            const minimalRecipe: ParsedRecipe = {
                recipeName: 'Simple Dish',
                prepTime: 'Not specified',
                cookTime: 'Not specified',
                servings: 4,
                cleanIngredientNames: ['ingredient'],
                instructions: ['Do something']
            };
            const result = validateParsedRecipe(minimalRecipe);
            expect(result.isValid).toBe(true);
        });

        it('should handle recipe with many ingredients', () => {
            const manyIngredients = Array.from({ length: 50 }, (_, i) => `ingredient${i + 1}`);
            const recipe: ParsedRecipe = {
                recipeName: 'Complex Dish',
                prepTime: '30 minutes',
                cookTime: '1 hour',
                servings: 6,
                cleanIngredientNames: manyIngredients,
                instructions: ['Step 1', 'Step 2', 'Step 3']
            };
            const result = validateParsedRecipe(recipe);
            expect(result.isValid).toBe(true);
        });

        it('should handle recipe with many instruction steps', () => {
            const manyInstructions = Array.from({ length: 20 }, (_, i) => `Step ${i + 1}: Do something`);
            const recipe: ParsedRecipe = {
                recipeName: 'Detailed Recipe',
                prepTime: '15 minutes',
                cookTime: '45 minutes',
                servings: 4,
                cleanIngredientNames: ['ingredient1', 'ingredient2'],
                instructions: manyInstructions
            };
            const result = validateParsedRecipe(recipe);
            expect(result.isValid).toBe(true);
        });

        it('should handle negative servings', () => {
            const recipe = { ...validRecipe, servings: -1 };
            const result = validateParsedRecipe(recipe);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Servings must be a positive number');
        });

        it('should handle whitespace-only recipe name', () => {
            const recipe = { ...validRecipe, recipeName: '   \t\n  ' };
            const result = validateParsedRecipe(recipe);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Recipe name is required');
        });
    });
});