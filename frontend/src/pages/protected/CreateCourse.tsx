import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlinePhotograph,
  HiOutlineVideoCamera,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineArrowLeft,
  HiOutlineSparkles,
} from 'react-icons/hi';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { TopicSuggestion } from '../../types';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
  'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Turkish',
  'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Czech', 'Romanian',
  'Hungarian', 'Greek',
];

const STATUS_MESSAGES = [
  'Analyzing topics...',
  'Generating content...',
  'Finding images...',
  'Finalizing course...',
];

export default function CreateCourse() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [title, setTitle] = useState('');
  const [numTopics, setNumTopics] = useState(3);
  const [courseType, setCourseType] = useState<'image' | 'video'>('image');
  const [language, setLanguage] = useState('English');
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Step 2
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);

  // Step 3
  const [generating, setGenerating] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  // Step 4
  const [courseId, setCourseId] = useState<string | null>(null);

  const isPaid = user?.plan === 'monthly' || user?.plan === 'yearly';
  const maxTopics = isPaid ? 20 : 5;

  // Cycle status messages during generation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerateTopics = async () => {
    if (!title.trim()) {
      toast.error('Please enter a course title');
      return;
    }
    try {
      setLoadingTopics(true);
      const res = await api.post('/courses/generate-topics', {
        title: title.trim(),
        numTopics,
        language,
        type: courseType,
      });
      setTopics(res.data.topics || res.data);
      setStep(2);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to generate topics');
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleGenerateCourse = async () => {
    try {
      setGenerating(true);
      setStatusIndex(0);
      setStep(3);
      const res = await api.post('/courses/generate', {
        title: title.trim(),
        topics,
        language,
        type: courseType,
      });
      setCourseId(res.data._id || res.data.courseId);
      setStep(4);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to generate course');
      setStep(2);
    } finally {
      setGenerating(false);
    }
  };

  // Topic manipulation
  const updateTopicTitle = (index: number, newTitle: string) => {
    setTopics((prev) => prev.map((t, i) => (i === index ? { ...t, title: newTitle } : t)));
  };

  const moveTopic = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= topics.length) return;
    setTopics((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  };

  const removeTopic = (index: number) => {
    if (topics.length <= 1) {
      toast.error('At least one topic is required');
      return;
    }
    setTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const addTopic = () => {
    setTopics((prev) => [...prev, { title: 'New Topic', subtopics: ['Subtopic 1'] }]);
  };

  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Topics' },
    { num: 3, label: 'Generating' },
    { num: 4, label: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Step Indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-colors ${
                    step >= s.num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s.num ? (
                    <HiOutlineCheckCircle className="h-5 w-5" />
                  ) : (
                    s.num
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-600 hidden sm:inline">
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 sm:w-20 h-0.5 mx-2 ${
                      step > s.num ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create a New Course</h2>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Machine Learning"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              {/* Number of Topics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Topics: {numTopics}
                </label>
                <input
                  type="range"
                  min={1}
                  max={maxTopics}
                  value={numTopics}
                  onChange={(e) => setNumTopics(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span>
                  <span>{maxTopics}</span>
                </div>
                {!isPaid && (
                  <p className="text-xs text-amber-600 mt-1">
                    Free plan allows up to 5 topics. Upgrade for up to 20.
                  </p>
                )}
              </div>

              {/* Course Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCourseType('image')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      courseType === 'image'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <HiOutlinePhotograph className="h-6 w-6 text-indigo-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Image</p>
                      <p className="text-xs text-gray-500">With AI images</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPaid) {
                        toast.error('Video courses require a paid plan');
                        return;
                      }
                      setCourseType('video');
                    }}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors relative ${
                      courseType === 'video'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!isPaid ? 'opacity-60' : ''}`}
                  >
                    <HiOutlineVideoCamera className="h-6 w-6 text-purple-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Video</p>
                      <p className="text-xs text-gray-500">With AI videos</p>
                    </div>
                    {!isPaid && (
                      <HiOutlineLockClosed className="absolute top-2 right-2 h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button
                onClick={handleGenerateTopics}
                disabled={loadingTopics || !title.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingTopics ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Generating Topics...
                  </>
                ) : (
                  <>
                    <HiOutlineSparkles className="h-5 w-5" />
                    Generate Topics
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Topics Review */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <HiOutlineArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Review Topics</h2>
            </div>
            <p className="text-gray-500 mb-6">
              Edit, reorder, or remove topics before generating your course.
            </p>

            <div className="space-y-4 mb-6">
              {topics.map((topic, tIndex) => (
                <div
                  key={tIndex}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {tIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={topic.title}
                      onChange={(e) => updateTopicTitle(tIndex, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveTopic(tIndex, 'up')}
                        disabled={tIndex === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                        title="Move up"
                      >
                        <HiOutlineChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveTopic(tIndex, 'down')}
                        disabled={tIndex === topics.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                        title="Move down"
                      >
                        <HiOutlineChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeTopic(tIndex)}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="Remove topic"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <ul className="ml-9 space-y-1">
                    {topic.subtopics.map((sub, sIndex) => (
                      <li key={sIndex} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0" />
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={addTopic}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors mb-6"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Add Topic
            </button>

            <button
              onClick={handleGenerateCourse}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <HiOutlineSparkles className="h-5 w-5" />
              Generate Course
            </button>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mb-8">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <HiOutlineSparkles className="absolute inset-0 m-auto h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Generating Your Course
            </h2>
            <p className="text-gray-500 mb-4">This may take a minute or two...</p>
            <p className="text-indigo-600 font-medium animate-pulse">
              {STATUS_MESSAGES[statusIndex]}
            </p>
            <div className="mt-8 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${((statusIndex + 1) / STATUS_MESSAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && courseId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <HiOutlineCheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Course Generated!
            </h2>
            <p className="text-gray-500 mb-8">
              Your course has been created successfully. Start learning now!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                View Course
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
