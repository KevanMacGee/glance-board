import { useState, useEffect } from "react";

interface WeatherData {
  temp: number;
  description: string;
  weatherCode: number;
  high: number;
  low: number;
  lastUpdated: Date;
}

// =============================================================================
// Seasonal Day/Night Phase Helpers
// Based on Rochester, NY sunrise/sunset times throughout the year
// =============================================================================

interface SeasonalSchedule {
  dayStartMinutes: number;   // Minutes since midnight when DAY begins
  nightStartMinutes: number; // Minutes since midnight when NIGHT begins
}

// Seasonal schedule lookup table
// Active by month: Dec+Jan→Dec, Feb+Mar→Feb, Apr+May→Apr, Jun+Jul→Jun, Aug+Sep→Aug, Oct+Nov→Oct
const SEASONAL_SCHEDULES: Record<number, SeasonalSchedule> = {
  // Dec row (Dec + Jan): dayStart 07:26, nightStart 16:36
  12: { dayStartMinutes: 7 * 60 + 26, nightStartMinutes: 16 * 60 + 36 },
  1:  { dayStartMinutes: 7 * 60 + 26, nightStartMinutes: 16 * 60 + 36 },
  // Feb row (Feb + Mar): dayStart 07:25, nightStart 17:22
  2:  { dayStartMinutes: 7 * 60 + 25, nightStartMinutes: 17 * 60 + 22 },
  3:  { dayStartMinutes: 7 * 60 + 25, nightStartMinutes: 17 * 60 + 22 },
  // Apr row (Apr + May): dayStart 06:53, nightStart 19:37
  4:  { dayStartMinutes: 6 * 60 + 53, nightStartMinutes: 19 * 60 + 37 },
  5:  { dayStartMinutes: 6 * 60 + 53, nightStartMinutes: 19 * 60 + 37 },
  // Jun row (Jun + Jul): dayStart 05:32, nightStart 20:46
  6:  { dayStartMinutes: 5 * 60 + 32, nightStartMinutes: 20 * 60 + 46 },
  7:  { dayStartMinutes: 5 * 60 + 32, nightStartMinutes: 20 * 60 + 46 },
  // Aug row (Aug + Sep): dayStart 06:01, nightStart 20:33
  8:  { dayStartMinutes: 6 * 60 + 1,  nightStartMinutes: 20 * 60 + 33 },
  9:  { dayStartMinutes: 6 * 60 + 1,  nightStartMinutes: 20 * 60 + 33 },
  // Oct row (Oct + Nov): dayStart 07:10, nightStart 18:53
  10: { dayStartMinutes: 7 * 60 + 10, nightStartMinutes: 18 * 60 + 53 },
  11: { dayStartMinutes: 7 * 60 + 10, nightStartMinutes: 18 * 60 + 53 },
};

/**
 * Get minutes since midnight for a local Date
 * Uses LOCAL time (getHours/getMinutes), NOT UTC
 */
const minutesSinceMidnightLocal = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

/**
 * Get the seasonal schedule for a given local date
 * Month is 1-indexed (1=Jan, 12=Dec) from getMonth()+1
 */
const getSeasonalSchedule = (nowLocal: Date): SeasonalSchedule => {
  const month = nowLocal.getMonth() + 1; // getMonth() is 0-indexed
  return SEASONAL_SCHEDULES[month];
};

/**
 * Determine if it's currently night based on local time and seasonal schedule
 * DAY = between dayStart (inclusive) and nightStart (exclusive)
 * NIGHT = otherwise
 */
const isNightLocal = (nowLocal: Date): boolean => {
  const schedule = getSeasonalSchedule(nowLocal);
  const currentMinutes = minutesSinceMidnightLocal(nowLocal);
  
  // DAY if currentMinutes >= dayStart AND currentMinutes < nightStart
  const isDay = currentMinutes >= schedule.dayStartMinutes && currentMinutes < schedule.nightStartMinutes;
  return !isDay;
};

/**
 * Get the current phase ("day" or "night") for icon selection
 */
const getPhase = (): "day" | "night" => {
  const now = new Date();
  return isNightLocal(now) ? "night" : "day";
};

// Dev verification (can be removed in production)
if (typeof window !== "undefined" && (window as unknown as { __DEV_VERIFY_PHASE__?: boolean }).__DEV_VERIFY_PHASE__) {
  // Test: January 18 at 6:00pm local → should be NIGHT (Dec schedule: night starts 16:36)
  const janEvening = new Date(2026, 0, 18, 18, 0); // Jan 18, 6pm
  console.log("Jan 6pm NIGHT?", isNightLocal(janEvening)); // Expected: true
  
  // Test: June 15 at 8:30pm local → should be DAY (Jun schedule: night starts 20:46)
  const junEvening = new Date(2026, 5, 15, 20, 30); // Jun 15, 8:30pm
  console.log("Jun 8:30pm DAY?", !isNightLocal(junEvening)); // Expected: true
  
  // Test: October 15 at 7:00pm local → should be NIGHT (Oct schedule: night starts 18:53)
  const octEvening = new Date(2026, 9, 15, 19, 0); // Oct 15, 7pm
  console.log("Oct 7pm NIGHT?", isNightLocal(octEvening)); // Expected: true
}

// Map weather codes to SVG filenames
const getWeatherIconPath = (weatherCode: number): string => {
  const timeOfDay = getPhase();
  
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  switch (weatherCode) {
    // Clear sky
    case 0:
      return `clear-${timeOfDay}.svg`;
    
    // Mainly clear
    case 1:
      return `partly-cloudy-${timeOfDay}.svg`;
    
    // Partly cloudy
    case 2:
      return `partly-cloudy-${timeOfDay}.svg`;
    
    // Overcast
    case 3:
      return `overcast-${timeOfDay}.svg`;
    
    // Fog and depositing rime fog
    case 45:
    case 48:
      return `fog-${timeOfDay}.svg`;
    
    // Drizzle: Light, moderate, and dense intensity
    case 51:
    case 53:
    case 55:
      return `partly-cloudy-${timeOfDay}-drizzle.svg`;
    
    // Freezing Drizzle: Light and dense intensity
    case 56:
    case 57:
      return "sleet.svg";
    
    // Rain: Slight, moderate and heavy intensity
    case 61:
      return `partly-cloudy-${timeOfDay}-rain.svg`;
    case 63:
    case 65:
      return "rain.svg";
    
    // Freezing Rain: Light and heavy intensity
    case 66:
    case 67:
      return "sleet.svg";
    
    // Snow fall: Slight, moderate, and heavy intensity
    case 71:
      return `partly-cloudy-${timeOfDay}-snow.svg`;
    case 73:
    case 75:
      return "snow.svg";
    
    // Snow grains
    case 77:
      return "snow.svg";
    
    // Rain showers: Slight, moderate, and violent
    case 80:
      return `partly-cloudy-${timeOfDay}-rain.svg`;
    case 81:
    case 82:
      return "rain.svg";
    
    // Snow showers slight and heavy
    case 85:
    case 86:
      return "snow.svg";
    
    // Thunderstorm: Slight or moderate
    case 95:
      return `thunderstorms-${timeOfDay}.svg`;
    
    // Thunderstorm with slight and heavy hail
    case 96:
    case 99:
      return `thunderstorms-${timeOfDay}-rain.svg`;
    
    // Default fallback
    default:
      return `partly-cloudy-${timeOfDay}.svg`;
  }
};

// Weather icon component using external SVGs
const WeatherIcon = ({ weatherCode, description }: { weatherCode: number; description: string }) => {
  const iconPath = getWeatherIconPath(weatherCode);
  
  return (
    <img 
      src={`/weather-icons/${iconPath}`}
      alt={description}
      className="w-full h-full"
    />
  );
};

const WEATHER_CACHE_KEY = "glance-board-weather";
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const loadCachedWeather = (): WeatherData | null => {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      return {
        ...data,
        lastUpdated: new Date(data.lastUpdated),
      };
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

const saveCachedWeather = (data: WeatherData) => {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
};

const WeatherDisplay = () => {
  const [weather, setWeather] = useState<WeatherData>(() => {
    const cached = loadCachedWeather();
    return cached || {
      temp: 28,
      description: "Partly cloudy",
      weatherCode: 2,
      high: 33,
      low: 21,
      lastUpdated: new Date(),
    };
  });
  const [isInitialLoad, setIsInitialLoad] = useState(() => !loadCachedWeather());

  const fetchWeather = async (isBackground = false) => {
    try {
      // Default to Rochester, NY coordinates
      const lat = 43.1566;
      const lon = -77.6088;
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`
      );
      
      if (response.ok) {
        const data = await response.json();
        const weatherCodes: Record<number, string> = {
          0: "Clear sky",
          1: "Mainly clear",
          2: "Partly cloudy",
          3: "Overcast",
          45: "Foggy",
          48: "Depositing rime fog",
          51: "Light drizzle",
          53: "Moderate drizzle",
          55: "Dense drizzle",
          61: "Slight rain",
          63: "Moderate rain",
          65: "Heavy rain",
          71: "Slight snow",
          73: "Moderate snow",
          75: "Heavy snow",
          95: "Thunderstorm",
        };
        
        const description = weatherCodes[data.current.weather_code] || "Partly cloudy";
        
        const newWeather = {
          temp: Math.round(data.current.temperature_2m),
          description,
          weatherCode: data.current.weather_code,
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          lastUpdated: new Date(),
        };
        
        setWeather(newWeather);
        saveCachedWeather(newWeather);
      }
    } catch (error) {
      console.error("Failed to fetch weather:", error);
      // Keep cached data on error
    } finally {
      if (!isBackground) {
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    // Check if cache is fresh enough
    const cached = loadCachedWeather();
    const now = Date.now();
    const cacheAge = cached ? now - cached.lastUpdated.getTime() : Infinity;
    
    // Only fetch if cache is stale (older than 10 minutes)
    if (cacheAge > CACHE_DURATION) {
      fetchWeather(!!cached); // Background fetch if we have cached data
    } else {
      setIsInitialLoad(false);
    }
    
    // Refresh every 10 minutes
    const interval = setInterval(() => fetchWeather(true), CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const formatLastUpdated = () => {
    return weather.lastUpdated.toLocaleTimeString([], { 
      hour: "numeric", 
      minute: "2-digit" 
    });
  };

  return (
    <div className="gb-section flex-1 flex flex-col relative overflow-hidden">
      <div className="gb-kicker relative z-10">
        <span>Weather</span>
        {isInitialLoad && <span className="gb-pill animate-pulse-soft">Loading...</span>}
      </div>

      <div className="absolute top-1/2 -translate-y-1/2 right-4 w-[268px] h-[268px] pointer-events-none" aria-hidden="true">
        <WeatherIcon weatherCode={weather.weatherCode} description={weather.description} />
      </div>

      <div className="flex flex-col gap-4 min-w-0 justify-center flex-1 relative z-10">
        <div className="gb-temp" aria-label="Current temperature">
          {weather.temp}°
        </div>
        <div className="gb-weather-hl" aria-label="High and low">
          <span>High {weather.high}°</span>
          <span>Low {weather.low}°</span>
        </div>
        <div className="gb-weather-desc">{weather.description}</div>
      </div>

      <div className="gb-note mt-3 flex items-center justify-between relative z-10">
        <span>Rochester, NY</span>
        <span>Updated {formatLastUpdated()}</span>
      </div>
    </div>
  );
};

export default WeatherDisplay;
