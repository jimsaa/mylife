export interface ToolClick {
  id: string;
  tool_id: string;
  user_id: string | null;
  ip_hash: string | null;
  created_at: string;
  referrer: string | null;
}

export interface ToolClickStats {
  tool_id: string;
  slug: string;
  name: string;
  clicks: number;
}
