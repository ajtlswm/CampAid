import { useEffect } from 'react';

interface ToastProps {
  visible: boolean;
  onDismiss: () => void;
  onNavigateToMap: () => void;
}

export default function Toast({ visible, onDismiss, onNavigateToMap }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-gray-900/95 backdrop-blur text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 pointer-events-auto border border-white/10">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-xl shrink-0">🔥</span>
          <p className="leading-snug font-medium">
            동계 난방 준비 완료! 가는 길 최저가 등유 주유소를 확인해 볼까요?
          </p>
        </div>
        <button
          onClick={() => {
            onDismiss();
            onNavigateToMap();
          }}
          className="shrink-0 bg-aid-red hover:bg-aid-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          등유 지도 보기
        </button>
      </div>
    </div>
  );
}
