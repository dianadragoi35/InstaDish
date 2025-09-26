'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NotionIngredient, GroceryList as GroceryListType } from '../types';

interface IngredientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToList: (ingredientIds: string[], targetListId?: string) => Promise<void>;
  targetListId?: string;
  targetListName?: string;
  groceryLists?: GroceryListType[];
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

const IngredientSearchModal: React.FC<IngredientSearchModalProps> = ({
  isOpen,
  onClose,
  onAddToList,
  targetListId,
  targetListName,
  groceryLists = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredients, setIngredients] = useState<NotionIngredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<NotionIngredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize target list selection
  useEffect(() => {
    if (targetListId) {
      setSelectedListIds(new Set([targetListId]));
    }
  }, [targetListId]);

  // Load all ingredients on modal open
  useEffect(() => {
    if (isOpen) {
      loadIngredients();
      setSearchTerm('');
      setSelectedIngredients(new Set());
      if (!targetListId) {
        setSelectedListIds(new Set());
      }
      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter ingredients based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredIngredients(ingredients);
      setShowCreateNew(false);
    } else {
      const filtered = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIngredients(filtered);

      // Show create new option if no exact match found
      const exactMatch = ingredients.some(ingredient =>
        ingredient.name.toLowerCase() === searchTerm.toLowerCase().trim()
      );
      setShowCreateNew(!exactMatch && searchTerm.trim().length > 0);
    }
  }, [searchTerm, ingredients]);

  const loadIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notion/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients || []);
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewIngredient = async (name: string): Promise<string> => {
    const response = await fetch('/api/notion/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!response.ok) {
      throw new Error('Failed to create ingredient');
    }

    const data = await response.json();
    return data.id;
  };

  const handleIngredientToggle = (ingredientId: string) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(ingredientId)) {
      newSelected.delete(ingredientId);
    } else {
      newSelected.add(ingredientId);
    }
    setSelectedIngredients(newSelected);
  };

  const handleListToggle = (listId: string) => {
    if (targetListId) return; // Don't allow changing if target is specified

    const newSelected = new Set(selectedListIds);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedListIds(newSelected);
  };

  const handleCreateAndSelect = async () => {
    if (!searchTerm.trim()) return;

    setIsCreating(true);
    try {
      const newIngredientId = await createNewIngredient(searchTerm.trim());

      // Add to selected ingredients
      const newSelected = new Set(selectedIngredients);
      newSelected.add(newIngredientId);
      setSelectedIngredients(newSelected);

      // Reload ingredients to show the new one
      await loadIngredients();
      setSearchTerm('');
    } catch (error) {
      console.error('Error creating ingredient:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIngredients.size === 0) return;

    setIsLoading(true);
    try {
      if (targetListId) {
        // Adding to specific list
        await onAddToList(Array.from(selectedIngredients), targetListId);
      } else {
        // Adding to multiple lists
        for (const listId of selectedListIds) {
          await onAddToList(Array.from(selectedIngredients), listId);
        }
      }
      onClose();
    } catch (error) {
      console.error('Error adding ingredients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = selectedIngredients.size > 0 && (targetListId || selectedListIds.size > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Add Ingredients {targetListName ? `to ${targetListName}` : 'to Lists'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Ingredients List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Loading ingredients...</div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Create new ingredient option */}
                {showCreateNew && (
                  <div className="flex items-center justify-between p-3 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50">
                    <div className="flex items-center space-x-3">
                      <PlusIcon className="w-4 h-4 text-amber-600" />
                      <span className="text-gray-800">Create "{searchTerm.trim()}"</span>
                    </div>
                    <button
                      onClick={handleCreateAndSelect}
                      disabled={isCreating}
                      className="px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:bg-gray-400"
                    >
                      {isCreating ? 'Creating...' : 'Create & Select'}
                    </button>
                  </div>
                )}

                {/* Existing ingredients */}
                {filteredIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedIngredients.has(ingredient.id)
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleIngredientToggle(ingredient.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                        selectedIngredients.has(ingredient.id)
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedIngredients.has(ingredient.id) && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-gray-800">{ingredient.name}</span>
                      {ingredient.inPantry && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          In Pantry
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredIngredients.length === 0 && !showCreateNew && searchTerm && (
                  <div className="text-center py-8 text-gray-500">
                    No ingredients found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List Selection (only if no target list specified) */}
          {!targetListId && groceryLists.length > 0 && (
            <div className="border-t border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select Lists to Add To:</h3>
              <div className="grid grid-cols-2 gap-2">
                {groceryLists.map((list) => (
                  <label
                    key={list.id}
                    className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedListIds.has(list.id)
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedListIds.has(list.id)}
                      onChange={() => handleListToggle(list.id)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-800">{list.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedIngredients.size} ingredient{selectedIngredients.size !== 1 ? 's' : ''} selected
              {!targetListId && selectedListIds.size > 0 && (
                <span>, {selectedListIds.size} list{selectedListIds.size !== 1 ? 's' : ''} selected</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors"
              >
                {isLoading ? 'Adding...' : 'Add Ingredients'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientSearchModal;