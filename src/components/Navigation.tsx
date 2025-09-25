'use client';

import React from 'react';

// Icon components
const ChefHatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2"/>
    <path d="M7 2v20"/>
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>
    <path d="M21 15v7"/>
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

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5l1.5 3 3.5 1-3.5 1-1.5 3-1.5-3-3.5-1 3.5-1zM18 11l-2 4-4-2 4 6 2-4 4 2zM4 18l2-4 4 2-4-6-2 4-4-2z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

const ListIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

type ViewType = 'generator' | 'parser' | 'myrecipes' | 'customlists' | 'shoppinglist' | 'pantry';

interface NavigationProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'generator' as ViewType, label: 'Generate Recipe', icon: SparklesIcon },
    { id: 'parser' as ViewType, label: 'Add Recipe', icon: PlusIcon },
    { id: 'myrecipes' as ViewType, label: 'My Recipes', icon: BookIcon },
    { id: 'customlists' as ViewType, label: 'Custom Lists', icon: ListIcon },
    { id: 'shoppinglist' as ViewType, label: 'Shopping List', icon: ShoppingCartIcon },
    { id: 'pantry' as ViewType, label: 'Pantry', icon: PackageIcon },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <ChefHatIcon className="w-8 h-8 text-amber-600" />
            <span className="font-serif text-2xl font-bold text-gray-900">InstaDish</span>
          </div>
          <div className="flex items-center space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              if (isActive) {
                return (
                  <span
                    key={item.id}
                    className="flex items-center gap-1 text-sm font-medium text-amber-600"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;