import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineLightningBolt,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiOutlineClock,
} from 'react-icons/hi';
import api from '../../services/api';
import { Flashcard, FlashcardItem } from '../../types';

export default function FlashcardsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    fetchFlashcards();
  }, [courseId]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/flashcards/${courseId}`);
      setFlashcard(res.data.data || res.data);
    } catch {
      // No flashcards yet
      setFlashcard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.post(`/flashcards/generate/${courseId}`);
      setFlashcard(res.data.data || res.data);
      setCurrentIndex(0);
      setFlipped(false);
      toast.success('Flashcards generated successfully!');
    } catch {
      toast.error('Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const handleRate = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!flashcard || rating) return;
    try {
      setRating(true);
      const correct = difficulty !== 'hard';
      const res = await api.put(`/flashcards/${courseId}/${currentIndex}`, {
        correct,
        difficulty,
      });
      setFlashcard(res.data.data || res.data);
      toast.success(
        difficulty === 'easy'
          ? 'Great job!'
          : difficulty === 'medium'
          ? 'Good, keep practicing!'
          : 'Added for more review'
      );
      // Auto advance after rating
      if (currentIndex < flashcard.cards.length - 1) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setFlipped(false);
        }, 400);
      } else {
        setTimeout(() => {
          setFlipped(false);
        }, 400);
      }
    } catch {
      toast.error('Failed to update card');
    } finally {
      setRating(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setFlipped(false);
    }
  };

  const handleNext = () => {
    if (flashcard && currentIndex < flashcard.cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setFlipped(false);
    }
  };

  const stats = useMemo(() => {
    if (!flashcard || !flashcard.cards) return { total: 0, mastered: 0, learning: 0, newCards: 0, dueForReview: 0 };
    const now = new Date();
    const cards = Array.isArray(flashcard.cards) ? flashcard.cards : [];
    const mastered = cards.filter((c: FlashcardItem) => c.correctCount > 3).length;
    const learning = cards.filter(
      (c: FlashcardItem) => c.correctCount > 0 && c.correctCount <= 3
    ).length;
    const newCards = cards.filter(
      (c: FlashcardItem) => c.correctCount === 0 && c.incorrectCount === 0
    ).length;
    const dueForReview = cards.filter(
      (c: FlashcardItem) => c.nextReview && new Date(c.nextReview) <= now
    ).length;
    return { total: cards.length, mastered, learning, newCards, dueForReview };
  }, [flashcard]);

  const isDueForReview = (card: FlashcardItem): boolean => {
    if (!card.nextReview) return false;
    return new Date(card.nextReview) <= new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  // Empty state - no flashcards generated yet
  if (!flashcard || !flashcard.cards || !Array.isArray(flashcard.cards) || flashcard.cards.length === 0) {
    return (
      <div className="min-h-screen bg-base py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            to={`/course/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-prose mb-8 transition-colors"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>
          <div className="bg-surface rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <HiOutlineLightningBolt className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Flashcards Yet</h2>
            <p className="text-muted mb-8 max-w-md mx-auto">
              Generate flashcards from your course content to boost your memory with spaced
              repetition learning.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-glow transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Generating Flashcards...
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="h-5 w-5" />
                  Generate Flashcards
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcard.cards[currentIndex];
  const cardIsDue = isDueForReview(currentCard);

  return (
    <div className="min-h-screen bg-base py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/course/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-prose transition-colors"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-prose transition-colors disabled:opacity-50"
          >
            <HiOutlineRefresh className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-muted">Total</p>
          </div>
          <div className="bg-surface rounded-lg border border-green-200 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.mastered}</p>
            <p className="text-xs text-muted">Mastered</p>
          </div>
          <div className="bg-surface rounded-lg border border-yellow-200 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.learning}</p>
            <p className="text-xs text-muted">Learning</p>
          </div>
          <div className="bg-surface rounded-lg border border-blue-200 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.newCards}</p>
            <p className="text-xs text-muted">New</p>
          </div>
        </div>

        {/* Due for Review Indicator */}
        {stats.dueForReview > 0 && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <HiOutlineClock className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>{stats.dueForReview}</strong> card{stats.dueForReview !== 1 ? 's' : ''} due
              for review
            </span>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center justify-between text-sm text-muted mb-4">
          <span>
            Card {currentIndex + 1} of {flashcard.cards.length}
          </span>
          {cardIsDue && (
            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
              <HiOutlineClock className="h-3.5 w-3.5" />
              Due for review
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-border rounded-full h-2 mb-6">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / flashcard.cards.length) * 100}%`,
            }}
          />
        </div>

        {/* Flashcard */}
        <div
          className="perspective-1000 mb-6 cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => setFlipped((prev) => !prev)}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '280px',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-surface rounded-2xl shadow-lg border border-border p-8 flex flex-col items-center justify-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">
                  Question
                </span>
                {currentCard.correctCount > 3 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <HiOutlineAcademicCap className="h-3 w-3" />
                    Mastered
                  </span>
                )}
              </div>
              <p className="text-xl font-semibold text-white text-center leading-relaxed">
                {currentCard.front}
              </p>
              <p className="text-sm text-muted mt-6">Click to reveal answer</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-surface rounded-2xl shadow-lg border border-border p-8 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <span className="text-xs font-medium text-muted uppercase tracking-wide mb-4">
                Answer
              </span>
              <p className="text-xl font-semibold text-white text-center leading-relaxed">
                {currentCard.back}
              </p>
              <p className="text-sm text-muted mt-6">Rate your recall below</p>
            </div>
          </div>
        </div>

        {/* Difficulty Buttons (shown after flip) */}
        {flipped && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRate('hard');
              }}
              disabled={rating}
              className="flex-1 max-w-[140px] px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Hard
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRate('medium');
              }}
              disabled={rating}
              className="flex-1 max-w-[140px] px-4 py-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50"
            >
              Medium
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRate('easy');
              }}
              disabled={rating}
              className="flex-1 max-w-[140px] px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              Easy
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-prose hover:bg-surface rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <HiOutlineChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === flashcard.cards.length - 1}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-prose hover:bg-surface rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <HiOutlineChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
