import { NextRequest, NextResponse } from 'next/server';

export interface WebsiteApiResponse {
    success: boolean;
    content?: string;
    error?: string;
}

/**
 * Validate if URL is properly formatted
 */
function isValidUrl(url: string): boolean {
    try {
        const urlObj = new URL(url.trim());
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Clean HTML content for recipe parsing
 */
function cleanHtmlForRecipe(html: string): string {
    // Remove script and style tags with their content
    let cleaned = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

    // Remove HTML tags but keep content
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');

    // Decode HTML entities
    cleaned = cleaned
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–');

    // Clean up whitespace and common non-recipe content
    return cleaned
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .replace(/^[\s\n]+|[\s\n]+$/g, '')
        .trim();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { websiteUrl } = body;

        if (!websiteUrl) {
            return NextResponse.json(
                { success: false, error: 'Website URL is required' },
                { status: 400 }
            );
        }

        // Validate URL format
        if (!isValidUrl(websiteUrl)) {
            return NextResponse.json(
                { success: false, error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Fetch webpage content
        const response = await fetch(websiteUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0; +https://instadish.com)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate'
            },
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: `Failed to fetch webpage: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const html = await response.text();

        if (!html || html.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Webpage returned empty content' },
                { status: 404 }
            );
        }

        // Clean HTML for recipe parsing
        const cleanedContent = cleanHtmlForRecipe(html);

        if (cleanedContent.length < 50) {
            return NextResponse.json(
                { success: false, error: 'Insufficient content found on webpage' },
                { status: 404 }
            );
        }

        const apiResponse: WebsiteApiResponse = {
            success: true,
            content: cleanedContent
        };

        return NextResponse.json(apiResponse);

    } catch (error) {
        console.error('Website scraping API error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Handle specific error cases
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS')) {
            return NextResponse.json(
                { success: false, error: 'Website not found or DNS resolution failed' },
                { status: 404 }
            );
        }

        if (errorMessage.includes('ECONNREFUSED')) {
            return NextResponse.json(
                { success: false, error: 'Connection refused by website' },
                { status: 503 }
            );
        }

        if (errorMessage.includes('timeout')) {
            return NextResponse.json(
                { success: false, error: 'Request timeout - website took too long to respond' },
                { status: 408 }
            );
        }

        return NextResponse.json(
            { success: false, error: `Failed to scrape website: ${errorMessage}` },
            { status: 500 }
        );
    }
}