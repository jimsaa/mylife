import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  buildLocalUrl,
  getCurrentHostname,
  getCurrentOrigin,
  getEffectiveNetworkUrl,
} from '../../lib/networkUrls';

interface HealthResponse {
  status: string;
  app: string;
  server_time: string;
  client_port: number;
  local_url: string;
  network_urls: string[];
}

export function ConnectionTest() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const primaryNetworkUrl =
    health?.network_urls[0] ?? getEffectiveNetworkUrl() ?? buildLocalUrl();

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<HealthResponse>('/health');
      setHealth(result);
    } catch (err) {
      setHealth(null);
      setError(err instanceof Error ? err.message : 'Anslutning misslyckades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runTest();
  }, [runTest]);

  const copyNetworkUrl = async () => {
    try {
      await navigator.clipboard.writeText(primaryNetworkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card title="Anslutningstest" className="mb-6">
      <p className="mb-4 text-sm text-text-muted">
        Använd denna sida om My Life inte når din telefon eller surfplatta på samma Wi-Fi.
      </p>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Nuvarande värdnamn</dt>
          <dd className="font-mono">{getCurrentHostname()}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Nuvarande URL</dt>
          <dd className="font-mono break-all">{getCurrentOrigin()}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Lokal URL</dt>
          <dd className="font-mono break-all">{health?.local_url ?? buildLocalUrl()}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Nätverks-URL</dt>
          <dd className="font-mono break-all">{primaryNetworkUrl}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Serverstatus</dt>
          <dd>
            {loading && 'Testar...'}
            {!loading && health && (
              <span className="font-medium text-teal-700">
                OK — {health.app} ({health.status})
              </span>
            )}
            {!loading && error && <span className="text-red-600">{error}</span>}
          </dd>
        </div>
        {health?.network_urls.length ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Alla nätverksadresser</dt>
            <dd className="space-y-1 font-mono text-xs">
              {health.network_urls.map((url) => (
                <div key={url} className="break-all">
                  {url}
                </div>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={runTest} disabled={loading}>
          Testa igen
        </Button>
        <Button size="sm" onClick={copyNetworkUrl}>
          {copied ? 'Kopierad!' : 'Kopiera nätverks-URL'}
        </Button>
      </div>
    </Card>
  );
}
