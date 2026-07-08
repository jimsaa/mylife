import { useRef, useState } from 'react';
import { profileApi } from '../../api';
import { Button } from '../ui/Button';
import { UserAvatar } from '../layout/UserAvatar';
import type { ProfileSettings } from '../../types';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

interface AvatarUploadProps {
  avatarUrl: string | null;
  onUpdated: (profile: ProfileSettings) => void;
}

export function AvatarUpload({ avatarUrl, onUpdated }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ base64: string; mime: string; name: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const displayUrl = preview ?? avatarUrl;

  const readFile = (file: File) =>
    new Promise<{ base64: string; mime: string; name: string }>((resolve, reject) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        reject(new Error('Använd PNG, JPG eller WEBP.'));
        return;
      }
      if (file.size > MAX_BYTES) {
        reject(new Error('Filen får max vara 5 MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          base64: result.split(',')[1] ?? '',
          mime: file.type,
          name: file.name,
        });
      };
      reader.onerror = () => reject(new Error('Kunde inte läsa filen.'));
      reader.readAsDataURL(file);
    });

  const handleSelect = async (file: File) => {
    setError(null);
    try {
      const data = await readFile(file);
      setPendingFile(data);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uppladdning misslyckades');
    }
  };

  const save = async () => {
    if (!pendingFile) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await profileApi.uploadAvatar(pendingFile.base64, pendingFile.mime);
      setPendingFile(null);
      setPreview(null);
      onUpdated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      const profile = await profileApi.removeAvatar();
      setPendingFile(null);
      setPreview(null);
      onUpdated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative block"
        aria-label={displayUrl ? 'Byt profilbild' : 'Lägg till profilbild'}
      >
        {displayUrl ? (
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full shadow-md ring-4 ring-teal-100 transition group-hover:ring-teal-200">
            <img src={displayUrl} alt="Profilbild" className="h-full w-full object-contain" />
          </div>
        ) : (
          <UserAvatar avatarUrl={null} size="settings" linkToSettings={false} />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSelect(file);
          e.target.value = '';
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {pendingFile && (
          <Button size="sm" onClick={save} disabled={saving}>
            Spara profilbild
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          {avatarUrl || pendingFile ? 'Byt bild' : 'Ladda upp'}
        </Button>
        {(avatarUrl || pendingFile) && (
          <Button size="sm" variant="ghost" onClick={remove} disabled={saving}>
            Ta bort
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
