import { useEffect, useState } from 'react';
import { profileApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { AvatarUpload } from '../components/dashboard/AvatarUpload';
import { ConnectionTest } from '../components/settings/ConnectionTest';
import { useProfile } from '../context/ProfileContext';

export function SettingsPage() {
  const { profile, setProfile } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name);
  }, [profile]);

  const saveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await profileApi.updateDisplayName(displayName.trim());
      setProfile(updated);
      setMessage('Namn sparat.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <p className="text-text-muted">Laddar...</p>;
  }

  return (
    <div>
      <PageHeader title="Inställningar" subtitle="Personlig profil och preferenser" />

      <Card title="Profil" className="mb-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <AvatarUpload
            avatarUrl={profile.avatar_url}
            onUpdated={(updated) => {
              setProfile(updated);
              setMessage('Profilbild uppdaterad.');
            }}
          />

          <div className="flex-1">
            <Field label="Visningsnamn">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jim"
              />
            </Field>
            <Button onClick={saveName} disabled={saving || !displayName.trim()}>
              Spara namn
            </Button>
            <p className="mt-4 text-xs text-text-muted">
              Profilbilder lagras lokalt. Format: PNG, JPG, WEBP. Max 5 MB.
            </p>
          </div>
        </div>
      </Card>

      <ConnectionTest />

      {message && <p className="text-sm text-teal-700">{message}</p>}
    </div>
  );
}
