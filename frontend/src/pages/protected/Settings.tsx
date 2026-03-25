import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineChip,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
} from 'react-icons/hi';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function Settings() {
  const { user, updateUser, logout } = useAuthStore();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // AI Provider
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'claude'>(user?.aiProvider || 'gemini');
  const [savingProvider, setSavingProvider] = useState(false);

  // Delete Account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      setSavingProfile(true);
      const res = await api.put('/auth/profile', { name: name.trim(), email: email.trim() });
      updateUser(res.data);
      toast.success('Profile updated successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setSavingPassword(true);
      await api.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveProvider = async () => {
    try {
      setSavingProvider(true);
      await api.put('/auth/ai-provider', { aiProvider });
      updateUser({ aiProvider });
      toast.success('AI provider updated successfully');
    } catch {
      toast.error('Failed to update AI provider');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    try {
      setDeleting(true);
      await api.delete('/auth/account');
      toast.success('Account deleted');
      logout();
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>

        {/* Profile Section */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <HiOutlineUser className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-prose mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-prose mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-accent outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-glow transition-colors disabled:opacity-50"
            >
              {savingProfile ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : null}
              Save Profile
            </button>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <HiOutlineLockClosed className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-white">Change Password</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-prose mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-prose mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-prose mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-accent outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-glow transition-colors disabled:opacity-50"
            >
              {savingPassword ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : null}
              Change Password
            </button>
          </div>
        </div>

        {/* AI Provider Section */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <HiOutlineChip className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-white">AI Provider</h2>
          </div>
          <div className="space-y-3 mb-4">
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                aiProvider === 'gemini'
                  ? 'border-indigo-600 bg-accent/10'
                  : 'border-border hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="aiProvider"
                value="gemini"
                checked={aiProvider === 'gemini'}
                onChange={(e) => setAiProvider(e.target.value as 'gemini')}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  aiProvider === 'gemini' ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {aiProvider === 'gemini' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">Google Gemini</p>
                <p className="text-sm text-muted">Fast and efficient AI generation</p>
              </div>
            </label>
            <label
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                aiProvider === 'openai'
                  ? 'border-indigo-600 bg-accent/10'
                  : 'border-border hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="aiProvider"
                value="openai"
                checked={aiProvider === 'openai'}
                onChange={(e) => setAiProvider(e.target.value as 'openai')}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  aiProvider === 'openai' ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {aiProvider === 'openai' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">OpenAI</p>
                <p className="text-sm text-muted">Advanced language models</p>
              </div>
            </label>

            {/* Claude */}
            <label
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                aiProvider === 'claude'
                  ? 'border-indigo-600 bg-accent/10'
                  : 'border-border hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="aiProvider"
                value="claude"
                checked={aiProvider === 'claude'}
                onChange={(e) => setAiProvider(e.target.value as 'claude')}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  aiProvider === 'claude' ? 'border-indigo-600' : 'border-gray-300'
                }`}
              >
                {aiProvider === 'claude' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">Claude</p>
                <p className="text-sm text-muted">Anthropic&apos;s intelligent assistant</p>
              </div>
            </label>
          </div>
          <button
            onClick={handleSaveProvider}
            disabled={savingProvider}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-glow transition-colors disabled:opacity-50"
          >
            {savingProvider ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : null}
            Save Provider
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-surface rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <HiOutlineExclamationCircle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted mb-4">
            Once you delete your account, there is no going back. All your courses, certificates,
            and data will be permanently removed.
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <HiOutlineTrash className="h-4 w-4" />
            Delete Account
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <HiOutlineExclamationCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Account</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                This action is irreversible. Type <strong>DELETE</strong> below to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirm('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-prose hover:bg-surface rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <HiOutlineTrash className="h-4 w-4" />
                  )}
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
