'use client';

import React, { useState, useEffect } from 'react';
import { NotionIngredient, PantryUpdateData, BulkPantryUpdateData } from '../types';

// Icon components
const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L12 22l8-4.27A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,4 23,10 17,10"></polyline>
    <polyline points="1,20 1,14 7,14"></polyline>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="21 21l-4.35-4.35"></path>
  </svg>
);

interface IngredientItemProps {
  ingredient: NotionIngredient;
  onUpdate: (data: PantryUpdateData) => void;
  isUpdating: boolean;
}

const IngredientItem: React.FC<IngredientItemProps> = ({ ingredient, onUpdate, isUpdating }) => {
  const handlePantryToggle = () => {
    onUpdate({
      ingredientId: ingredient.id,
      inPantry: !ingredient.inPantry,
      needToBuy: ingredient.inPantry ? true : ingredient.needToBuy || false, // If removing from pantry, mark as need to buy
    });
  };

  const handleNeedToBuyToggle = () => {
    onUpdate({
      ingredientId: ingredient.id,
      inPantry: ingredient.inPantry || false,
      needToBuy: !ingredient.needToBuy,
    });
  };

  return (
    <div className={`bg-white rounded-lg border ${isUpdating ? 'opacity-50' : ''} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{ingredient.name}</h3>
          {ingredient.lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(ingredient.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* In Pantry Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePantryToggle}
              disabled={isUpdating}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                ingredient.inPantry
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PackageIcon className="w-3 h-3" />
              <span>{ingredient.inPantry ? 'In Pantry' : 'Add to Pantry'}</span>
            </button>
          </div>

          {/* Need to Buy Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleNeedToBuyToggle}
              disabled={isUpdating}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                ingredient.needToBuy
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ShoppingCartIcon className="w-3 h-3" />
              <span>{ingredient.needToBuy ? 'Added to List' : 'Add to List'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IngredientPantryManagerProps {
  onClose?: () => void;
}

const IngredientPantryManager: React.FC<IngredientPantryManagerProps> = ({ onClose }) => {
  const [ingredients, setIngredients] = useState<NotionIngredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<NotionIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inPantry' | 'needToBuy' | 'neither'>('all');

  const loadIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notion/ingredients');
      if (!response.ok) {
        throw new Error('Failed to load ingredients');
      }
      const data = await response.json();
      setIngredients(data.ingredients || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateIngredient = async (updateData: PantryUpdateData) => {
    setUpdatingIds(prev => new Set(prev).add(updateData.ingredientId));

    try {
      const response = await fetch('/api/notion/ingredients/pantry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update ingredient');
      }

      // Update local state
      setIngredients(prev =>
        prev.map(ingredient =>
          ingredient.id === updateData.ingredientId
            ? {
                ...ingredient,
                inPantry: updateData.inPantry,
                needToBuy: updateData.needToBuy,
                lastUpdated: new Date().toISOString(),
              }
            : ingredient
        )
      );
    } catch (err) {
      console.error('Error updating ingredient:', err);
      // You could show a toast notification here
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateData.ingredientId);
        return newSet;
      });
    }
  };

  const bulkUpdatePantryStatus = async (inPantry: boolean) => {
    const visibleIngredients = filteredIngredients;
    if (visibleIngredients.length === 0) return;

    const updates: PantryUpdateData[] = visibleIngredients.map(ingredient => ({
      ingredientId: ingredient.id,
      inPantry,
      needToBuy: ingredient.needToBuy || false,
    }));

    // Add all IDs to updating set
    setUpdatingIds(prev => new Set([...prev, ...updates.map(u => u.ingredientId)]));

    try {
      const response = await fetch('/api/notion/ingredients/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to bulk update ingredients');
      }

      // Update local state
      setIngredients(prev =>
        prev.map(ingredient => {
          const update = updates.find(u => u.ingredientId === ingredient.id);
          return update
            ? {
                ...ingredient,
                inPantry: update.inPantry,
                needToBuy: update.needToBuy,
                lastUpdated: new Date().toISOString(),
              }
            : ingredient;
        })
      );
    } catch (err) {
      console.error('Error bulk updating ingredients:', err);
    } finally {
      // Clear all updating IDs
      setUpdatingIds(new Set());
    }
  };

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    let filtered = ingredients;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case 'inPantry':
        filtered = filtered.filter(ingredient => ingredient.inPantry);
        break;
      case 'needToBuy':
        filtered = filtered.filter(ingredient => ingredient.needToBuy);
        break;
      case 'neither':
        filtered = filtered.filter(ingredient => !ingredient.inPantry && !ingredient.needToBuy);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredIngredients(filtered);
  }, [ingredients, searchTerm, filter]);

  const stats = {
    total: ingredients.length,
    inPantry: ingredients.filter(i => i.inPantry).length,
    needToBuy: ingredients.filter(i => i.needToBuy).length,
    neither: ingredients.filter(i => !i.inPantry && !i.needToBuy).length,
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pantry Manager</h1>
            <p className="mt-2 text-gray-600">Track what you have and what you need to buy</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadIngredients()}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Ingredients</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-800">{stats.inPantry}</div>
            <div className="text-sm text-green-600">In Pantry</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="text-2xl font-bold text-amber-800">{stats.needToBuy}</div>
            <div className="text-sm text-amber-600">Need to Buy</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">{stats.neither}</div>
            <div className="text-sm text-gray-600">Untracked</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Items ({stats.total})</option>
            <option value="inPantry">In Pantry ({stats.inPantry})</option>
            <option value="needToBuy">Need to Buy ({stats.needToBuy})</option>
            <option value="neither">Untracked ({stats.neither})</option>
          </select>

          {/* Bulk Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => bulkUpdatePantryStatus(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              disabled={filteredIngredients.length === 0}
            >
              Mark All as In Pantry
            </button>
            <button
              onClick={() => bulkUpdatePantryStatus(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              disabled={filteredIngredients.length === 0}
            >
              Remove All from Pantry
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Ingredients List */}
      {filteredIngredients.length === 0 ? (
        <div className="text-center py-12">
          <PackageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No ingredients found</h3>
          <p className="text-gray-600">
            {searchTerm.trim()
              ? 'Try adjusting your search or filter criteria.'
              : 'Add some recipes to start tracking ingredients in your pantry.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredIngredients.length} of {ingredients.length} ingredients
          </div>
          {filteredIngredients.map((ingredient) => (
            <IngredientItem
              key={ingredient.id}
              ingredient={ingredient}
              onUpdate={updateIngredient}
              isUpdating={updatingIds.has(ingredient.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IngredientPantryManager;