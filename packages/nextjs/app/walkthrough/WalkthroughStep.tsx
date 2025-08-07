import { ReactNode } from "react";

interface WalkthroughStepProps {
  title: string;
  header: string;
  description: string;
  children?: ReactNode;
  errorMessage?: string;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onFinish?: () => void;
}

export function WalkthroughStep({
  title,
  header,
  description,
  children,
  errorMessage,
  canProceed,
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onFinish,
}: WalkthroughStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
        <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">{header}</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">{description}</p>
      </div>

      {/* Interactions/Actions */}
      {children && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}

      {/* Error State */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">⚠️</div>
            <p className="text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onPrevious}
          disabled={isFirstStep}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isFirstStep
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          PREV
        </button>

        <button
          onClick={isLastStep && onFinish ? onFinish : onNext}
          disabled={!canProceed}
          className={`px-8 py-2 rounded-lg font-medium transition-all ${
            canProceed
              ? isLastStep
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          {isLastStep ? "🎉 START TRADING" : "NEXT"}
        </button>
      </div>
    </div>
  );
}
