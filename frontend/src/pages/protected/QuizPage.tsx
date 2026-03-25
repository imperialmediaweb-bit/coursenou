import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineAcademicCap,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineArrowLeft,
} from 'react-icons/hi';
import api from '../../services/api';
import { Quiz } from '../../types';

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await api.get(`/quiz/${id}`);
      } catch {
        // Quiz doesn't exist, generate one
        res = await api.post(`/quiz/generate/${id}`);
      }
      setQuiz(res.data);
      // If quiz was already completed, show results
      if (res.data.score !== null && res.data.score !== undefined) {
        setScore(res.data.score);
        setPassed(res.data.passed);
        setSubmitted(true);
      }
    } catch {
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const answeredAll = quiz.questions.every((_, i) => selectedAnswers[i] !== undefined);
    if (!answeredAll) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const answers = quiz.questions.map((_, i) => selectedAnswers[i]);
      const res = await api.post(`/quiz/${quiz._id}/submit`, { answers });
      setScore(res.data.score);
      setPassed(res.data.passed);
      if (res.data.certificateId) {
        setCertificateId(res.data.certificateId);
      }
      setSubmitted(true);
    } catch {
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/quiz/generate/${id}`);
      setQuiz(res.data);
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setSubmitted(false);
      setScore(null);
      setPassed(false);
      setCertificateId(null);
    } catch {
      toast.error('Failed to regenerate quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Quiz not available</p>
      </div>
    );
  }

  // Results screen
  if (submitted && score !== null) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mb-8">
            <div
              className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {passed ? (
                <HiOutlineCheckCircle className="h-10 w-10 text-green-600" />
              ) : (
                <HiOutlineXCircle className="h-10 w-10 text-red-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {passed ? 'Congratulations!' : 'Keep Learning!'}
            </h2>
            <p className="text-gray-500 mb-4">
              You scored <span className="font-bold text-gray-900">{score}%</span>
              {passed ? ' - You passed!' : ' - You need 70% to pass.'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  passed ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {passed && certificateId && (
                <Link
                  to={`/certificate/${certificateId}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  <HiOutlineAcademicCap className="h-5 w-5" />
                  Get Certificate
                </Link>
              )}
              <button
                onClick={handleRetake}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <HiOutlineRefresh className="h-5 w-5" />
                Retake Quiz
              </button>
              <Link
                to={`/course/${id}`}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <HiOutlineArrowLeft className="h-5 w-5" />
                Back to Course
              </Link>
            </div>
          </div>

          {/* Answer Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Review Answers</h3>
            {quiz.questions.map((q, qIndex) => {
              const userAnswer = selectedAnswers[qIndex];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div
                  key={qIndex}
                  className={`bg-white rounded-xl border p-6 ${
                    isCorrect ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {isCorrect ? (
                      <HiOutlineCheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <HiOutlineXCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="font-medium text-gray-900">{q.question}</p>
                  </div>
                  <div className="ml-8 space-y-2 mb-3">
                    {q.options.map((opt, oIndex) => (
                      <div
                        key={oIndex}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          oIndex === q.correctAnswer
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : oIndex === userAnswer && !isCorrect
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p className="ml-8 text-sm text-gray-500 italic">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Quiz questions
  const question = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
            <span>
              {Math.round(((currentQuestion + 1) / quiz.questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{question.question}</h2>

          <div className="space-y-3 mb-8">
            {question.options.map((option, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleSelectAnswer(currentQuestion, oIndex)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                  selectedAnswers[currentQuestion] === oIndex
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      selectedAnswers[currentQuestion] === oIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {String.fromCharCode(65 + oIndex)}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <HiOutlineCheckCircle className="h-5 w-5" />
                )}
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion((prev) => prev + 1)}
                disabled={selectedAnswers[currentQuestion] === undefined}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
