/**
 * Example usage of the AI Recipe Parsing Service
 *
 * This demonstrates how to parse free-form recipe text into structured data
 * suitable for storage in Notion databases.
 *
 * Run this example with: npx tsx examples/aiParsingServiceExample.ts
 */

import { parseRecipeText, validateParsedRecipe } from '../services/aiParsingService';

// Example recipe texts to demonstrate various formats
const exampleRecipes = {
  detailed: `
    # Spaghetti Carbonara

    **Prep Time**: 10 minutes
    **Cook Time**: 15 minutes
    **Serves**: 4

    ## Ingredients:
    - 400g spaghetti pasta
    - 200g guanciale or pancetta, diced
    - 4 large eggs
    - 100g Pecorino Romano cheese, grated
    - Black pepper to taste
    - Salt for pasta water

    ## Instructions:
    1. Bring a large pot of salted water to boil and cook spaghetti until al dente
    2. While pasta cooks, fry guanciale in a large pan until crispy
    3. In a bowl, whisk together eggs, cheese, and black pepper
    4. Drain pasta, reserving 1 cup of pasta water
    5. Add hot pasta to the pan with guanciale
    6. Remove from heat and quickly stir in egg mixture, adding pasta water as needed
    7. Serve immediately with extra cheese and pepper
  `,

  simple: `
    Quick Scrambled Eggs

    Beat 3 eggs with salt and pepper. Heat butter in a pan.
    Add eggs and stir gently until just set, about 2-3 minutes.
    Serve with toast.

    Takes about 5 minutes total.
  `,

  unstructured: `
    This is my grandmother's apple pie recipe. You need apples (about 6),
    flour for the crust, butter, sugar, and cinnamon. First make the crust
    with 2 cups flour and cold butter. Roll it out. Peel and slice the apples,
    mix with sugar and cinnamon. Put in the crust, cover with more crust.
    Bake at 350°F for about an hour until golden. Serves 8 people.
    Prep takes 30 minutes.
  `
};

async function demonstrateParsingService() {
  console.log('🍳 AI Recipe Parsing Service Demo\n');

  for (const [name, recipeText] of Object.entries(exampleRecipes)) {
    console.log(`\n📝 Parsing ${name} recipe...`);
    console.log('─'.repeat(50));

    try {
      // Parse the recipe text
      const result = await parseRecipeText(recipeText);

      if (result.success && result.data) {
        // Validate the parsed data
        const validation = validateParsedRecipe(result.data);

        console.log('✅ Successfully parsed!');
        console.log(`📖 Recipe Name: ${result.data.recipeName}`);
        console.log(`⏱️  Prep Time: ${result.data.prepTime}`);
        console.log(`🔥 Cook Time: ${result.data.cookTime}`);
        console.log(`🍽️  Servings: ${result.data.servings}`);

        console.log(`\n🥬 Clean Ingredients (${result.data.cleanIngredientNames.length}):`);
        result.data.cleanIngredientNames.forEach((ingredient, i) => {
          console.log(`   ${i + 1}. ${ingredient}`);
        });

        console.log(`\n📋 Instructions (${result.data.instructions.length} steps):`);
        result.data.instructions.forEach((step, i) => {
          console.log(`   ${i + 1}. ${step}`);
        });

        if (!validation.isValid) {
          console.log('\n⚠️  Validation Issues:');
          validation.errors.forEach(error => {
            console.log(`   • ${error}`);
          });
        } else {
          console.log('\n✅ Validation passed - ready for database storage!');
        }

      } else {
        console.log(`❌ Parsing failed: ${result.error}`);
      }

    } catch (error) {
      console.log(`💥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n🎉 Demo complete!');
}

// Mock function to demonstrate without actually calling the API
function mockParseRecipeText(recipeText: string) {
  // This is a mock implementation for demonstration purposes
  // In real usage, this would call the Gemini AI API

  if (recipeText.includes('Carbonara')) {
    return {
      success: true,
      data: {
        recipeName: 'Spaghetti Carbonara',
        prepTime: '10 minutes',
        cookTime: '15 minutes',
        servings: 4,
        cleanIngredientNames: ['spaghetti pasta', 'guanciale', 'eggs', 'pecorino romano cheese', 'black pepper', 'salt'],
        instructions: [
          'Bring a large pot of salted water to boil and cook spaghetti until al dente',
          'While pasta cooks, fry guanciale in a large pan until crispy',
          'In a bowl, whisk together eggs, cheese, and black pepper',
          'Drain pasta, reserving 1 cup of pasta water',
          'Add hot pasta to the pan with guanciale',
          'Remove from heat and quickly stir in egg mixture, adding pasta water as needed',
          'Serve immediately with extra cheese and pepper'
        ]
      }
    };
  }

  return {
    success: false,
    error: 'Mock implementation - would normally call Gemini AI API'
  };
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Note: This is a demo with mock data. To test with real API, set GEMINI_API_KEY environment variable.');
  demonstrateParsingService().catch(console.error);
}