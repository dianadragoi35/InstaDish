'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { generateRecipe } from '../services/geminiService';
import type { Recipe } from '../types';
import RecipeParser from '../components/RecipeParser';
import MyRecipes from '../components/MyRecipes';
import GroceryList from '../components/GroceryList';
import IngredientPantryManager from '../components/IngredientPantryManager';
import AddToGroceryButton from '../components/AddToGroceryButton';

// --- Icon Components (defined outside to prevent re-creation on re-renders) ---

const ChefHatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2"/>
    <path d="M7 2v20"/>
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>
    <path d="M21 15v7"/>
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5l1.5 3 3.5 1-3.5 1-1.5 3-1.5-3-3.5-1 3.5-1zM18 11l-2 4-4-2 4 6 2-4 4 2zM4 18l2-4 4 2-4-6-2 4-4-2z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L12 22l8-4.27A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);


// --- UI Components ---

const RecipeCard: React.FC<{ recipe: Recipe; imageUrl: string }> = ({ recipe, imageUrl }) => {
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  const convertIngredientsToIds = async (ingredientNames: string[]) => {
    setIsLoadingIngredients(true);
    try {
      const ids = await Promise.all(
        ingredientNames.map(async (name) => {
          try {
            const response = await fetch('/api/notion/ingredients', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: name.trim() }),
            });
            const data = await response.json();
            return data.id;
          } catch (error) {
            console.error(`Error processing ingredient "${name}":`, error);
            return null;
          }
        })
      );
      setIngredientIds(ids.filter(Boolean));
    } catch (error) {
      console.error('Error converting ingredients to IDs:', error);
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  // Auto-convert ingredients when component mounts
  useEffect(() => {
    if (recipe.ingredients.length > 0) {
      convertIngredientsToIds(recipe.ingredients);
    }
  }, [recipe.ingredients]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden animate-fade-in w-full">
      {imageUrl && <img src={imageUrl} alt={`An image of ${recipe.recipeName}`} className="w-full h-64 md:h-80 object-cover" />}
      <div className="p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-amber-900">{recipe.recipeName}</h2>
            <p className="mt-2 text-gray-600 italic">{recipe.description}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <AddToGroceryButton
              ingredientIds={ingredientIds}
              ingredientNames={recipe.ingredients}
              size="md"
              variant="primary"
              className="shadow-md hover:shadow-lg transition-shadow"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
            <ClockIcon className="w-5 h-5 text-amber-600" />
            <strong>Prep:</strong> {recipe.prepTime}
          </div>
          <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
            <ClockIcon className="w-5 h-5 text-amber-600" />
            <strong>Cook:</strong> {recipe.cookTime}
          </div>
          <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
            <UsersIcon className="w-5 h-5 text-amber-600" />
            <strong>Servings:</strong> {recipe.servings}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold font-serif text-amber-800 border-b-2 border-amber-200 pb-2">Ingredients</h3>
              {isLoadingIngredients && (
                <div className="text-xs text-gray-500">
                  Processing ingredients...
                </div>
              )}
            </div>
            <ul className="mt-4 space-y-2 list-disc list-inside text-gray-700">
              {recipe.ingredients.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold font-serif text-amber-800 border-b-2 border-amber-200 pb-2">Instructions</h3>
            <ol className="mt-4 space-y-4 list-decimal list-inside text-gray-800">
              {recipe.instructions.map((step, index) => <li key={index} className="pl-2">{step}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg w-full animate-pulse overflow-hidden">
        <div className="h-64 md:h-80 bg-gray-200"></div>
        <div className="p-8">
            <div className="h-8 bg-gray-200 rounded-md w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded-md w-full mb-6"></div>
            <div className="flex gap-4 mb-8">
                <div className="h-8 bg-gray-200 rounded-full w-28"></div>
                <div className="h-8 bg-gray-200 rounded-full w-28"></div>
                <div className="h-8 bg-gray-200 rounded-full w-28"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded-md w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded-md"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-4/6"></div>
                </div>
                <div className="md:col-span-2 space-y-3">
                    <div className="h-6 bg-gray-200 rounded-md w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded-md"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded-md"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-4/6"></div>
                </div>
            </div>
        </div>
    </div>
);

const HomePage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'generator' | 'parser' | 'myrecipes' | 'grocerylist' | 'pantry'>('generator');
  const [formData, setFormData] = useState({
    ingredients: '',
    cuisine: '',
    language: 'English',
  });
  const [recipeData, setRecipeData] = useState<{ recipe: Recipe; imageUrl: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ingredients) {
      setError("Please list the ingredients you have.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecipeData(null);

    try {
      const generated = await generateRecipe(formData.ingredients, formData.cuisine, formData.language);
      setRecipeData(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (currentView === 'parser') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <ChefHatIcon className="w-8 h-8 text-amber-600" />
                <span className="font-serif text-2xl font-bold text-gray-900">InstaDish</span>
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setCurrentView('generator')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Recipe Generator
                </button>
                <span className="text-sm font-medium text-amber-600">Add Recipe</span>
                <button
                  onClick={() => setCurrentView('myrecipes')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  My Recipes
                </button>
                <button
                  onClick={() => setCurrentView('grocerylist')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <ShoppingCartIcon className="w-4 h-4" />
                  Grocery Lists
                </button>
                <button
                  onClick={() => setCurrentView('pantry')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <PackageIcon className="w-4 h-4" />
                  Pantry
                </button>
              </div>
            </div>
          </div>
        </nav>

        <RecipeParser onClose={() => setCurrentView('generator')} />
      </div>
    );
  }

  if (currentView === 'myrecipes') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <ChefHatIcon className="w-8 h-8 text-amber-600" />
                <span className="font-serif text-2xl font-bold text-gray-900">InstaDish</span>
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setCurrentView('generator')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Recipe Generator
                </button>
                <button
                  onClick={() => setCurrentView('parser')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Add Recipe
                </button>
                <span className="text-sm font-medium text-amber-600">My Recipes</span>
                <button
                  onClick={() => setCurrentView('grocerylist')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <ShoppingCartIcon className="w-4 h-4" />
                  Grocery Lists
                </button>
                <button
                  onClick={() => setCurrentView('pantry')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <PackageIcon className="w-4 h-4" />
                  Pantry
                </button>
              </div>
            </div>
          </div>
        </nav>

        <MyRecipes />
      </div>
    );
  }

  if (currentView === 'grocerylist') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <ChefHatIcon className="w-8 h-8 text-amber-600" />
                <span className="font-serif text-2xl font-bold text-gray-900">InstaDish</span>
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setCurrentView('generator')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Recipe Generator
                </button>
                <button
                  onClick={() => setCurrentView('parser')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Add Recipe
                </button>
                <button
                  onClick={() => setCurrentView('myrecipes')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  My Recipes
                </button>
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                  <ShoppingCartIcon className="w-4 h-4" />
                  Grocery Lists
                </span>
                <button
                  onClick={() => setCurrentView('pantry')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <PackageIcon className="w-4 h-4" />
                  Pantry
                </button>
              </div>
            </div>
          </div>
        </nav>

        <GroceryList />
      </div>
    );
  }

  if (currentView === 'pantry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <ChefHatIcon className="w-8 h-8 text-amber-600" />
                <span className="font-serif text-2xl font-bold text-gray-900">InstaDish</span>
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setCurrentView('generator')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Recipe Generator
                </button>
                <button
                  onClick={() => setCurrentView('parser')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  Add Recipe
                </button>
                <button
                  onClick={() => setCurrentView('myrecipes')}
                  className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  My Recipes
                </button>
                <button
                  onClick={() => setCurrentView('grocerylist')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <ShoppingCartIcon className="w-4 h-4" />
                  Grocery Lists
                </button>
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                  <PackageIcon className="w-4 h-4" />
                  Pantry
                </span>
              </div>
            </div>
          </div>
        </nav>

        <IngredientPantryManager />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <ChefHatIcon className="w-8 h-8 text-amber-600" />
              <span className="font-serif text-2xl font-bold text-gray-900">InstaDish</span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-amber-600">Recipe Generator</span>
              <button
                onClick={() => setCurrentView('parser')}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
              >
                Add Recipe
              </button>
              <button
                onClick={() => setCurrentView('myrecipes')}
                className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
              >
                My Recipes
              </button>
              <button
                onClick={() => setCurrentView('grocerylist')}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
              >
                <ShoppingCartIcon className="w-4 h-4" />
                Grocery Lists
              </button>
              <button
                onClick={() => setCurrentView('pantry')}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
              >
                <PackageIcon className="w-4 h-4" />
                Pantry
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            AI Recipe Generator
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Turn your ingredients into delicious recipes. Just tell us what you have!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg sticky top-8">
              <h2 className="text-xl font-bold font-serif text-amber-800 mb-4">Your Ingredients</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">
                    What's in your kitchen?
                  </label>
                  <textarea
                    id="ingredients"
                    name="ingredients"
                    rows={4}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    placeholder="e.g., chicken, tomatoes, pasta, garlic"
                    value={formData.ingredients}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate items with commas for best results.</p>
                </div>
                <div>
                  <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Cuisine (Optional)
                  </label>
                  <input
                    type="text"
                    id="cuisine"
                    name="cuisine"
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    placeholder="e.g., Italian, Mexican"
                    value={formData.cuisine}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipe Language
                  </label>
                  <input
                    type="text"
                    id="language"
                    name="language"
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    placeholder="e.g., English, Spanish, French"
                    value={formData.language}
                    onChange={handleInputChange}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-amber-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  <SparklesIcon className="w-5 h-5" />
                  {isLoading ? 'Generating...' : 'Generate Recipe'}
                </button>
              </form>
            </div>
          </div>

          {/* Result Section */}
          <div className="lg:col-span-3">
            <div className="min-h-[60vh] flex flex-col justify-center items-center">
              {error && <div className="text-red-600 bg-red-100 p-4 rounded-lg w-full text-center"><strong>Error:</strong> {error}</div>}
              {isLoading && <LoadingSkeleton />}
              {!isLoading && !error && recipeData && <RecipeCard recipe={recipeData.recipe} imageUrl={recipeData.imageUrl} />}
              {!isLoading && !error && !recipeData && (
                <div className="text-center text-gray-500">
                  <ChefHatIcon className="w-24 h-24 mx-auto text-gray-300" />
                  <p className="mt-4 text-xl">Your recipe will appear here!</p>
                  <p>Fill out the form and let the magic happen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;