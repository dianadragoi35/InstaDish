import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

// GET - Fetch specific ingredient by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Ingredient ID is required' }, { status: 400 });
    }

    // Fetch the ingredient page
    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
      }
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.properties) {
      return NextResponse.json({ error: 'Invalid ingredient data' }, { status: 500 });
    }

    const ingredient = {
      id: data.id,
      name: data.properties['Ingredient Name']?.title?.[0]?.text?.content || '',
      inPantry: data.properties['In Pantry']?.checkbox || false,
      needToBuy: data.properties['Need to Buy']?.checkbox || false,
      lastUpdated: data.properties['Last Updated']?.date?.start || null,
      recipeIds: data.properties['Recipes']?.relation?.map((rel: any) => rel.id) || [],
    };

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredient' },
      { status: 500 }
    );
  }
}