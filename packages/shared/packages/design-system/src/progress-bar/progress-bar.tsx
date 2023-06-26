export function ProgressBar({
  percentage,
  className,
}: {
  percentage: number
  className?: string
}) {
  return (
    <div className={`w-full bg-gray-200 h-5 dark:bg-gray-700 ${className}`}>
      <div
        className={`bg-gray-600 h-5`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}
