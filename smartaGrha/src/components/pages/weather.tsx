// src/Components/pages/weather.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { motion, type Variants } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import styles from '../pagesmodulecss/weather.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface WeatherData {
  name: string; dt: number;
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  weather: Array<{ [x: string]: any; description: string; icon: string }>;
  wind: { speed: number };
  rain?: { '1h'?: number };
  coord: { lat: number; lon: number };
}
interface ForecastItem { dt: number; main: { temp: number }; weather: Array<{ description: string; icon: string }>; }
interface AQIData { list: Array<{ main: { aqi: number } }>; }

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

interface WeatherProps { darkMode: boolean; }

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
    setLoading(true); setError(null);
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

  useEffect(() => { getLocationWeather(); }, []);

  const chartData = {
    labels: forecast.map((f) =>
      new Date(f.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Temperature',
        data: forecast.map((f) => f.main.temp),
        borderColor: darkMode ? '#e07856' : '#c96442',
        backgroundColor: darkMode ? 'rgba(224, 120, 86, 0.14)' : 'rgba(201, 100, 66, 0.12)',
        borderWidth: 1.6,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: darkMode ? '#e07856' : '#c96442',
        pointHoverBorderColor: '#fff',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: darkMode ? '#1a1917' : '#0e0e0c',
        titleColor: '#f0ede7', bodyColor: '#f0ede7',
        borderColor: darkMode ? '#3a3733' : '#26241f', borderWidth: 1,
        padding: 10, cornerRadius: 8,
        titleFont: { family: 'Inter', size: 11, weight: 600 as const },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: darkMode ? '#7d7871' : '#8a8681',
          font: { family: 'JetBrains Mono', size: 10 },
          maxRotation: 0, autoSkipPadding: 20,
        },
      },
      y: {
        grid: { color: darkMode ? 'rgba(240, 237, 231, 0.06)' : 'rgba(23, 22, 20, 0.06)', drawTicks: false },
        border: { display: false },
        ticks: {
          color: darkMode ? '#7d7871' : '#8a8681',
          font: { family: 'JetBrains Mono', size: 10 },
          padding: 8,
        },
      },
    },
  } as const;

  const getAQICategory = (value: number) => {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy';
    if (value <= 200) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const getWeatherCondition = () => {
    if (!weather) return 'clear';
    const c = weather.weather[0].main.toLowerCase();
    if (c.includes('cloud')) return 'cloud';
    if (c.includes('rain')) return 'rain';
    if (c.includes('snow')) return 'snow';
    if (c.includes('clear')) {
      const hour = new Date(weather.dt * 1000).getHours();
      return hour >= 6 && hour < 18 ? 'clear' : 'night';
    }
    return 'clear';
  };

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''}`} data-cond={getWeatherCondition()}>
      {/* ---------- Top bar ---------- */}
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>Environmental</p>
          <h1 className={styles.title}>Weather</h1>
        </div>

        <form onSubmit={handleSearch} className={styles.searchBar}>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City name"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} aria-label="Search">
            Search
          </button>
          <button type="button" onClick={getLocationWeather} className={styles.locBtn}>
            <img
              src={`https://api.iconify.design/mdi:crosshairs-gps.svg?color=${darkMode ? '%23f0ede7' : '%230e0e0c'}`}
              alt="" width={14} height={14}
            />
            Locate
          </button>
        </form>
      </header>

      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} aria-hidden />
          Fetching readings…
        </div>
      )}

      {error && !loading && (
        <motion.div
          className={styles.errorBanner}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {weather && aqi && !loading && (
        <motion.div
          className={styles.stack}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* ---------- Primary reading ---------- */}
          <motion.section className={styles.primary} variants={fadeUp}>
            <div className={styles.primaryLeft}>
              <p className={styles.loc}>{weather.name}</p>
              <p className={styles.time}>
                {new Date(weather.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {'  ·  '}
                {new Date(weather.dt * 1000).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>

              <div className={styles.tempRow}>
                <span className={styles.tempValue}>{Math.round(weather.main.temp)}</span>
                <span className={styles.tempUnit}>°C</span>
              </div>

              <p className={styles.condition}>{weather.weather[0].description}</p>
            </div>

            <div className={styles.primaryRight}>
              <motion.img
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                alt={weather.weather[0].description}
                className={styles.heroIcon}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.section>

          {/* ---------- Readings strip ---------- */}
          <motion.section className={styles.readings} variants={fadeUp}>
            {[
              { label: 'Feels like', value: `${Math.round(weather.main.feels_like)}`, unit: '°C' },
              { label: 'Humidity',   value: `${weather.main.humidity}`, unit: '%' },
              { label: 'Wind',       value: `${weather.wind.speed.toFixed(1)}`, unit: 'm/s' },
              { label: 'Pressure',   value: `${weather.main.pressure}`, unit: 'hPa' },
              { label: 'Rain 1h',    value: weather.rain?.['1h'] ? `${weather.rain['1h'].toFixed(1)}` : '—', unit: 'mm' },
              { label: 'Air quality', value: `${aqi.list[0].main.aqi}`, unit: getAQICategory(aqi.list[0].main.aqi) },
            ].map((r) => (
              <div key={r.label} className={styles.reading}>
                <span className={styles.readingLabel}>{r.label}</span>
                <span className={styles.readingValue}>
                  {r.value}
                  <span className={styles.readingUnit}>{r.unit}</span>
                </span>
              </div>
            ))}
          </motion.section>

          {/* ---------- Forecast ---------- */}
          <motion.section className={styles.forecast} variants={fadeUp}>
            <header className={styles.sectionHead}>
              <h2>Next 5 days</h2>
              <span className={styles.monoHint}>3-hour intervals</span>
            </header>

            <div className={styles.forecastRow}>
              <div className={`${styles.dayCard} ${styles.today}`}>
                <span className={styles.dayName}>Today</span>
                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                  alt=""
                  className={styles.dayIcon}
                />
                <span className={styles.dayTemp}>{Math.round(weather.main.temp)}°</span>
              </div>

              {forecast
                .filter((_, i) => i % 8 === 0)
                .slice(0, 6)
                .map((day, i) => (
                  <div key={i} className={styles.dayCard}>
                    <span className={styles.dayName}>
                      {new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <img
                      src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                      alt={day.weather[0].description}
                      className={styles.dayIcon}
                    />
                    <span className={styles.dayTemp}>{Math.round(day.main.temp)}°</span>
                  </div>
                ))}
            </div>
          </motion.section>

          {/* ---------- Trend chart ---------- */}
          <motion.section className={styles.chartCard} variants={fadeUp}>
            <header className={styles.sectionHead}>
              <h2>Temperature trend</h2>
              <span className={styles.monoHint}>40-point forecast</span>
            </header>
            <div className={styles.chartWrap}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </motion.section>
        </motion.div>
      )}
    </div>
  );
};

export default Weather;
