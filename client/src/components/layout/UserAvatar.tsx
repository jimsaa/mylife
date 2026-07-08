import { Link } from 'react-router-dom';

type UserAvatarSize = 'sidebar' | 'sidebar-collapsed' | 'mobile' | 'settings';

interface UserAvatarProps {
  avatarUrl: string | null;
  size?: UserAvatarSize;
  linkToSettings?: boolean;
  className?: string;
}

const sizeClasses: Record<UserAvatarSize, string> = {
  sidebar: 'h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24',
  'sidebar-collapsed': 'h-10 w-10',
  mobile: 'h-16 w-16',
  settings: 'h-28 w-28',
};

export function UserAvatar({
  avatarUrl,
  size = 'sidebar',
  linkToSettings = true,
  className = '',
}: UserAvatarProps) {
  const image = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full shadow-md ring-4 ring-teal-100 ${sizeClasses[size]} ${className}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Profilbild"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 text-xs font-medium text-text-muted">
          ?
        </div>
      )}
    </div>
  );

  if (!linkToSettings) return image;

  return (
    <Link
      to="/installningar"
      className="inline-flex transition hover:opacity-90"
      aria-label="Profilinställningar"
      title="Profilinställningar"
    >
      {image}
    </Link>
  );
}
