export interface TranscriptEntry {
    text: string;
    offset: number;
    duration?: number;
}

export interface TranscriptResult {
    success: boolean;
    transcript?: string;
    entries?: TranscriptEntry[];
    error?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, etc.
 */
export const extractVideoId = (url: string): string | null => {
    // Remove any whitespace
    url = url.trim();

    // Regular YouTube URL patterns
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // If it's already just a video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return url;
    }

    return null;
};

/**
 * Fetch transcript using server-side API endpoint
 * This avoids CORS issues by processing on the server
 */
const fetchWithServerAPI = async (youtubeUrl: string): Promise<TranscriptResult> => {
    try {
        const response = await fetch('/api/youtube/transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ youtubeUrl })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `Server error: ${response.status}`
            };
        }

        if (!data.success) {
            return {
                success: false,
                error: data.error || "Failed to fetch transcript"
            };
        }

        return {
            success: true,
            transcript: data.transcript,
            entries: data.entries || []
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Network error occurred"
        };
    }
};

/**
 * Main function to fetch YouTube video transcript
 * Uses server-side API to avoid CORS issues
 */
export const fetchYouTubeTranscript = async (youtubeUrl: string): Promise<TranscriptResult> => {
    // Validate YouTube URL format first
    if (!isValidYouTubeUrl(youtubeUrl)) {
        return {
            success: false,
            error: "Invalid YouTube URL format"
        };
    }

    // Use server-side API to fetch transcript
    const result = await fetchWithServerAPI(youtubeUrl);

    return result;
};

/**
 * Validate YouTube URL format
 */
export const isValidYouTubeUrl = (url: string): boolean => {
    return extractVideoId(url) !== null;
};

/**
 * Clean transcript text for recipe parsing
 * Removes timestamps, speaker names, and other non-recipe content
 */
export const cleanTranscriptForRecipe = (transcript: string): string => {
    return transcript
        // Remove common non-recipe phrases
        .replace(/\b(like and subscribe|don't forget to subscribe|hit the bell|comment below)\b/gi, '')
        // Remove speaker indicators
        .replace(/^[A-Z\s]+:/gm, '')
        // Remove timestamp patterns
        .replace(/\[\d{2}:\d{2}:\d{2}\]/g, '')
        .replace(/\(\d{2}:\d{2}\)/g, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
};