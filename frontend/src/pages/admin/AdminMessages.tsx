import { useState, useEffect } from 'react';
import { HiEnvelope, HiPaperAirplane, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { ContactMessage } from '../../types';

const AdminMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/admin/messages');
      setMessages(res.data);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId: string) => {
    if (!replyText.trim()) {
      toast.error('Reply text is required');
      return;
    }

    setSending(true);
    try {
      await api.post(`/admin/messages/${messageId}/reply`, { replyText });
      toast.success('Reply sent');
      setReplyText('');
      setExpandedId(null);
      fetchMessages();
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setReplyText('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">{messages.length} contact messages</p>
      </div>

      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-500">
            <HiEnvelope className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(msg._id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-gray-900">{msg.name}</h3>
                    <span className="text-xs text-gray-500">{msg.email}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        msg.replied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {msg.replied ? 'Replied' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 truncate">{msg.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="ml-4">
                  {expandedId === msg._id ? (
                    <HiChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <HiChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedId === msg._id && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Full Message:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {msg.replied && msg.replyText && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm font-medium text-indigo-700 mb-1">Your Reply:</p>
                      <p className="text-sm text-indigo-600 whitespace-pre-wrap">{msg.replyText}</p>
                    </div>
                  )}

                  {!msg.replied && (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      />
                      <button
                        onClick={() => handleReply(msg._id)}
                        disabled={sending}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        <HiPaperAirplane className="h-4 w-4" />
                        {sending ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
