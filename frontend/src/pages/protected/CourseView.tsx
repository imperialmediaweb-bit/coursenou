import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineDocumentDownload,
  HiOutlinePresentationChartBar,
  HiOutlineVolumeUp,
  HiOutlineShare,
  HiOutlineAcademicCap,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlineChatAlt2,
  HiOutlinePencilAlt,
  HiOutlineCheck,
  HiOutlinePaperAirplane,
} from 'react-icons/hi';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Course, Note } from '../../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTopic, setCurrentTopic] = useState(0);
  const [currentSubtopic, setCurrentSubtopic] = useState(0);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set([0]));
  const [visitedSubtopics, setVisitedSubtopics] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Notes
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const noteTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isPaid = user?.plan === 'monthly' || user?.plan === 'yearly';

  useEffect(() => {
    fetchCourse();
    fetchNotes();
  }, [id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
    } catch {
      toast.error('Failed to load course');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/notes/${id}`);
      if (res.data?.content) {
        setNoteContent(res.data.content);
      }
    } catch {
      // No notes yet
    }
  };

  // Mark current subtopic as visited
  useEffect(() => {
    const key = `${currentTopic}-${currentSubtopic}`;
    setVisitedSubtopics((prev) => new Set(prev).add(key));
  }, [currentTopic, currentSubtopic]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const totalSubtopics = course?.topics.reduce((acc, t) => acc + t.subtopics.length, 0) || 0;
  const allVisited = visitedSubtopics.size >= totalSubtopics && totalSubtopics > 0;

  const navigateSubtopic = useCallback(
    (direction: 'prev' | 'next') => {
      if (!course) return;
      if (direction === 'next') {
        const currentTopicData = course.topics[currentTopic];
        if (currentSubtopic < currentTopicData.subtopics.length - 1) {
          setCurrentSubtopic(currentSubtopic + 1);
        } else if (currentTopic < course.topics.length - 1) {
          setCurrentTopic(currentTopic + 1);
          setCurrentSubtopic(0);
          setExpandedTopics((prev) => new Set(prev).add(currentTopic + 1));
        }
      } else {
        if (currentSubtopic > 0) {
          setCurrentSubtopic(currentSubtopic - 1);
        } else if (currentTopic > 0) {
          const prevTopicSubs = course.topics[currentTopic - 1].subtopics.length;
          setCurrentTopic(currentTopic - 1);
          setCurrentSubtopic(prevTopicSubs - 1);
          setExpandedTopics((prev) => new Set(prev).add(currentTopic - 1));
        }
      }
    },
    [course, currentTopic, currentSubtopic]
  );

  const isFirst = currentTopic === 0 && currentSubtopic === 0;
  const isLast =
    course &&
    currentTopic === course.topics.length - 1 &&
    currentSubtopic === course.topics[course.topics.length - 1].subtopics.length - 1;

  const handleComplete = async () => {
    try {
      setCompleting(true);
      await api.post(`/courses/${id}/complete`);
      setCourse((prev) => (prev ? { ...prev, isCompleted: true } : null));
      toast.success('Course marked as complete!');
    } catch {
      toast.error('Failed to mark course as complete');
    } finally {
      setCompleting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await api.get(`/courses/${id}/export/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${course?.title || 'course'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportPpt = () => {
    if (!isPaid) {
      toast.error('PPT export requires a paid plan. Upgrade to unlock!');
      return;
    }
    window.open(`/api/courses/${id}/export/ppt`, '_blank');
  };

  const handleAudio = () => {
    if (!isPaid) {
      toast.error('Audio requires a paid plan. Upgrade to unlock!');
      return;
    }
    if (course?.audioUrl) {
      window.open(course.audioUrl, '_blank');
    } else {
      toast.error('Audio is not available for this course yet');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/shared/${course?.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    try {
      setChatLoading(true);
      const res = await api.post(`/courses/${id}/chat`, { message: userMessage });
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.reply || res.data.message },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not process your question. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNoteSave = useCallback(
    (content: string) => {
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
      noteTimerRef.current = setTimeout(async () => {
        try {
          await api.put(`/notes/${id}`, { content });
        } catch {
          // Silent fail for auto-save
        }
      }, 1000);
    },
    [id]
  );

  const onNoteChange = (value: string) => {
    setNoteContent(value);
    handleNoteSave(value);
  };

  if (loading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const currentTopicData = course.topics[currentTopic];
  const currentSubtopicData = currentTopicData?.subtopics[currentSubtopic];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Action Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <HiOutlineX className="h-5 w-5" /> : <HiOutlineMenu className="h-5 w-5" />}
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs sm:max-w-md">
            {course.title}
          </h1>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export PDF"
          >
            <HiOutlineDocumentDownload className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleExportPpt}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="Export PPT"
          >
            <HiOutlinePresentationChartBar className="h-4 w-4" />
            <span className="hidden sm:inline">PPT</span>
            {!isPaid && <HiOutlineLockClosed className="h-3 w-3 text-amber-500" />}
          </button>
          <button
            onClick={handleAudio}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="Audio"
          >
            <HiOutlineVolumeUp className="h-4 w-4" />
            <span className="hidden sm:inline">Audio</span>
            {!isPaid && <HiOutlineLockClosed className="h-3 w-3 text-amber-500" />}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Share"
          >
            <HiOutlineShare className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <Link
            to={`/course/${id}/quiz`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Quiz"
          >
            <HiOutlineAcademicCap className="h-4 w-4" />
            <span className="hidden sm:inline">Quiz</span>
          </Link>
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              notesOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Notes"
          >
            <HiOutlinePencilAlt className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-200 pt-[52px] lg:pt-0`}
        >
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Topics
            </h3>
            <nav className="space-y-1">
              {course.topics.map((topic, tIndex) => (
                <div key={tIndex}>
                  <button
                    onClick={() => {
                      setExpandedTopics((prev) => {
                        const next = new Set(prev);
                        if (next.has(tIndex)) next.delete(tIndex);
                        else next.add(tIndex);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentTopic === tIndex
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate text-left">{topic.title}</span>
                    <HiOutlineChevronDown
                      className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        expandedTopics.has(tIndex) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedTopics.has(tIndex) && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {topic.subtopics.map((sub, sIndex) => {
                        const isActive = currentTopic === tIndex && currentSubtopic === sIndex;
                        const isVisited = visitedSubtopics.has(`${tIndex}-${sIndex}`);
                        return (
                          <button
                            key={sIndex}
                            onClick={() => {
                              setCurrentTopic(tIndex);
                              setCurrentSubtopic(sIndex);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                              isActive
                                ? 'bg-indigo-100 text-indigo-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {isVisited ? (
                              <HiOutlineCheck className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span className="truncate text-left">{sub.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
            {currentSubtopicData && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {currentSubtopicData.title}
                </h2>

                {currentSubtopicData.imageUrl && (
                  <img
                    src={currentSubtopicData.imageUrl}
                    alt={currentSubtopicData.title}
                    className="w-full max-h-96 object-cover rounded-xl mb-6"
                  />
                )}

                {currentSubtopicData.videoUrl && (
                  <div className="mb-6 rounded-xl overflow-hidden">
                    <video
                      src={currentSubtopicData.videoUrl}
                      controls
                      className="w-full"
                    />
                  </div>
                )}

                <div className="prose prose-indigo max-w-none mb-8">
                  {currentSubtopicData.content.split('\n').map((paragraph, i) => (
                    <p key={i} className="text-gray-700 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                onClick={() => navigateSubtopic('prev')}
                disabled={isFirst}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <HiOutlineChevronLeft className="h-4 w-4" />
                Previous
              </button>
              {isLast && allVisited && !course.isCompleted ? (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {completing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <HiOutlineCheckCircle className="h-5 w-5" />
                  )}
                  Mark as Complete
                </button>
              ) : course.isCompleted ? (
                <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <HiOutlineCheckCircle className="h-5 w-5" />
                  Completed
                </span>
              ) : null}
              <button
                onClick={() => navigateSubtopic('next')}
                disabled={!!isLast}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        {notesOpen && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notes</h3>
              <button
                onClick={() => setNotesOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <HiOutlineX className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Write your notes here... (auto-saves)"
              className="flex-1 p-4 resize-none outline-none text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 transition-colors ${
          chatOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
        } text-white`}
      >
        {chatOpen ? (
          <HiOutlineX className="h-6 w-6" />
        ) : (
          <HiOutlineChatAlt2 className="h-6 w-6" />
        )}
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-40 max-h-[500px]">
          <div className="p-4 border-b border-gray-200 bg-indigo-600 rounded-t-xl">
            <h3 className="font-semibold text-white">Course Assistant</h3>
            <p className="text-xs text-indigo-200">Ask questions about this course</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {chatMessages.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-8">
                Ask anything about this course content!
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
