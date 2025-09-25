import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const INGREDIENTS_DATABASE_ID = process.env.INGREDIENTS_DATABASE_ID!;

// GET - Fetch all ingredients marked as "Need to Buy"
export async function GET() {
  try {
    console.log('🛒 Fetching shopping list (Need to Buy ingredients)');

    if (!INGREDIENTS_DATABASE_ID) {
      return NextResponse.json(
        { error: 'INGREDIENTS_DATABASE_ID environment variable is not set' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${INGREDIENTS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: 'Need to Buy',
          checkbox: {
            equals: true,
          },
        },
        sorts: [
          {
            property: 'Ingredient Name',
            direction: 'ascending',
          },
        ],
      }),
    });

    const data = await response.json();
    console.log(`📊 Found ${data.results?.length || 0} ingredients to buy`);

    if (!response.ok) {
      console.error('❌ Notion API error:', data);
      return NextResponse.json(
        { error: `Notion API error: ${data.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    if (!data.results) {
      console.error('❌ No results property in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from Notion API - no results property' },
        { status: 500 }
      );
    }

    const shoppingList = data.results.map((page: any) => ({
      id: page.id,
      name: page.properties['Ingredient Name']?.title?.[0]?.text?.content || '',
      inPantry: page.properties['In Pantry']?.checkbox || false,
      needToBuy: page.properties['Need to Buy']?.checkbox || false,
      lastUpdated: page.properties['Last Updated']?.date?.start || null,
      recipeIds: page.properties['Recipes']?.relation?.map((rel: any) => rel.id) || [],
    }));

    console.log(`✅ Successfully fetched shopping list with ${shoppingList.length} items`);
    return NextResponse.json({ shoppingList });
  } catch (error) {
    console.error('💥 Error fetching shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}