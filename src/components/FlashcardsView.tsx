import React, { useState } from 'react';
import { useStore } from '../store';
import { BookText, CheckCircle, HelpCircle, XCircle, Play, ArrowLeft, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatTime, cn } from '../lib/utils';
import { Flashcard } from '../types';

export default function FlashcardsView() {
  const flashcards = useStore(state => state.flashcards);
  const updateProgress = useStore(state => state.updateFlashcardProgress);
  const setView = useStore(state => state.setView);
  const videos = useStore(state => state.videos);

  const [activeMode, setActiveMode] = useState<'list' | 'study'>('list');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Filter cards due today
  const dueCards = flashcards.filter(c => c.nextReviewDate <= Date.now()).sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  
  const handleScore = (score: number) => {
    const card = dueCards[currentCardIndex];
    if (card) {
      updateProgress(card.id, score);
    }
    
    // Go to next card
    setIsFlipped(false);
    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setActiveMode('list');
      setCurrentCardIndex(0);
    }
  };

  if (activeMode === 'study' && dueCards.length > 0) {
    const card = dueCards[currentCardIndex];
    const sourceVideo = card.sourceVideoId ? videos.find(v => v.id === card.sourceVideoId) : null;
    
    return (
      <div className="flex flex-col h-full bg-slate-900 text-white items-center justify-center p-8">
        <div className="absolute top-8 left-8 flex items-center gap-4">
          <button 
            onClick={() => setActiveMode('list')}
            className="p-3 hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-xl font-bold font-mono">
            {currentCardIndex + 1} / {dueCards.length}
          </div>
        </div>

        <div 
          onClick={() => setIsFlipped(true)}
          className={cn(
            "w-full max-w-3xl aspect-[4/3] sm:aspect-video rounded-3xl cursor-pointer transition-all duration-500 shadow-2xl relative",
            isFlipped ? "bg-indigo-600" : "bg-slate-800 hover:bg-slate-700"
          )}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
            {isFlipped ? (
              <>
                <div className="text-sm font-bold tracking-widest text-indigo-300 uppercase mb-8">Answer</div>
                <div className="prose prose-invert prose-2xl">
                  <ReactMarkdown>{card.back}</ReactMarkdown>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-8">Question</div>
                <div className="prose prose-invert prose-2xl">
                  <ReactMarkdown>{card.front}</ReactMarkdown>
                </div>
                <div className="absolute bottom-8 opacity-50 text-sm animate-pulse">
                  Click to reveal answer
                </div>
              </>
            )}
          </div>
        </div>

        {sourceVideo && isFlipped && card.sourceTimestampMs !== undefined && (
          <button 
            onClick={() => setView({ type: 'player', videoId: sourceVideo.id, courseId: sourceVideo.courseId })}
            className="mt-8 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 bg-slate-800 px-6 py-3 rounded-full transition-colors"
          >
            <Play className="w-5 h-5" />
            Watch Source ({formatTime(card.sourceTimestampMs)})
          </button>
        )}

        <div className={cn(
          "flex gap-4 mt-12 transition-all duration-300",
          isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          <button onClick={() => handleScore(1)} className="px-8 py-4 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl font-bold text-lg transition-colors flex items-center flex-col gap-2">
            <XCircle className="w-8 h-8" />
            Hard (Again)
          </button>
          <button onClick={() => handleScore(3)} className="px-8 py-4 bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white rounded-2xl font-bold text-lg transition-colors flex items-center flex-col gap-2">
            <HelpCircle className="w-8 h-8" />
            Good
          </button>
          <button onClick={() => handleScore(5)} className="px-8 py-4 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl font-bold text-lg transition-colors flex items-center flex-col gap-2">
            <CheckCircle className="w-8 h-8" />
            Easy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-12">
        <h1 className="text-3xl font-bold mb-4 flex items-center">
          <BookText className="w-8 h-8 mr-3 text-indigo-500" />
          Active Recall Space
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Master your concepts with spaced repetition flashcards generated from your lectures.
        </p>
      </header>

      {flashcards.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-16 text-center">
          <BrainCircuit className="w-24 h-24 text-indigo-200 dark:text-indigo-900 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">No Flashcards Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            Go to any video player, open the AI tab, and ask the assistant to generate flashcards from your notes or transcript.
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-indigo-600 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-200 dark:shadow-none mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Daily Review</h2>
              <p className="text-indigo-200 text-lg">
                You have <strong className="text-white">{dueCards.length}</strong> cards to review today.
              </p>
            </div>
            <button 
              disabled={dueCards.length === 0}
              onClick={() => {
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setActiveMode('study');
              }}
              className="mt-6 md:mt-0 px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-50 flex items-center"
            >
              <Play className="w-6 h-6 mr-2" />
              Start Session
            </button>
          </div>

          <h3 className="text-xl font-bold mb-6">All Cards ({flashcards.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashcards.map(card => {
              const due = card.nextReviewDate <= Date.now();
              return (
                <div key={card.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                      "text-xs font-bold px-3 py-1 rounded-full",
                      due ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    )}>
                      {due ? "Due Review" : `Next: ${new Date(card.nextReviewDate).toLocaleDateString()}`}
                    </span>
                    <span className="text-xs text-slate-400">Streak: {card.repetitionCount}</span>
                  </div>
                  <div className="prose dark:prose-invert text-sm line-clamp-3 font-medium mb-4">
                    <ReactMarkdown>{card.front}</ReactMarkdown>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4 prose dark:prose-invert text-sm line-clamp-3 text-slate-500 dark:text-slate-400">
                    <ReactMarkdown>{card.back}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
