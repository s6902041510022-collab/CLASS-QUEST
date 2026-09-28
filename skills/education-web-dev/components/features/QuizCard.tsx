'use client';

import { useState } from 'react';
import { Quiz, Question } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface QuizCardProps {
  quiz: Quiz;
  onComplete?: (score: number, total: number) => void;
}

export default function QuizCard({ quiz, onComplete }: QuizCardProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const question: Question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  const handleAnswer = () => {
    if (selectedAnswer === null) return;

    setShowResult(true);
    if (selectedAnswer === question.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
      onComplete?.(score, quiz.questions.length);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= quiz.passingScore;

    return (
      <Card variant="elevated" className="text-center py-8">
        <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">
          {passed ? 'ยอดเยี่ยม!' : 'ลองอีกครั้ง'}
        </h3>
        <p className="text-text-secondary mb-4">
          คุณตอบถูก {score} จาก {quiz.questions.length} ข้อ ({percentage}%)
        </p>
        <p className="text-sm text-text-tertiary mb-6">
          {passed
            ? 'คุณผ่านเกณฑ์การสอบแล้ว'
            : `ต้องการอย่างน้อย ${quiz.passingScore}% เพื่อผ่านการสอบ`}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleRetry}>
            ทำอีกครั้ง
          </Button>
          {passed && <Button>ถัดไป</Button>}
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-text-primary">{quiz.title}</h3>
          <p className="text-sm text-text-secondary">
            ข้อ {currentQuestion + 1} จาก {quiz.questions.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-primary-600">
            {Math.round(progress)}%
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-text-primary mb-4">
          {question.text}
        </h4>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctAnswer;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => !showResult && setSelectedAnswer(index)}
                disabled={showResult}
                className={cn(
                  'w-full p-4 rounded-lg border-2 text-left transition-all',
                  showCorrect
                    ? 'border-accent-500 bg-accent-50'
                    : showWrong
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-border-light hover:border-primary-300 hover:bg-primary-50/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium',
                      showCorrect
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : showWrong
                        ? 'border-red-500 bg-red-500 text-white'
                        : isSelected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-neutral-300'
                    )}
                  >
                    {showCorrect ? '✓' : showWrong ? '✗' : String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-text-primary">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      {showResult && question.explanation && (
        <div className="p-4 rounded-lg bg-secondary-50 border border-secondary-200 mb-6">
          <p className="text-sm font-medium text-secondary-700 mb-1">คำอธิบาย</p>
          <p className="text-sm text-secondary-600">{question.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!showResult ? (
          <Button onClick={handleAnswer} disabled={selectedAnswer === null}>
            ตอบ
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentQuestion < quiz.questions.length - 1 ? 'ถัดไป' : 'ดูผลลัพธ์'}
          </Button>
        )}
      </div>
    </Card>
  );
}
