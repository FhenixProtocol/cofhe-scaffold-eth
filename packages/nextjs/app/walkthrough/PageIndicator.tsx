interface PageIndicatorProps {
  totalSteps: number;
  currentStep: number;
  stepTitles: string[];
}

export function PageIndicator({ totalSteps, currentStep, stepTitles }: PageIndicatorProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step info */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-gray-600 dark:text-gray-400">{stepTitles[currentStep]}</span>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentStep
                ? "bg-blue-600 scale-110"
                : index < currentStep
                  ? "bg-blue-400"
                  : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
