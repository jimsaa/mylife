import { NextResponse } from 'next/server';
import { getWhatsNew } from '@/lib/repositories/whats-new';
import { getFeaturedMonthlyDrop } from '@/lib/repositories/content-repository';

export async function GET() {
  return NextResponse.json({
    items: getWhatsNew(15),
    featured_drop: getFeaturedMonthlyDrop(),
  });
}
