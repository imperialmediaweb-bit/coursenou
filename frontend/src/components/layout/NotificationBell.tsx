import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

/**
 * Unread badge in the navbar. Polls rather than holding a socket open — the
 * events behind these notifications are minutes apart, not seconds.
 */
export default function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data.unread as number;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  const unread = data ?? 0;

  return (
    <Link
      to="/notifications"
      onClick={onNavigate}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className="relative p-1.5 text-prose transition-colors hover:text-white"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
