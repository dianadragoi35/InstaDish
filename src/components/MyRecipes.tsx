'use client';

import React, { useState, useEffect } from 'react';
import AddToShoppingListButton from './AddToShoppingListButton';
import AddToGroceryButton from './AddToGroceryButton';

interface NotionRecipe {
  id: string;
  recipeName: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredientIds: string[];
  recipeIngredients?: Array<{
    id: string;
    ingredientId: string;
    quantity: string;
    notes?: string;
  }>;
  createdTime: string;
  lastEditedTime: string;
}

interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
  notes?: string;
}

interface RecipesResponse {
  recipes: NotionRecipe[];
  hasMore: boolean;
  nextCursor: string | null;
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="m19 6-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M5 6l1-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1l1 2" />
  </svg>
);

const MyRecipes: React.FC = () => {
  const [recipes, setRecipes] = useState<NotionRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<NotionRecipe | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<NotionRecipe | null>(null);
  const [editForm, setEditForm] = useState({
    recipeName: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: '',
  });
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, [searchTerm, currentPage]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '10',
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/notion/recipes/list?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data: RecipesResponse = await response.json();
      setRecipes(data.recipes);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInstructionsPreview = (instructions: string) => {
    return instructions.length > 150 ? instructions.substring(0, 150) + '...' : instructions;
  };

  const handleEdit = (recipe: NotionRecipe) => {
    setEditingRecipe(recipe);
    setEditForm({
      recipeName: recipe.recipeName,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecipe) return;

    try {
      const response = await fetch('/api/notion/recipes/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: editingRecipe.id,
          ...editForm,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      // Refresh recipes
      await fetchRecipes();
      setEditingRecipe(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
    }
  };

  const handleDelete = async (recipe: NotionRecipe) => {
    if (!confirm(`Are you sure you want to delete "${recipe.recipeName}"?`)) {
      return;
    }

    try {
      const response = await fetch('/api/notion/recipes/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      // Refresh recipes
      await fetchRecipes();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
    }
  };

  const fetchRecipeIngredients = async (ingredientIds: string[], recipeIngredients?: Array<{id: string; ingredientId: string; quantity: string; notes?: string;}>) => {
    // If we have structured ingredients, fetch their names and combine with quantities
    if (recipeIngredients && recipeIngredients.length > 0) {
      try {
        setLoadingIngredients(true);
        const uniqueIngredientIds = [...new Set(recipeIngredients.map(ri => ri.ingredientId).filter(Boolean))];

        if (uniqueIngredientIds.length === 0) {
          setRecipeIngredients([]);
          return;
        }

        const response = await fetch('/api/notion/recipes/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredientIds: uniqueIngredientIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch ingredients');
        }

        const data = await response.json();

        // Map ingredient names to recipe ingredients with quantities
        const structuredIngredients = recipeIngredients.map(ri => {
          const ingredient = data.ingredients.find((ing: Ingredient) => ing.id === ri.ingredientId);
          return {
            id: ingredient?.id || ri.ingredientId,
            name: ingredient?.name || 'Unknown ingredient',
            quantity: ri.quantity,
            notes: ri.notes
          };
        });

        setRecipeIngredients(structuredIngredients);
      } catch (err) {
        console.error('Error fetching structured ingredients:', err);
        setRecipeIngredients([]);
      } finally {
        setLoadingIngredients(false);
      }
      return;
    }

    // Legacy format - just ingredient IDs
    if (!ingredientIds.length) {
      setRecipeIngredients([]);
      return;
    }

    try {
      setLoadingIngredients(true);
      const response = await fetch('/api/notion/recipes/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ingredients');
      }

      const data = await response.json();
      setRecipeIngredients(data.ingredients);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      setRecipeIngredients([]);
    } finally {
      setLoadingIngredients(false);
    }
  };

  // Fetch ingredients when a recipe is selected
  useEffect(() => {
    if (selectedRecipe) {
      fetchRecipeIngredients(selectedRecipe.ingredientIds, selectedRecipe.recipeIngredients);
    }
  }, [selectedRecipe]);

  if (selectedRecipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setSelectedRecipe(null)}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              ← Back to My Recipes
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h1 className="font-serif text-3xl font-bold text-amber-900 mb-2">
                {selectedRecipe.recipeName}
              </h1>
              <p className="text-gray-600">
                Created on {formatDate(selectedRecipe.createdTime)}
              </p>
            </div>

            <div className="mb-8 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
                <ClockIcon className="w-4 h-4 text-amber-600" />
                <strong>Prep:</strong> {selectedRecipe.prepTime || 'Not specified'}
              </div>
              <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
                <ClockIcon className="w-4 h-4 text-amber-600" />
                <strong>Cook:</strong> {selectedRecipe.cookTime || 'Not specified'}
              </div>
              <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
                <UsersIcon className="w-4 h-4 text-amber-600" />
                <strong>Servings:</strong> {selectedRecipe.servings || 'Not specified'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ingredients Section */}
              <div className="md:col-span-1">
                <h2 className="text-xl font-bold font-serif text-amber-800 border-b-2 border-amber-200 pb-2 mb-4">
                  Ingredients
                </h2>
                {loadingIngredients ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : recipeIngredients.length > 0 ? (
                  <ul className="space-y-3 text-gray-700">
                    {recipeIngredients.map((ingredient) => (
                      <li key={ingredient.id} className="flex flex-col space-y-1">
                        <div className="flex items-start">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <div className="flex-grow">
                            {ingredient.quantity ? (
                              <span className="font-medium text-amber-700">{ingredient.quantity}</span>
                            ) : null}
                            {ingredient.quantity && <span className="mx-1">of</span>}
                            <span className="text-gray-800">{ingredient.name}</span>
                            {ingredient.notes && (
                              <div className="text-sm text-gray-600 italic mt-1">
                                {ingredient.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">No ingredients found.</p>
                )}
              </div>

              {/* Instructions Section */}
              <div className="md:col-span-2">
                <h2 className="text-xl font-bold font-serif text-amber-800 border-b-2 border-amber-200 pb-2 mb-4">
                  Instructions
                </h2>
                {selectedRecipe.instructions ? (
                  <ol className="space-y-3 list-none">
                    {selectedRecipe.instructions.split('\n').filter(step => step.trim()).map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-amber-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-gray-800 leading-relaxed">
                          {step.trim()}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-gray-800">No instructions provided.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit Modal
  if (editingRecipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setEditingRecipe(null)}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              ← Back to My Recipes
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
            <h1 className="font-serif text-3xl font-bold text-amber-900 mb-6">
              Edit Recipe
            </h1>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Name
                </label>
                <input
                  type="text"
                  value={editForm.recipeName}
                  onChange={(e) => setEditForm({ ...editForm, recipeName: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prep Time
                  </label>
                  <input
                    type="text"
                    value={editForm.prepTime}
                    onChange={(e) => setEditForm({ ...editForm, prepTime: e.target.value })}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cook Time
                  </label>
                  <input
                    type="text"
                    value={editForm.cookTime}
                    onChange={(e) => setEditForm({ ...editForm, cookTime: e.target.value })}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Servings
                  </label>
                  <input
                    type="text"
                    value={editForm.servings}
                    onChange={(e) => setEditForm({ ...editForm, servings: e.target.value })}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  rows={10}
                  value={editForm.instructions}
                  onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSaveEdit}
                  className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingRecipe(null)}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-4">
            My Recipes
          </h1>
          <p className="text-gray-600 mb-6">
            Browse and manage your personal recipe collection
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded-md mb-3"></div>
                <div className="h-4 bg-gray-200 rounded-md w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-20 bg-gray-200 rounded-md mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-8 bg-gray-200 rounded-md w-20"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 bg-red-100 p-4 rounded-lg inline-block">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-xl mb-2">No recipes found</p>
              <p>Try adjusting your search or add some recipes first!</p>
            </div>
          </div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="mb-4">
                    <h2 className="font-serif text-xl font-bold text-amber-900 mb-2">
                      {recipe.recipeName}
                    </h2>
                    <p className="text-sm text-gray-500 mb-2">
                      Created {formatDate(recipe.createdTime)}
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                        {recipe.recipeIngredients && recipe.recipeIngredients.length > 0
                          ? recipe.recipeIngredients.length
                          : recipe.ingredientIds.length} ingredients
                      </span>
                      {recipe.prepTime && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {recipe.prepTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 text-sm">
                      {getInstructionsPreview(recipe.instructions)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <AddToShoppingListButton
                        ingredientIds={recipe.recipeIngredients && recipe.recipeIngredients.length > 0
                          ? recipe.recipeIngredients.map(ri => ri.ingredientId).filter(Boolean)
                          : recipe.ingredientIds}
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        showText={false}
                      />
                      <AddToGroceryButton
                        ingredientIds={recipe.recipeIngredients && recipe.recipeIngredients.length > 0
                          ? recipe.recipeIngredients.map(ri => ri.ingredientId).filter(Boolean)
                          : recipe.ingredientIds}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedRecipe(recipe)}
                        className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(recipe)}
                          className="p-2 text-gray-600 hover:text-amber-600 transition-colors"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(recipe)}
                          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {(currentPage > 1 || hasMore) && (
              <div className="mt-8 flex justify-center gap-4">
                {currentPage > 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}
                <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg">
                  Page {currentPage}
                </span>
                {hasMore && (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyRecipes;