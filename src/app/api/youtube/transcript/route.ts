import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

export interface TranscriptEntry {
    text: string;
    offset: number;
    duration?: number;
}

export interface TranscriptApiResponse {
    success: boolean;
    transcript?: string;
    entries?: TranscriptEntry[];
    error?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
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
}

/**
 * Clean transcript text for recipe parsing
 */
function cleanTranscriptForRecipe(transcript: string): string {
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
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { youtubeUrl } = body;

        if (!youtubeUrl) {
            return NextResponse.json(
                { success: false, error: 'YouTube URL is required' },
                { status: 400 }
            );
        }

        // Extract video ID from URL
        const videoId = extractVideoId(youtubeUrl);

        if (!videoId) {
            return NextResponse.json(
                { success: false, error: 'Invalid YouTube URL format' },
                { status: 400 }
            );
        }

        // Fetch transcript using the YouTube transcript package
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcriptArray || transcriptArray.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No transcript available for this video' },
                { status: 404 }
            );
        }

        // Combine transcript entries into full text
        const rawTranscript = transcriptArray.map(entry => entry.text).join(' ');
        const cleanedTranscript = cleanTranscriptForRecipe(rawTranscript);

        // Convert to our format
        const entries: TranscriptEntry[] = transcriptArray.map(entry => ({
            text: entry.text,
            offset: entry.offset || 0,
            duration: entry.duration
        }));

        const response: TranscriptApiResponse = {
            success: true,
            transcript: cleanedTranscript,
            entries
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('YouTube transcript API error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Handle specific error cases
        if (errorMessage.includes('Transcript is disabled')) {
            return NextResponse.json(
                { success: false, error: 'Transcript is disabled for this video' },
                { status: 404 }
            );
        }

        if (errorMessage.includes('Video unavailable')) {
            return NextResponse.json(
                { success: false, error: 'Video is unavailable or private' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: `Failed to fetch transcript: ${errorMessage}` },
            { status: 500 }
        );
    }
}