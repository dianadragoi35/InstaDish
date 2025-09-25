'use client';

import React, { useState, useEffect } from 'react';
import { GroceryList as GroceryListType, CreateGroceryListData, NotionIngredient } from '../types';

// Icon components
const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

interface GroceryListCardProps {
  groceryList: GroceryListType;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const GroceryListCard: React.FC<GroceryListCardProps> = ({ groceryList, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ingredients, setIngredients] = useState<NotionIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadIngredients = async () => {
    if (groceryList.items.length === 0) return;

    setIsLoading(true);
    try {
      // groceryList.items is an array of relation objects with just IDs: [{ id: "ingredient-id" }]
      const ingredientPromises = groceryList.items.map(async (relationItem: any) => {
        try {
          const response = await fetch(`/api/notion/ingredients/${relationItem.id}`);
          if (response.ok) {
            const data = await response.json();
            return data.ingredient; // Return the ingredient data
          }
          return null;
        } catch (error) {
          console.error(`Error fetching ingredient ${relationItem.id}:`, error);
          return null;
        }
      });

      const ingredientResults = await Promise.all(ingredientPromises);
      setIngredients(ingredientResults.filter(Boolean));
    } catch (error) {
      console.error('Error loading ingredients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadIngredients();
    }
  }, [isExpanded, groceryList.items]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (newStatus: 'Active' | 'Completed' | 'Archived') => {
    await onUpdate(groceryList.id, { status: newStatus });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCartIcon className="w-6 h-6 text-amber-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{groceryList.name}</h3>
              <p className="text-sm text-gray-600">{groceryList.items.length} items</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(groceryList.status)}`}>
              {groceryList.status}
            </span>
            <select
              value={groceryList.status}
              onChange={(e) => handleStatusChange(e.target.value as 'Active' | 'Completed' | 'Archived')}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500"
            >
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
            <button
              onClick={() => onDelete(groceryList.id)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete list"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {groceryList.notes && (
          <p className="mt-3 text-sm text-gray-600 italic">{groceryList.notes}</p>
        )}

        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Created: {new Date(groceryList.createdDate).toLocaleDateString()}
          </p>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            {isExpanded ? 'Hide Items' : 'View Items'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-pulse">Loading items...</div>
            </div>
          ) : ingredients.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 mb-3">List Items:</h4>
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                  <span className="text-gray-800">{ingredient.name}</span>
                  <div className="flex items-center space-x-2">
                    {ingredient.inPantry && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        In Pantry
                      </span>
                    )}
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No items in this list yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CreateGroceryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateGroceryListData) => Promise<void>;
}

const CreateGroceryListModal: React.FC<CreateGroceryListModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      await onCreate({
        name: formData.name,
        notes: formData.notes || undefined,
        ingredientIds: [], // Start with empty list
      });
      setFormData({ name: '', notes: '' });
      onClose();
    } catch (error) {
      console.error('Error creating grocery list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Custom List</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Dinner Party, Baking Supplies, Italian Recipes"
                required
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Any additional notes..."
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const GroceryList: React.FC = () => {
  const [groceryLists, setGroceryLists] = useState<GroceryListType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed' | 'Archived'>('All');

  const loadGroceryLists = async () => {
    try {
      const response = await fetch('/api/notion/grocery-lists');
      if (!response.ok) {
        throw new Error('Failed to load grocery lists');
      }
      const data = await response.json();
      setGroceryLists(data.groceryLists || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const createGroceryList = async (data: CreateGroceryListData) => {
    const response = await fetch('/api/notion/grocery-lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create grocery list');
    }

    await loadGroceryLists(); // Reload the list
  };

  const updateGroceryList = async (id: string, data: any) => {
    const response = await fetch(`/api/notion/grocery-lists/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update grocery list');
    }

    await loadGroceryLists(); // Reload the list
  };

  const deleteGroceryList = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grocery list?')) {
      return;
    }

    const response = await fetch(`/api/notion/grocery-lists/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete grocery list');
    }

    await loadGroceryLists(); // Reload the list
  };

  useEffect(() => {
    loadGroceryLists();
  }, []);

  const filteredLists = groceryLists.filter(list =>
    filter === 'All' || list.status === filter
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Lists</h1>
            <p className="mt-2 text-gray-600">Create themed lists for special occasions, recipes, or meal planning</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Custom List</span>
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex space-x-2">
          {(['All', 'Active', 'Completed', 'Archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {filteredLists.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No custom lists yet</h3>
          <p className="text-gray-600 mb-6">Create themed lists for special occasions, recipes, or meal planning!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Custom List</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((list) => (
            <GroceryListCard
              key={list.id}
              groceryList={list}
              onUpdate={updateGroceryList}
              onDelete={deleteGroceryList}
            />
          ))}
        </div>
      )}

      <CreateGroceryListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createGroceryList}
      />
    </div>
  );
};

export default GroceryList;