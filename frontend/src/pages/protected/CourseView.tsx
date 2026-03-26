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
import { fireCelebration } from '../../hooks/useConfetti';
import { useAuthStore } from '../../store/authStore';
import { Course, ChatMessage, CourseProgress } from '../../types';

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

  // Smart features
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [duplicating, setDuplicating] = useState(false);
  const startTimeRef = useRef(Date.now());

  const isPaid = user?.plan === 'monthly' || user?.plan === 'yearly';

  useEffect(() => {
    fetchCourse();
    fetchNotes();
    fetchProgress();
    fetchRating();
  }, [id]);

  // Keyboard shortcuts - defined after navigateSubtopic

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data.data || res.data);
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
      const nd = res.data.data || res.data;
      if (nd?.content) {
        setNoteContent(nd.content);
      }
    } catch {
      // No notes yet
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await api.get(`/progress/${id}`);
      const d = res.data.data || res.data;
      setProgress(d);
      if (d.visitedSubtopics) {
        setVisitedSubtopics(new Set(d.visitedSubtopics));
      }
      if (d.lastVisitedTopic !== undefined) {
        setCurrentTopic(d.lastVisitedTopic);
        setCurrentSubtopic(d.lastVisitedSubtopic);
        setExpandedTopics(prev => new Set(prev).add(d.lastVisitedTopic));
      }
    } catch {
      // No progress yet
    }
  };

  const fetchRating = async () => {
    try {
      const res = await api.get(`/ratings/${id}`);
      const d = res.data.data || res.data;
      if (d.userRating) setRatingValue(d.userRating.rating);
      setAvgRating(d.averageRating || 0);
      setTotalRatings(d.totalRatings || 0);
    } catch {
      // No ratings
    }
  };

  const saveProgress = async (visited: Set<string>) => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    startTimeRef.current = Date.now();
    try {
      await api.put(`/progress/${id}`, {
        visitedSubtopics: Array.from(visited),
        lastVisitedTopic: currentTopic,
        lastVisitedSubtopic: currentSubtopic,
        timeSpent,
      });
    } catch {
      // Silent
    }
  };

  const handleRate = async (rating: number) => {
    setRatingValue(rating);
    try {
      await api.post(`/ratings/${id}`, { rating });
      toast.success('Rating saved!');
      fetchRating();
    } catch {
      toast.error('Failed to save rating');
    }
  };

  const handleSummary = async () => {
    if (summaryText) {
      setSummaryOpen(!summaryOpen);
      return;
    }
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const res = await api.post(`/summary/${id}`);
      const sd = res.data.data || res.data;
      setSummaryText(sd.summary || sd);
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await api.post(`/duplicate/${id}`);
      toast.success('Course duplicated!');
      const dd = res.data.data || res.data;
      navigate(`/course/${dd._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to duplicate');
    } finally {
      setDuplicating(false);
    }
  };

  const handleBookmark = async () => {
    try {
      await api.post('/bookmarks', {
        courseId: id,
        topicIndex: currentTopic,
        subtopicIndex: currentSubtopic,
        subtopicTitle: currentSubtopicData?.title || '',
      });
      toast.success('Bookmarked!');
    } catch {
      toast.error('Failed to bookmark');
    }
  };

  // Mark current subtopic as visited and save progress
  useEffect(() => {
    const key = `${currentTopic}-${currentSubtopic}`;
    setVisitedSubtopics((prev) => {
      const next = new Set(prev).add(key);
      saveProgress(next);
      return next;
    });
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          navigateSubtopic('prev');
          break;
        case 'ArrowRight':
        case 'k':
          e.preventDefault();
          navigateSubtopic('next');
          break;
        case 'n':
          e.preventDefault();
          setNotesOpen(p => !p);
          break;
        case 'c':
          e.preventDefault();
          setChatOpen(p => !p);
          break;
        case 's':
          e.preventDefault();
          setSidebarOpen(p => !p);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateSubtopic]);

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
      fireCelebration();
      api.post('/gamification/xp', { action: 'COURSE_COMPLETED' }).catch(() => {});
    } catch {
      toast.error('Failed to mark course as complete');
    } finally {
      setCompleting(false);
    }
  };

  const handleExportPdf = () => {
    window.open(`/api/courses/${id}/export/pdf`, '_blank');
    toast.success('PDF page opened — press Ctrl+P to save');
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
      toast.error('Audio requires a paid plan.');
      return;
    }
    // Use Web Speech API for text-to-speech
    if (currentSubtopicData) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        toast.success('Audio stopped');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(currentSubtopicData.content.substring(0, 3000));
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      toast.success('Playing audio — click again to stop');
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
      const res = await api.post(`/chat/${id}`, { message: userMessage });
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.data?.response || res.data.response || res.data.reply || res.data.message || 'No response' },
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
    <div className="min-h-screen bg-base flex flex-col">
      {/* Action Bar */}
      <div className="bg-surface border-b border-border px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface"
          >
            {sidebarOpen ? <HiOutlineX className="h-5 w-5" /> : <HiOutlineMenu className="h-5 w-5" />}
          </button>
          <h1 className="text-lg font-semibold text-white truncate max-w-xs sm:max-w-md">
            {course.title}
          </h1>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors"
            title="Export PDF"
          >
            <HiOutlineDocumentDownload className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleExportPpt}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors relative"
            title="Export PPT"
          >
            <HiOutlinePresentationChartBar className="h-4 w-4" />
            <span className="hidden sm:inline">PPT</span>
            {!isPaid && <HiOutlineLockClosed className="h-3 w-3 text-amber-500" />}
          </button>
          <button
            onClick={handleAudio}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors relative"
            title="Audio"
          >
            <HiOutlineVolumeUp className="h-4 w-4" />
            <span className="hidden sm:inline">Audio</span>
            {!isPaid && <HiOutlineLockClosed className="h-3 w-3 text-amber-500" />}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors"
            title="Share"
          >
            <HiOutlineShare className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <Link
            to={`/course/${id}/quiz`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors"
            title="Quiz"
          >
            <HiOutlineAcademicCap className="h-4 w-4" />
            <span className="hidden sm:inline">Quiz</span>
          </Link>
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              notesOpen ? 'bg-accent/20 text-accent-glow' : 'text-prose hover:bg-surface'
            }`}
            title="Notes (N)"
          >
            <HiOutlinePencilAlt className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
          </button>
          <button
            onClick={handleBookmark}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors"
            title="Bookmark this subtopic"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            <span className="hidden sm:inline">Bookmark</span>
          </button>
          <Link
            to={`/course/${id}/flashcards`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors"
            title="Flashcards"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span className="hidden sm:inline">Flashcards</span>
          </Link>
          <button
            onClick={handleSummary}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${summaryOpen ? 'bg-accent/20 text-accent-glow' : 'text-prose hover:bg-surface'}`}
            title="AI Summary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">Summary</span>
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-prose hover:bg-surface rounded-lg transition-colors"
            title="Duplicate Course"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span className="hidden sm:inline">{duplicating ? '...' : 'Clone'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-surface dark:bg-gray-800 border-b border-border dark:border-gray-700 px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted whitespace-nowrap">
            {Math.round((visitedSubtopics.size / Math.max(totalSubtopics, 1)) * 100)}% complete
          </span>
          <div className="flex-1 bg-border dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(visitedSubtopics.size / Math.max(totalSubtopics, 1)) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setRatingHover(star)}
                onMouseLeave={() => setRatingHover(0)}
                className="p-0.5"
              >
                <svg className={`w-4 h-4 ${(ratingHover || ratingValue) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            {totalRatings > 0 && (
              <span className="text-xs text-muted ml-1">({avgRating.toFixed(1)})</span>
            )}
          </div>
          <span className="text-xs text-muted" title="Keyboard shortcuts: Arrow keys/J/K navigate, N=notes, C=chat, S=sidebar">
            ???
          </span>
        </div>
      </div>

      {/* AI Summary Panel */}
      {summaryOpen && (
        <div className="bg-accent/10 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-sm font-semibold text-accent-glow dark:text-indigo-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Course Summary
              <button onClick={() => setSummaryOpen(false)} className="ml-auto p-1 hover:bg-accent/20 dark:hover:bg-indigo-800 rounded">
                <HiOutlineX className="h-4 w-4" />
              </button>
            </h3>
            {summaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-accent">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
                Generating summary...
              </div>
            ) : (
              <p className="text-sm text-prose dark:text-gray-300 leading-relaxed">{summaryText}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-72 bg-surface border-r border-border overflow-y-auto transition-transform duration-200 pt-[52px] lg:pt-0`}
        >
          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
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
                        ? 'bg-accent/10 text-accent-glow font-medium'
                        : 'text-prose hover:bg-base'
                    }`}
                  >
                    <span className="text-left line-clamp-2">{topic.title}</span>
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
                                ? 'bg-accent/20 text-accent-glow font-medium'
                                : 'text-prose hover:bg-base'
                            }`}
                          >
                            {isVisited ? (
                              <HiOutlineCheck className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span className="text-left line-clamp-1">{sub.title}</span>
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
                <h2 className="text-2xl font-bold text-white mb-6">
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
                    <p key={i} className="text-prose leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <button
                onClick={() => navigateSubtopic('prev')}
                disabled={isFirst}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-prose hover:bg-surface rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-prose hover:bg-surface rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        {notesOpen && (
          <div className="w-80 bg-surface border-l border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-white">Notes</h3>
              <button
                onClick={() => setNotesOpen(false)}
                className="p-1 rounded hover:bg-surface"
              >
                <HiOutlineX className="h-4 w-4" />
              </button>
            </div>
            <p className="px-4 pt-2 text-xs text-muted">Supports **bold**, *italic*, # headings, - lists</p>
            <textarea
              value={noteContent}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Write your notes here using Markdown... (auto-saves)"
              className="flex-1 p-4 resize-none outline-none text-sm text-prose dark:text-gray-300 dark:bg-gray-800 placeholder-gray-400 font-mono"
            />
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 transition-colors ${
          chatOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-accent-glow'
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
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] bg-surface rounded-xl shadow-2xl border border-border flex flex-col z-40 max-h-[500px]">
          <div className="p-4 border-b border-border bg-accent rounded-t-xl">
            <h3 className="font-semibold text-white">Course Assistant</h3>
            <p className="text-xs text-indigo-200">Ask questions about this course</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {chatMessages.length === 0 && (
              <p className="text-sm text-muted text-center mt-8">
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
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-surface text-white rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-surface px-4 py-2 rounded-2xl rounded-bl-md">
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
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-accent"
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 bg-accent text-white rounded-full hover:bg-accent-glow disabled:opacity-50 transition-colors"
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
