import React, { useState } from 'react';
import { parseRecipeText, validateParsedRecipe, type ParsedRecipe, type ParsingResult } from '../services/aiParsingService';
import { notionService, type CreateRecipeData } from '../services/notionService.client';
import { extractRecipeFromYouTubeVideo, validateRecipeContent, type YoutubeRecipeResult } from '../services/youtubeRecipeService';

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" />
    <polyline points="7,3 7,8 15,8" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
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

const YouTubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

interface RecipeParserProps {
  onClose: () => void;
}

const RecipeParser: React.FC<RecipeParserProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'youtube'>('text');
  const [recipeText, setRecipeText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [isParsingText, setIsParsingText] = useState(false);
  const [isParsingYoutube, setIsParsingYoutube] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [transcriptPreview, setTranscriptPreview] = useState<string>('');

  const handleParseRecipe = async () => {
    if (!recipeText.trim()) {
      setParsingError('Please enter some recipe text to parse.');
      return;
    }

    setIsParsingText(true);
    setParsingError(null);
    setParsedRecipe(null);
    setValidationErrors([]);
    setSaveSuccess(false);
    setTranscriptPreview('');

    try {
      const result: ParsingResult = await parseRecipeText(recipeText);

      if (result.success && result.data) {
        const validation = validateParsedRecipe(result.data);
        setValidationErrors(validation.errors);
        setParsedRecipe(result.data);
      } else {
        setParsingError(result.error || 'Failed to parse recipe text');
      }
    } catch (error) {
      setParsingError(error instanceof Error ? error.message : 'An unknown error occurred while parsing');
    } finally {
      setIsParsingText(false);
    }
  };

  const handleParseYoutube = async () => {
    if (!youtubeUrl.trim()) {
      setParsingError('Please enter a YouTube URL.');
      return;
    }

    setIsParsingYoutube(true);
    setParsingError(null);
    setParsedRecipe(null);
    setValidationErrors([]);
    setSaveSuccess(false);
    setTranscriptPreview('');

    try {
      const result: YoutubeRecipeResult = await extractRecipeFromYouTubeVideo(youtubeUrl);

      if (result.success && result.recipe) {
        const validation = validateParsedRecipe(result.recipe);
        setValidationErrors(validation.errors);
        setParsedRecipe(result.recipe);
        setTranscriptPreview(result.transcript || '');
      } else {
        setParsingError(result.error || 'Failed to extract recipe from YouTube video');
      }
    } catch (error) {
      setParsingError(error instanceof Error ? error.message : 'An unknown error occurred while parsing YouTube video');
    } finally {
      setIsParsingYoutube(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!parsedRecipe) return;

    if (validationErrors.length > 0) {
      setSavingError('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    setSavingError(null);
    setSaveSuccess(false);

    try {
      const createRecipeData: CreateRecipeData = {
        recipeName: parsedRecipe.recipeName,
        instructions: parsedRecipe.instructions.join('\n'),
        prepTime: parsedRecipe.prepTime,
        cookTime: parsedRecipe.cookTime,
        servings: parsedRecipe.servings.toString(),
        ingredientNames: parsedRecipe.cleanIngredientNames,
      };

      await notionService.createRecipe(createRecipeData);
      setSaveSuccess(true);

      // Auto-hide success message after 5 seconds but keep form data
      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);

    } catch (error) {
      setSavingError(error instanceof Error ? error.message : 'Failed to save recipe to Notion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setRecipeText('');
    setYoutubeUrl('');
    setParsedRecipe(null);
    setParsingError(null);
    setSavingError(null);
    setSaveSuccess(false);
    setValidationErrors([]);
    setTranscriptPreview('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-serif text-amber-800">Add recipe</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="mt-2 text-gray-600">Parse recipes from text or YouTube videos and save to your Notion database.</p>

          {/* Tabs */}
          <div className="mt-4 flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              <ClipboardIcon className="w-4 h-4" />
              Recipe Text
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'youtube'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              <YouTubeIcon className="w-4 h-4" />
              YouTube Video
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Input Section */}
          <div className="space-y-4">
            {activeTab === 'text' && (
              <>
                <div>
                  <label htmlFor="recipe-text" className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Text
                  </label>
                  <textarea
                    id="recipe-text"
                    rows={12}
                    className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition resize-none"
                    placeholder="Paste your recipe here... Include the recipe name, ingredients, and instructions."
                    value={recipeText}
                    onChange={(e) => setRecipeText(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleParseRecipe}
                    disabled={isParsingText || !recipeText.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    <ClipboardIcon className="w-5 h-5" />
                    {isParsingText ? 'Parsing...' : 'Parse Recipe'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}

            {activeTab === 'youtube' && (
              <>
                <div>
                  <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Video URL
                  </label>
                  <input
                    id="youtube-url"
                    type="url"
                    className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Enter a YouTube video URL containing a cooking recipe. The transcript will be automatically extracted and parsed.
                  </p>
                </div>

                {transcriptPreview && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extracted Transcript Preview
                    </label>
                    <div className="max-h-32 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                      {transcriptPreview.substring(0, 500)}
                      {transcriptPreview.length > 500 && '...'}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleParseYoutube}
                    disabled={isParsingYoutube || !youtubeUrl.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    <YouTubeIcon className="w-5 h-5" />
                    {isParsingYoutube ? 'Extracting Recipe...' : 'Extract Recipe'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}

            {parsingError && (
              <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
                <strong>Parsing Error:</strong> {parsingError}
              </div>
            )}

            {savingError && (
              <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
                <strong>Save Error:</strong> {savingError}
              </div>
            )}

            {saveSuccess && (
              <div className="p-4 bg-green-100 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                <span><strong>Success!</strong> Recipe saved to your Notion database. You can now add another recipe or clear the form.</span>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Parsed Preview</h3>

            {!parsedRecipe && (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                <ClipboardIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>Parsed recipe data will appear here</p>
              </div>
            )}

            {parsedRecipe && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-amber-900">{parsedRecipe.recipeName}</h4>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
                    <ClockIcon className="w-4 h-4 text-amber-600" />
                    <strong>Prep:</strong> {parsedRecipe.prepTime}
                  </div>
                  <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
                    <ClockIcon className="w-4 h-4 text-amber-600" />
                    <strong>Cook:</strong> {parsedRecipe.cookTime}
                  </div>
                  <div className="flex items-center gap-2 bg-amber-100 p-2 rounded-full">
                    <UsersIcon className="w-4 h-4 text-amber-600" />
                    <strong>Servings:</strong> {parsedRecipe.servings}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-amber-800 border-b border-amber-200 pb-1">Ingredients</h5>
                    <ul className="mt-2 space-y-1 text-sm">
                      {parsedRecipe.cleanIngredientNames.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 flex-shrink-0"></span>
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-amber-800 border-b border-amber-200 pb-1">Instructions</h5>
                    <ol className="mt-2 space-y-2 text-sm">
                      {parsedRecipe.instructions.map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
                    <h6 className="font-medium text-yellow-800 mb-2">Validation Warnings:</h6>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveRecipe}
                    disabled={isSaving || validationErrors.length > 0}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    <SaveIcon className="w-5 h-5" />
                    {isSaving ? 'Saving...' : 'Save to Notion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeParser;