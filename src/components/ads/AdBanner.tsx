export default function AdBanner() {
  return (
    <section className="bg-white rounded-xl p-2 shadow-2xs border border-gray-100 flex flex-col items-center">
      {/* 쿠팡 파트너스 다이나믹 배너 (300x70) */}
      <div className="w-full flex justify-center overflow-hidden">
        <iframe
          src="https://ads-partners.coupang.com/widgets.html?id=1051981&template=carousel&trackingCode=AF0610519&subId=&width=300&height=70&tsource="
          width="300"
          height="70"
          frameBorder="0"
          scrolling="no"
          referrerPolicy="unsafe-url"
          title="쿠팡 파트너스 배너"
        />
      </div>

      {/* 공정위 필수 표기 문구 */}
      <p className="text-[9px] text-gray-400 text-center mt-1.5 leading-tight">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </section>
  );
}
