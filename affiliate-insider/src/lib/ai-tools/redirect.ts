/** Build tracked outbound URLs — UI must use these, never raw affiliate URLs */

export function buildToolGoUrl(slug: string, dest?: 'website'): string {
  const base = `/go/tool/${encodeURIComponent(slug)}`;
  return dest === 'website' ? `${base}?to=website` : base;
}

export function resolveToolOutboundUrl(
  tool: { affiliate_url: string | null; website_url: string },
  dest?: 'website' | 'affiliate'
): string {
  if (dest === 'website') return tool.website_url;
  return tool.affiliate_url ?? tool.website_url;
}
