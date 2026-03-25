import { HiOutlineBell } from 'react-icons/hi';

export default function Notifications() {
  return (
    <div className="min-h-screen bg-base py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Notifications</h1>

        <div className="bg-surface rounded-xl shadow-sm border border-border p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
            <HiOutlineBell className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No notifications</h3>
          <p className="text-muted">
            You&apos;re all caught up! We&apos;ll notify you when something important happens.
          </p>
        </div>
      </div>
    </div>
  );
}
