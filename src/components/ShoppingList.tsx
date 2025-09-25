'use client';

import React, { useState, useEffect } from 'react';
import { NotionIngredient } from '../types';

// Icon components
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

const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L12 22l8-4.27A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

interface ShoppingListItemProps {
  ingredient: NotionIngredient;
  onPurchased: (ingredientId: string) => void;
  isUpdating: boolean;
}

const ShoppingListItem: React.FC<ShoppingListItemProps> = ({ ingredient, onPurchased, isUpdating }) => {
  const [isPurchased, setIsPurchased] = useState(false);

  const handlePurchased = () => {
    setIsPurchased(true);
    onPurchased(ingredient.id);
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${isPurchased ? 'opacity-60 bg-gray-50' : ''} ${isUpdating ? 'opacity-50' : ''} transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className="flex-1">
            <h3 className={`font-medium ${isPurchased ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {ingredient.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {ingredient.inPantry && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <PackageIcon className="w-3 h-3" />
                  In Pantry
                </span>
              )}
              {ingredient.lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated: {new Date(ingredient.lastUpdated).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isPurchased ? (
            <button
              onClick={handlePurchased}
              disabled={isUpdating}
              className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Got It</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Purchased</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ShoppingList: React.FC = () => {
  const [shoppingList, setShoppingList] = useState<NotionIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const loadShoppingList = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notion/ingredients/shopping-list');
      if (!response.ok) {
        throw new Error('Failed to load shopping list');
      }
      const data = await response.json();
      setShoppingList(data.shoppingList || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPurchased = async (ingredientId: string) => {
    setUpdatingIds(prev => new Set(prev).add(ingredientId));

    try {
      // Mark as "In Pantry" and remove from "Need to Buy"
      const response = await fetch('/api/notion/ingredients/pantry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredientId,
          inPantry: true,
          needToBuy: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ingredient');
      }

      // Remove from shopping list (since it's no longer "Need to Buy")
      setShoppingList(prev => prev.filter(item => item.id !== ingredientId));
    } catch (err) {
      console.error('Error updating ingredient:', err);
      // You could show a toast notification here
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ingredientId);
        return newSet;
      });
    }
  };

  const markAllAsPurchased = async () => {
    if (shoppingList.length === 0) return;

    const allUpdates = shoppingList.map(item => ({
      ingredientId: item.id,
      inPantry: true,
      needToBuy: false,
    }));

    // Add all IDs to updating set
    setUpdatingIds(prev => new Set([...prev, ...shoppingList.map(item => item.id)]));

    try {
      const response = await fetch('/api/notion/ingredients/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates: allUpdates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update all ingredients');
      }

      // Clear the shopping list since everything is now in pantry
      setShoppingList([]);
    } catch (err) {
      console.error('Error updating all ingredients:', err);
    } finally {
      // Clear all updating IDs
      setUpdatingIds(new Set());
    }
  };

  useEffect(() => {
    loadShoppingList();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCartIcon className="w-8 h-8 text-amber-600" />
              Shopping List
            </h1>
            <p className="mt-2 text-gray-600">
              {shoppingList.length > 0
                ? `${shoppingList.length} items to buy`
                : 'All caught up! Nothing to buy right now.'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadShoppingList()}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {shoppingList.length > 0 && (
              <button
                onClick={markAllAsPurchased}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                disabled={Array.from(updatingIds).length > 0}
              >
                <CheckIcon className="w-4 h-4" />
                <span>Mark All Purchased</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Shopping List Items */}
      {shoppingList.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Your shopping list is empty!</h3>
          <p className="text-gray-600 mb-6">
            Go to the <strong>Pantry Manager</strong> to mark ingredients you need to buy, or add missing ingredients from your recipes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-4 flex items-center justify-between">
            <span>Tap "Got It" as you shop to move items to your pantry</span>
            <span className="text-amber-600 font-medium">
              {shoppingList.filter(item => item.inPantry).length} already in pantry
            </span>
          </div>

          {shoppingList.map((ingredient) => (
            <ShoppingListItem
              key={ingredient.id}
              ingredient={ingredient}
              onPurchased={handleItemPurchased}
              isUpdating={updatingIds.has(ingredient.id)}
            />
          ))}

          {/* Shopping Tips */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">💡 Shopping Tips</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Items marked "In Pantry" might already be at home - double check!</li>
              <li>• Tap "Got It" as you shop to automatically update your pantry</li>
              <li>• Use "Mark All Purchased" when you're done shopping</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;