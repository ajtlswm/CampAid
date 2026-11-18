import { useState, useEffect, useMemo } from 'react';
import type { SeasonTag } from '../types';
import { estimateCampingClimate } from '../data/campsitePresets';

export interface CampingWeatherResult {
  season: SeasonTag;
  seasonLabel: string;
  minTemp: number;
  maxTemp?: number;
  weatherIcon: string;
  weatherDesc: string;
  isRealtime: boolean;
}

// 메모리 캐시로 동일 좌표/날짜 재호출 방지
const forecastCache = new Map<
  string,
  {
    time: string[];
    minTemps: number[];
    maxTemps: number[];
    codes: number[];
  }
>();

function wmoCodeToWeather(
  code: number,
  minTemp: number
): { icon: string; desc: string } {
  if (code >= 71 && code <= 86) {
    return { icon: '🌨️', desc: '눈 예보' };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: '🌧️', desc: '비 예보' };
  }
  if (code >= 95) {
    return { icon: '⛈️', desc: '뇌우 예보' };
  }
  if (code === 45 || code === 48) {
    return { icon: '🌫️', desc: '안개' };
  }
  if (code === 2 || code === 3) {
    return { icon: minTemp < 0 ? '🥶' : '⛅', desc: '구름많음' };
  }
  return { icon: minTemp < 0 ? '🥶' : '☀️', desc: '맑음' };
}

/**
 * 선택한 날짜(targetDate)와 캠핑장 위경도(lat, lng)를 기준으로
 * Open-Meteo 실시간 기상 예보(최대 16일)를 조회하고,
 * 예보 범위 밖(16일 이후)이거나 오프라인일 때는 월별·위도별 추정 기온으로 폴백합니다.
 */
export function useCampingWeather(
  targetDate?: string,
  lat = 37.5665,
  lng = 126.978
): CampingWeatherResult {
  const effectiveDate = useMemo(
    () => (targetDate && targetDate.trim() ? targetDate.trim() : new Date().toISOString().slice(0, 10)),
    [targetDate]
  );

  const fallback = useMemo(
    () => estimateCampingClimate(effectiveDate, lat),
    [effectiveDate, lat]
  );

  const [realtimeData, setRealtimeData] = useState<{
    forKey: string;
    minTemp: number;
    maxTemp: number;
    icon: string;
    desc: string;
  } | null>(null);

  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const stateKey = `${cacheKey}_${effectiveDate}`;

  useEffect(() => {
    let cancelled = false;

    function applyFromDaily(daily: {
      time: string[];
      minTemps: number[];
      maxTemps: number[];
      codes: number[];
    }) {
      const idx = daily.time.indexOf(effectiveDate);
      if (idx === -1) {
        setRealtimeData(null);
        return;
      }
      const minT = Math.round(daily.minTemps[idx]);
      const maxT = Math.round(daily.maxTemps[idx]);
      const code = daily.codes[idx] ?? 0;
      const { icon, desc } = wmoCodeToWeather(code, minT);
      setRealtimeData({
        forKey: stateKey,
        minTemp: minT,
        maxTemp: maxT,
        icon,
        desc,
      });
    }

    const cached = forecastCache.get(cacheKey);
    if (cached) {
      applyFromDaily(cached);
      return;
    }

    async function fetchForecast() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
          4
        )}&longitude=${lng.toFixed(
          4
        )}&daily=temperature_2m_min,temperature_2m_max,weather_code&timezone=Asia%2FSeoul&forecast_days=16`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return;
        const json = await res.json();
        const daily = json?.daily;
        if (
          !cancelled &&
          daily &&
          Array.isArray(daily.time) &&
          Array.isArray(daily.temperature_2m_min)
        ) {
          const entry = {
            time: daily.time as string[],
            minTemps: daily.temperature_2m_min as number[],
            maxTemps: (daily.temperature_2m_max as number[]) || [],
            codes: (daily.weather_code as number[]) || [],
          };
          forecastCache.set(cacheKey, entry);
          applyFromDaily(entry);
        }
      } catch {
        // 오프라인 또는 예보 조회 실패 시 추정치 유지
      }
    }

    fetchForecast();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, stateKey, effectiveDate, lat, lng]);

  if (realtimeData && realtimeData.forKey === stateKey) {
    return {
      season: fallback.season,
      seasonLabel: fallback.seasonLabel,
      minTemp: realtimeData.minTemp,
      maxTemp: realtimeData.maxTemp,
      weatherIcon: realtimeData.icon,
      weatherDesc: realtimeData.desc,
      isRealtime: true,
    };
  }

  return {
    season: fallback.season,
    seasonLabel: fallback.seasonLabel,
    minTemp: fallback.minTemp,
    weatherIcon: fallback.weatherIcon,
    weatherDesc: '평년 기온 기준',
    isRealtime: false,
  };
}
