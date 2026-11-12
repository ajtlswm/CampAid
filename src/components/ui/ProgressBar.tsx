interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ progress, size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${size === 'sm' ? 'h-2' : 'h-3'}`}>
      <div
        className="bg-forest h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
