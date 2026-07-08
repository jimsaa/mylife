import { NextResponse } from 'next/server';
import { handleToolRedirect } from '@/lib/repositories/tool-click-repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const dest = url.searchParams.get('to') === 'website' ? 'website' : 'affiliate';

  const result = await handleToolRedirect(slug, request, dest);
  if (!result) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.redirect(result.url, 302);
}
