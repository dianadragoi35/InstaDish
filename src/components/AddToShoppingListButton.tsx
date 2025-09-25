'use client';

import React, { useState } from 'react';

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

interface AddToShoppingListButtonProps {
  ingredientIds: string[];
  ingredientNames?: string[];
  onSuccess?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  showText?: boolean;
}

const AddToShoppingListButton: React.FC<AddToShoppingListButtonProps> = ({
  ingredientIds,
  ingredientNames = [],
  onSuccess,
  className = '',
  size = 'md',
  variant = 'primary',
  showText = true,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const addToShoppingList = async () => {
    if (ingredientIds.length === 0) return;

    setIsAdding(true);
    try {
      // Update all ingredients to "Need to Buy = true"
      const updates = ingredientIds.map(id => ({
        ingredientId: id,
        inPantry: false,
        needToBuy: true,
      }));

      const response = await fetch('/api/notion/ingredients/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
        onSuccess?.();
      } else {
        throw new Error('Failed to add ingredients to shopping list');
      }
    } catch (error) {
      console.error('Error adding to shopping list:', error);
    } finally {
      setIsAdding(false);
    }
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
    <button
      onClick={addToShoppingList}
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
            : `Add to Shopping List${ingredientNames.length > 0 ? ` (${ingredientNames.length})` : ''}`
          }
        </span>
      )}
    </button>
  );
};

export default AddToShoppingListButton;