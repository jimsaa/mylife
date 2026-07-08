import { NextResponse } from 'next/server';
import { globalSearch } from '@/lib/repositories/content-repository';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return NextResponse.json({ results: globalSearch(q) });
}
