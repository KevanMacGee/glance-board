import { useState, useEffect } from "react";

interface WeatherData {
  temp: number;
  description: string;
  high: number;
  low: number;
  lastUpdated: Date;
}

// Weather icon component based on condition
const WeatherIcon = ({ description }: { description: string }) => {
  const desc = description.toLowerCase();
  
  if (desc.includes("clear") || desc.includes("sunny")) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="12" className="fill-amber-400" />
        <g className="stroke-amber-400" strokeWidth="3" fill="none">
          <line x1="32" y1="6" x2="32" y2="14" />
          <line x1="32" y1="50" x2="32" y2="58" />
          <line x1="13.7" y1="13.7" x2="19.4" y2="19.4" />
          <line x1="44.6" y1="44.6" x2="50.3" y2="50.3" />
          <line x1="6" y1="32" x2="14" y2="32" />
          <line x1="50" y1="32" x2="58" y2="32" />
          <line x1="13.7" y1="50.3" x2="19.4" y2="44.6" />
          <line x1="44.6" y1="19.4" x2="50.3" y2="13.7" />
        </g>
      </svg>
    );
  }
  
  if (desc.includes("partly") || desc.includes("few clouds") || desc.includes("mainly clear")) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="20" cy="22" r="10" className="fill-amber-400" />
        <path d="M48 52H22a12 12 0 01-2.2-23.8A16 16 0 0152 34a10 10 0 01-4 18z" className="fill-slate-300" />
      </svg>
    );
  }
  
  if (desc.includes("cloud") || desc.includes("overcast")) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full fill-slate-400">
        <path d="M50 50H18a14 14 0 01-2.5-27.8A18 18 0 0154 30a12 12 0 01-4 20z" />
      </svg>
    );
  }
  
  if (desc.includes("rain") || desc.includes("drizzle")) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <path d="M48 40H20a12 12 0 01-2.2-23.8A16 16 0 0150 24a10 10 0 01-2 16z" className="fill-slate-400" />
        <g className="fill-blue-400">
          <ellipse cx="24" cy="50" rx="2" ry="4" />
          <ellipse cx="34" cy="54" rx="2" ry="4" />
          <ellipse cx="44" cy="48" rx="2" ry="4" />
        </g>
      </svg>
    );
  }
  
  if (desc.includes("snow")) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <path d="M48 40H20a12 12 0 01-2.2-23.8A16 16 0 0150 24a10 10 0 01-2 16z" className="fill-slate-400" />
        <g className="fill-white">
          <circle cx="24" cy="50" r="3" />
          <circle cx="34" cy="54" r="3" />
          <circle cx="44" cy="48" r="3" />
        </g>
      </svg>
    );
  }
  
  if (desc.includes("fog") || desc.includes("mist")) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full fill-slate-400">
        <path d="M48 36H20a10 10 0 01-2-19.8A14 14 0 0150 22a8 8 0 01-2 14z" />
        <rect x="12" y="42" width="40" height="3" rx="1.5" opacity="0.6" />
        <rect x="16" y="50" width="32" height="3" rx="1.5" opacity="0.4" />
      </svg>
    );
  }
  
  // Default - partly cloudy
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle cx="20" cy="22" r="10" className="fill-amber-400" />
      <path d="M48 52H22a12 12 0 01-2.2-23.8A16 16 0 0152 34a10 10 0 01-4 18z" className="fill-slate-300" />
    </svg>
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

      <div className="absolute top-1/2 -translate-y-1/2 right-4 w-56 h-56 pointer-events-none" aria-hidden="true">
        <WeatherIcon description={weather.description} />
      </div>

      <div className="flex flex-col gap-4 min-w-0 justify-center flex-1 relative z-10">
        <div className="flex items-baseline gap-4 flex-wrap">
          <div className="gb-temp" aria-label="Current temperature">
            {weather.temp}°
          </div>
          <div className="gb-weather-desc">{weather.description}</div>
        </div>
        <div className="gb-weather-hl" aria-label="High and low">
          <span>High {weather.high}°</span>
          <span>Low {weather.low}°</span>
        </div>
      </div>

      <div className="gb-note mt-3 flex items-center justify-between relative z-10">
        <span>Rochester, NY</span>
        <span>Updated {formatLastUpdated()}</span>
      </div>
    </div>
  );
};

export default WeatherDisplay;
