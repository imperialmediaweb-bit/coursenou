import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { Course } from '../../types';
import toast from 'react-hot-toast';

export default function SharedCourse() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/share/${shareToken}`);
        setCourse(res.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Failed to load course');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <p className="text-gray-600">
            This shared course link is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const activeTopic = course.topics[activeTopicIndex];

  const goToPreviousTopic = () => {
    if (activeTopicIndex > 0) {
      setActiveTopicIndex(activeTopicIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextTopic = () => {
    if (activeTopicIndex < course.topics.length - 1) {
      setActiveTopicIndex(activeTopicIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600 font-medium mb-1">
                Shared Course
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {course.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {course.language}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                course.type === 'video'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {course.type === 'video' ? 'Video' : 'Image'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">
                  Course Topics
                </h2>
              </div>
              <nav className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {course.topics.map((topic, tIdx) => (
                  <button
                    key={tIdx}
                    onClick={() => {
                      setActiveTopicIndex(tIdx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 transition-colors ${
                      activeTopicIndex === tIdx
                        ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs text-gray-400 mr-2">
                      {tIdx + 1}.
                    </span>
                    {topic.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {activeTopic ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {activeTopic.title}
                  </h2>
                  <p className="text-sm text-gray-500 mb-8">
                    Topic {activeTopicIndex + 1} of {course.topics.length} &middot; {activeTopic.subtopics.length} subtopic{activeTopic.subtopics.length !== 1 ? 's' : ''}
                  </p>

                  <div className="space-y-10">
                    {activeTopic.subtopics.map((subtopic, sIdx) => (
                      <div key={sIdx} className="scroll-mt-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                          {subtopic.title}
                        </h3>

                        {subtopic.imageUrl && (
                          <div className="rounded-lg overflow-hidden mb-4">
                            <img
                              src={subtopic.imageUrl}
                              alt={subtopic.title}
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}

                        <div className="prose prose-lg prose-indigo max-w-none">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {subtopic.content}
                          </p>
                        </div>

                        {sIdx < activeTopic.subtopics.length - 1 && (
                          <hr className="mt-10 border-gray-100" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <button
                    onClick={goToPreviousTopic}
                    disabled={activeTopicIndex === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    &larr; Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Topic {activeTopicIndex + 1} of {course.topics.length}
                  </span>
                  <button
                    onClick={goToNextTopic}
                    disabled={activeTopicIndex === course.topics.length - 1}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center py-12">
                <p className="text-gray-500">
                  Select a topic from the sidebar to begin reading.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-sm text-gray-400">
            Generated with CourseBit - AI Course Generator
          </p>
        </div>
      </footer>
    </div>
  );
}
