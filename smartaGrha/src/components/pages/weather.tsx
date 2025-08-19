import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { motion, type Variants } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from '../pagesmodulecss/weather.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Define interfaces for API responses
interface WeatherData {
  name: string;
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    [x: string]: any;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  rain?: {
    '1h'?: number;
  };
  coord: {
    lat: number;
    lon: number;
  };
}

interface ForecastItem {
  dt: number;
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
}

interface AQIData {
  list: Array<{
    main: {
      aqi: number;
    };
  }>;
}

// Animation variants for container
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.1 } },
};

// Animation variants for cards
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Animation for weather particles
const particleVariants: Variants = {
  animate: {
    y: [0, 10, 0],
    x: [0, 5, 0],
    opacity: [0.3, 0.7, 0.3],
    transition: { duration: 5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
  },
};

interface WeatherProps {
  darkMode: boolean;
}

const Weather: React.FC<WeatherProps> = ({ darkMode }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [aqi, setAQI] = useState<AQIData | null>(null);
  const [city, setCity] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;
  const API_URL_FORECAST = import.meta.env.VITE_API_URL_FORECAST;

  const fetchWeatherData = async (cityName: string) => {
    setLoading(true);
    setError(null);
    try {
      const weatherRes = await axios.get(`${API_URL}/weather`, {
        params: { q: cityName, appid: API_KEY, units: 'metric' },
      });
      const weatherData: WeatherData = weatherRes.data;
      setWeather(weatherData);

      const forecastRes = await axios.get(`${API_URL_FORECAST}`, {
        params: { q: cityName, appid: API_KEY, units: 'metric', cnt: 40 },
      });
      setForecast(forecastRes.data.list);

      const aqiRes = await axios.get(`${API_URL}/air_pollution`, {
        params: { lat: weatherData.coord.lat, lon: weatherData.coord.lon, appid: API_KEY },
      });
      setAQI(aqiRes.data);
    } catch {
      setError('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLocationWeather = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const weatherRes = await axios.get(`${API_URL}/weather`, {
              params: { lat: coords.latitude, lon: coords.longitude, appid: API_KEY, units: 'metric' },
            });
            const weatherData: WeatherData = weatherRes.data;
            setWeather(weatherData);

            const forecastRes = await axios.get(`${API_URL_FORECAST}`, {
              params: { lat: coords.latitude, lon: coords.longitude, appid: API_KEY, units: 'metric', cnt: 40 },
            });
            setForecast(forecastRes.data.list);

            const aqiRes = await axios.get(`${API_URL}/air_pollution`, {
              params: { lat: coords.latitude, lon: coords.longitude, appid: API_KEY },
            });
            setAQI(aqiRes.data);
          } catch {
            setError('Unable to fetch location data.');
          }
        },
        () => setError('Geolocation permission denied.')
      );
    } else {
      setError('Geolocation not supported by your browser.');
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (city) fetchWeatherData(city);
  };

  useEffect(() => {
    getLocationWeather();
  }, []);

  const chartData = {
    labels: forecast.map((f) =>
      new Date(f.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: forecast.map((f) => f.main.temp),
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.3)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const getAQICategory = (value: number) => {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy for Sensitive Groups';
    if (value <= 200) return 'Unhealthy';
    if (value <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Determine background class based on weather condition
  const getWeatherBackgroundClass = () => {
    if (!weather) return styles.sunny;
    const condition = weather.weather[0].main.toLowerCase();
    if (condition.includes('cloud')) return styles.cloudy;
    if (condition.includes('rain')) return styles.rainy;
    if (condition.includes('snow')) return styles.snowy;
    if (condition.includes('clear')) {
      const hour = new Date(weather.dt * 1000).getHours();
      return hour >= 6 && hour < 18 ? styles.sunny : styles.night;
    }
    return styles.sunny;
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <motion.div
      className={`${darkMode ? styles.dark : styles.light} ${getWeatherBackgroundClass()}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
    <div className={styles.frostedGlass}>
      {/* Animated Weather Particles */}
      <div className={styles.particleContainer}>
        {Array.from({ length: 10 }).map((_, index) => (
          <motion.span
            key={index}
            className={styles.particle}
            variants={particleVariants}
            animate="animate"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
          >
            {[ '🌈', '🌊', '💦', '🌦', '🌧', '⛈', '🌤', '🌪', '🌥', '⛅', '🌬', '💨', '🌫', '💭', '☃', '⛄', '🏔', '🍂', '🌞', '☁', '💧', '❄', '🌙', '💫', '🌈', '🍁'][Math.floor(Math.random() * 6)]}
          </motion.span>
        ))}
      </div>

      <motion.h1 className={styles.title} variants={cardVariants}>
        Weather Dashboard
      </motion.h1>
      <motion.p className={styles.subtitle} variants={cardVariants}>
        Get the latest weather updates
      </motion.p>

      <motion.form onSubmit={handleSearch} className={styles.searchBar} variants={containerVariants}>
        <motion.input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Search city..."
          className={styles.searchInput}
          whileFocus={{ scale: 1.05 }}
        />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={styles.searchButton}>
          Search
        </motion.button>
        <motion.button
          type="button"
          onClick={getLocationWeather}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={styles.locationButton}
        >
          📍 My Location
        </motion.button>
      </motion.form>

      {weather && aqi && (
        <div>
          <motion.div className={styles.header} variants={cardVariants}>
            <h1>{weather.name}</h1>
            <p>{new Date(weather.dt * 1000).toLocaleTimeString()}</p>
          </motion.div>

          <motion.div className={styles.mainWeather} variants={cardVariants}>
            <div className={styles.temp}>
              <h2>{Math.round(weather.main.temp)}°C</h2>
              <p>{weather.weather[0].description}</p>
            </div>
            <motion.img
              src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
              alt={weather.weather[0].description}
              className={styles.weatherIcon}
              animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>

          <motion.div className={styles.chartContainer} variants={cardVariants}>
            <h3>Temperature Trend</h3>
            <p>Weather Dashboard</p>
            <Line data={chartData} />
          </motion.div>

          <motion.div className={styles.weatherDetails} variants={containerVariants}>
            {[
              { label: 'Feels Like', value: `${Math.round(weather.main.feels_like)}°C`, icon: '🌡️' },
              { label: 'Humidity', value: `${weather.main.humidity}%`, icon: '💧' },
              { label: 'Wind', value: `${weather.wind.speed} km/h`, icon: '💨' },
              { label: 'Pressure', value: `${weather.main.pressure} hPa`, icon: '📈' },
              {
                label: 'Rain Chance',
                value: weather.rain?.['1h'] ? `${Math.round(weather.rain['1h'] * 100)}%` : 'Low',
                icon: '🌧️',
              },
              {
                label: 'AQI',
                value: `${aqi.list[0].main.aqi} (${getAQICategory(aqi.list[0].main.aqi)})`,
                icon: '🌍',
              },
            ].map((item, index) => (
              <motion.div key={index} className={styles.card} variants={cardVariants}>
                {item.icon} <h3>{item.label}</h3>
                <p>{item.value}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className={styles.weeklyForecast} variants={cardVariants}>
            <h2>This Week</h2>
            <motion.div className={styles.forecastGridHorizontal} drag="x" dragConstraints={{ left: -200, right: 0 }}>
              <div className={styles.dayCard}>
                <h4>Today</h4>
                <p>Now: {Math.round(weather.main.temp)}°</p>
              </div>
              {forecast
                .filter((_, index) => index % 8 === 0)
                .slice(0, 6)
                .map((day, index) => (
                  <motion.div key={index} className={styles.dayCard} variants={cardVariants}>
                    <h4>
                      {new Date(day.dt * 1000).toLocaleDateString('en-US', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </h4>
                    <p>{Math.round(day.main.temp)}°</p>
                    <img
                      src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                      alt={day.weather[0].description}
                      className={styles.weatherIcon}
                    />
                  </motion.div>
                ))}
            </motion.div>
          </motion.div>
        </div>
      )}
    </div>  
    </motion.div>
  );
};

export default Weather;