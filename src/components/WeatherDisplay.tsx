import { useState, useEffect } from "react";

interface WeatherData {
  temp: number;
  description: string;
  weatherCode: number;
  high: number;
  low: number;
  lastUpdated: Date;
}

// Helper to determine if it's daytime
const isDaytime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20;
};

// Map weather codes to SVG filenames
const getWeatherIconPath = (weatherCode: number): string => {
  const timeOfDay = isDaytime() ? "day" : "night";
  
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

      <div className="absolute top-1/2 -translate-y-1/2 right-4 w-56 h-56 pointer-events-none" aria-hidden="true">
        <WeatherIcon weatherCode={weather.weatherCode} description={weather.description} />
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
