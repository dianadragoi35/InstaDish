'use client';

import React, { useState, useEffect } from 'react';
import { GroceryList as GroceryListType } from '../types';

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

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

interface AddToGroceryButtonProps {
  ingredientIds: string[];
  ingredientNames?: string[];
  onSuccess?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  showText?: boolean;
}

interface GroceryListSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (listId: string) => void;
  groceryLists: GroceryListType[];
  isLoading: boolean;
  onCreateNew: () => void;
}

const GroceryListSelectModal: React.FC<GroceryListSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  groceryLists,
  isLoading,
  onCreateNew,
}) => {
  if (!isOpen) return null;

  const activeLists = groceryLists.filter(list => list.status === 'Active');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add to Grocery List</h2>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading grocery lists...</p>
            </div>
          ) : activeLists.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCartIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No active grocery lists found.</p>
              <button
                onClick={onCreateNew}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Create New List
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => onSelect(list.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-amber-300 transition-colors"
                >
                  <div className="font-medium text-gray-900">{list.name}</div>
                  <div className="text-sm text-gray-600">{list.items.length} items</div>
                  {list.notes && (
                    <div className="text-xs text-gray-500 mt-1 truncate">{list.notes}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeLists.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={onCreateNew}
                className="w-full flex items-center justify-center space-x-2 text-amber-600 hover:text-amber-700 py-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create New List</span>
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateQuickListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading: boolean;
}

const CreateQuickListModal: React.FC<CreateQuickListModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [listName, setListName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listName.trim()) {
      onSubmit(listName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Grocery List</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Weekly Shopping"
                required
                autoFocus
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !listName.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create & Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AddToGroceryButton: React.FC<AddToGroceryButtonProps> = ({
  ingredientIds,
  ingredientNames = [],
  onSuccess,
  className = '',
  size = 'md',
  variant = 'primary',
  showText = true,
}) => {
  const [groceryLists, setGroceryLists] = useState<GroceryListType[]>([]);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const loadGroceryLists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notion/grocery-lists');
      if (response.ok) {
        const data = await response.json();
        setGroceryLists(data.groceryLists || []);
      }
    } catch (error) {
      console.error('Error loading grocery lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToGroceryList = async (listId: string) => {
    setIsAdding(true);
    try {
      const response = await fetch(`/api/notion/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredientIds,
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
        onSuccess?.();
        setShowSelectModal(false);
      } else {
        throw new Error('Failed to add items to grocery list');
      }
    } catch (error) {
      console.error('Error adding to grocery list:', error);
      // You could show a toast notification here
    } finally {
      setIsAdding(false);
    }
  };

  const createListAndAdd = async (listName: string) => {
    setIsAdding(true);
    try {
      // Create the grocery list
      const createResponse = await fetch('/api/notion/grocery-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: listName,
          ingredientIds,
        }),
      });

      if (createResponse.ok) {
        const { id } = await createResponse.json();
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
        onSuccess?.();
        setShowCreateModal(false);
        setShowSelectModal(false);
        // Refresh the grocery lists
        await loadGroceryLists();
      } else {
        throw new Error('Failed to create grocery list');
      }
    } catch (error) {
      console.error('Error creating grocery list:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClick = async () => {
    if (ingredientIds.length === 0) return;

    await loadGroceryLists();
    setShowSelectModal(true);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (isSuccess) {
      return 'bg-green-600 text-white border-green-600';
    }

    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
      case 'outline':
        return 'bg-white text-amber-600 border-amber-600 hover:bg-amber-50';
      default:
        return 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700';
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={ingredientIds.length === 0 || isAdding}
        className={`
          flex items-center justify-center space-x-2 rounded-lg border transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${className}
        `}
      >
        {isSuccess ? (
          <CheckIcon className={iconSize} />
        ) : (
          <ShoppingCartIcon className={iconSize} />
        )}
        {showText && (
          <span>
            {isSuccess
              ? 'Added!'
              : isAdding
              ? 'Adding...'
              : `Add to Grocery List${ingredientNames.length > 0 ? ` (${ingredientNames.length})` : ''}`
            }
          </span>
        )}
      </button>

      <GroceryListSelectModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onSelect={addToGroceryList}
        groceryLists={groceryLists}
        isLoading={isLoading || isAdding}
        onCreateNew={() => setShowCreateModal(true)}
      />

      <CreateQuickListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createListAndAdd}
        isLoading={isAdding}
      />
    </>
  );
};

export default AddToGroceryButton;