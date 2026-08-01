import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, JSX.Element> = {
  course_created: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25v13m0-13a6 6 0 00-8 0v13a6 6 0 018 0m0-13a6 6 0 018 0v13a6 6 0 00-8 0" />
  ),
  course_completed: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  certificate_earned: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15.5a5 5 0 116 0m-6 0V21l3-1.5L15 21v-5.5m-6 0a5 5 0 006 0" />
  ),
  quiz_passed: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  level_up: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.1 6.1 21.2l1.2-6.6L2.5 10l6.6-.9z" />
  ),
  subscription_activated: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 6h6m-6 2.25h3M3.75 5.25h16.5a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z" />
  ),
  welcome: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.04 6.02a2.25 2.25 0 01-2.42 0L2.25 6.75" />
  ),
};

const DEFAULT_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
);

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data as { data: Notification[]; unread: number };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: invalidate,
    onError: () => toast.error('Could not mark notifications as read'),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: invalidate,
    onError: () => toast.error('Could not delete that notification'),
  });

  const notifications = data?.data ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div className="min-h-screen bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            {unread > 0 && (
              <p className="mt-1 text-sm text-muted">
                {unread} unread
              </p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-prose transition-colors hover:text-white disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="mb-4 text-sm text-prose">We couldn&apos;t load your notifications.</p>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-border/40">
              <svg className="h-7 w-7 text-muted" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                {DEFAULT_ICON}
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">No notifications yet</h3>
            <p className="text-sm text-muted">
              Create a course, finish a quiz or earn a certificate and it will show up here.
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {notifications.map((notification) => {
            const Row = (
              <div className="flex gap-4">
                <div
                  className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                    notification.read ? 'bg-border/40 text-muted' : 'bg-accent/15 text-accent'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                    {ICONS[notification.type] ?? DEFAULT_ICON}
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`text-sm font-semibold ${notification.read ? 'text-prose' : 'text-white'}`}>
                      {notification.title}
                    </h3>
                    <span className="flex-shrink-0 text-xs text-muted">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{notification.body}</p>
                </div>
              </div>
            );

            return (
              <li
                key={notification.id}
                className={`group relative rounded-xl border p-4 transition-colors ${
                  notification.read
                    ? 'border-border bg-surface/60'
                    : 'border-accent/30 bg-surface'
                }`}
              >
                {notification.link ? (
                  <Link
                    to={notification.link}
                    onClick={() => {
                      if (!notification.read) markOne.mutate(notification.id);
                    }}
                    className="block"
                  >
                    {Row}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!notification.read) markOne.mutate(notification.id);
                    }}
                    className="block w-full text-left"
                  >
                    {Row}
                  </button>
                )}

                <button
                  onClick={() => remove.mutate(notification.id)}
                  aria-label="Delete notification"
                  className="absolute right-2 top-2 rounded-lg p-1.5 text-muted opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
