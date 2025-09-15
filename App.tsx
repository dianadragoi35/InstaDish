import React, { useState, useCallback } from 'react';
import { generateRecipe } from './services/geminiService';
import type { Recipe } from './types';

// --- Icon Components (defined outside to prevent re-creation on re-renders) ---

const ChefHatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 0 1 5 5v1.5a1.5 1.5 0 0 0 3 0V7a8 8 0 1 0-16 0v1.5a1.5 1.5 0 0 0 3 0V7a5 5 0 0 1 5-5z" />
    <path d="M4 14a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1z" />
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


// --- UI Components ---

const RecipeCard: React.FC<{ recipe: Recipe; imageUrl: string }> = ({ recipe, imageUrl }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden animate-fade-in w-full">
    {imageUrl && <img src={imageUrl} alt={`An image of ${recipe.recipeName}`} className="w-full h-64 md:h-80 object-cover" />}
    <div className="p-8">
      <h2 className="font-serif text-3xl md:text-4xl font-bold text-amber-900">{recipe.recipeName}</h2>
      <p className="mt-2 text-gray-600 italic">{recipe.description}</p>
      
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
          <h3 className="text-xl font-bold font-serif text-amber-800 border-b-2 border-amber-200 pb-2">Ingredients</h3>
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

const App: React.FC = () => {
  const [formData, setFormData] = useState({
    ingredients: 'Frozen spinach, onion, garlic, milk, eggs',
    cuisine: 'Romanian',
    language: 'Romana',
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

  return (
    <div className="min-h-screen w-full bg-amber-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <main className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <div className="flex justify-center items-center gap-4">
            <ChefHatIcon className="w-12 h-12 text-amber-600" />
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-amber-900">
              InstaDish Recipe Generator
            </h1>
          </div>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Turn your pantry into a culinary adventure! Tell us what you have, and we'll whip up a recipe for you.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg sticky top-8">
              <h2 className="text-2xl font-bold font-serif text-amber-800 mb-6">Your Ingredients</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">
                    What's in your kitchen?
                  </label>
                  <textarea
                    id="ingredients"
                    name="ingredients"
                    rows={5}
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
                  className="w-full flex items-center justify-center gap-3 bg-amber-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
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

export default App;