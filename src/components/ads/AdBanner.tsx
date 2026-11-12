import { useState, useEffect } from 'react';

const CAMPING_TIPS = [
  '💡 동계 캠핑 시 텐트 상·하단 벤틸레이션을 반드시 열어 일산화탄소 중독을 예방하세요!',
  '⛽ 실내등유는 주유건 두께가 다른 경우가 있어요. 난로 전용 자바라 급유기를 챙기면 안전합니다.',
  '🥶 영하 날씨에는 부탄가스 대신 이소가스(프로판 혼합)를 사용해야 화력이 유지됩니다.',
  '🔋 겨울철 스마트폰과 보조배터리는 침낭 안에 넣고 자면 방전을 막을 수 있어요.',
];

export default function AdBanner() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % CAMPING_TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface border border-gray-200/80 rounded-2xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-forest bg-forest/10 px-2 py-0.5 rounded-full">
          CampAid Tip · AD
        </span>
        <span className="text-[10px] text-gray-400">
          {idx + 1} / {CAMPING_TIPS.length}
        </span>
      </div>
      <p className="text-xs text-gray-700 font-medium leading-relaxed">
        {CAMPING_TIPS[idx]}
      </p>
    </div>
  );
}
