import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import styles from '../pagesmodulecss/weather.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* --------------------------------------------------------------
   Types
   -------------------------------------------------------------- */
interface WeatherData {
  name: string;
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{ description: string; main: string; icon: string }>;
  wind: { speed: number };
  rain?: { '1h'?: number };
  coord: { lat: number; lon: number };
}

interface ForecastItem {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ description: string; main: string; icon: string }>;
}

interface AQIData {
  list: Array<{ main: { aqi: number } }>;
}

interface WeatherProps {
  darkMode: boolean;
}

type ConditionKey =
  | 'clear-day'
  | 'clear-night'
  | 'cloudy'
  | 'rain'
  | 'drizzle'
  | 'thunder'
  | 'snow'
  | 'mist';

/* --------------------------------------------------------------
   Constants
   -------------------------------------------------------------- */
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* Map OpenWeather condition → our accent key */
const conditionKey = (main: string, icon: string): ConditionKey => {
  const m = main.toLowerCase();
  const isNight = icon.endsWith('n');
  if (m.includes('thunder')) return 'thunder';
  if (m.includes('drizzle')) return 'drizzle';
  if (m.includes('rain')) return 'rain';
  if (m.includes('snow')) return 'snow';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return 'mist';
  if (m.includes('cloud')) return 'cloudy';
  if (m.includes('clear')) return isNight ? 'clear-night' : 'clear-day';
  return 'cloudy';
};

/* Iconify weather icon names, tinted via CSS var */
const weatherIconName = (main: string, icon: string) => {
  const m = main.toLowerCase();
  const isNight = icon.endsWith('n');
  if (m.includes('thunder')) return 'mdi:weather-lightning-rainy';
  if (m.includes('drizzle')) return 'mdi:weather-partly-rainy';
  if (m.includes('rain')) return 'mdi:weather-rainy';
  if (m.includes('snow')) return 'mdi:weather-snowy';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze'))
    return 'mdi:weather-fog';
  if (m.includes('cloud')) return 'mdi:weather-cloudy';
  if (m.includes('clear'))
    return isNight ? 'mdi:weather-night' : 'mdi:weather-sunny';
  return 'mdi:weather-cloudy';
};

/* Variants */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/* --------------------------------------------------------------
   Animated count-up
   -------------------------------------------------------------- */
const AnimatedNumber: React.FC<{ value: number; suffix?: string }> = ({
  value,
  suffix = '',
}) => {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 90, damping: 22 });
  const text = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, mv]);

  return <motion.span>{text}</motion.span>;
};

/* --------------------------------------------------------------
   Atmosphere — pure CSS, driven by condition
   -------------------------------------------------------------- */
const Atmosphere: React.FC<{ condition: ConditionKey }> = ({ condition }) => {
  const drops = useMemo(
    () =>
      Array.from({ length: 32 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 1.2 + Math.random() * 0.9,
      })),
    []
  );
  const flakes = useMemo(
    () =>
      Array.from({ length: 24 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 6 + Math.random() * 4,
      })),
    []
  );
  const bands = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        top: 5 + i * 25,
        delay: i * 1.5,
        duration: 22 + i * 6,
      })),
    []
  );

  if (condition === 'rain' || condition === 'drizzle' || condition === 'thunder') {
    return (
      <div className={styles.atmosphere} aria-hidden="true">
        {drops.map((d, i) => (
          <span
            key={i}
            className={styles.drop}
            style={{
              left: `${d.left}%`,
              animation: `dropFall ${d.duration}s linear ${d.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (condition === 'snow') {
    return (
      <div className={styles.atmosphere} aria-hidden="true">
        {flakes.map((f, i) => (
          <span
            key={i}
            className={styles.flake}
            style={{
              left: `${f.left}%`,
              animation: `flakeFall ${f.duration}s linear ${f.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (condition === 'clear-day') {
    return (
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.sunGlow} />
      </div>
    );
  }

  if (condition === 'cloudy' || condition === 'mist') {
    return (
      <div className={styles.atmosphere} aria-hidden="true">
        {bands.map((b, i) => (
          <div
            key={i}
            className={styles.cloudBand}
            style={{
              top: `${b.top}%`,
              animation: `cloudDrift ${b.duration}s ease-in-out ${b.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

/* ==============================================================
   Page
   ============================================================== */
const Weather: React.FC<WeatherProps> = ({ darkMode }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [aqi, setAQI] = useState<AQIData | null>(null);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL;
  const API_URL_FORECAST = import.meta.env.VITE_API_URL_FORECAST;

  const abortRef = useRef<AbortController | null>(null);

  /* ---- Unified fetcher ---- */
  const fetchAll = async (params: Record<string, any>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const weatherRes = await axios.get(`${API_URL}/weather`, {
        params: { ...params, appid: API_KEY, units: 'metric' },
        signal: controller.signal,
      });
      const weatherData: WeatherData = weatherRes.data;
      setWeather(weatherData);

      const [forecastRes, aqiRes] = await Promise.all([
        axios.get(API_URL_FORECAST, {
          params: {
            ...params,
            appid: API_KEY,
            units: 'metric',
            cnt: 40,
          },
          signal: controller.signal,
        }),
        axios.get(`${API_URL}/air_pollution`, {
          params: {
            lat: weatherData.coord.lat,
            lon: weatherData.coord.lon,
            appid: API_KEY,
          },
          signal: controller.signal,
        }),
      ]);

      setForecast(forecastRes.data.list);
      setAQI(aqiRes.data);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Could not fetch weather for that location.');
      }
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  };

  const fetchByCity = (name: string) => fetchAll({ q: name });

  const fetchByCoords = (lat: number, lon: number) => fetchAll({ lat, lon });

  const getLocationWeather = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchByCoords(coords.latitude, coords.longitude),
      () => setError('Geolocation permission denied.')
    );
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = city.trim();
    if (q) fetchByCity(q);
  };

  useEffect(() => {
    getLocationWeather();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Derived ---- */
  const condition: ConditionKey = weather
    ? conditionKey(weather.weather[0].main, weather.weather[0].icon)
    : 'cloudy';

  const heroIcon = weather
    ? weatherIconName(weather.weather[0].main, weather.weather[0].icon)
    : 'mdi:weather-cloudy';

  const aqiValue = aqi?.list?.[0]?.main?.aqi ?? null;

  const aqiCategory = (v: number) => {
    if (v <= 1) return 'Good';
    if (v <= 2) return 'Fair';
    if (v <= 3) return 'Moderate';
    if (v <= 4) return 'Poor';
    return 'Very Poor';
  };

  const aqiClass = (v: number) => {
    if (v <= 2) return styles.aqiGood;
    if (v <= 3) return styles.aqiModerate;
    return styles.aqiBad;
  };

  /* ---- Chart ---- */
  const chartData = useMemo(
    () => ({
      labels: forecast.map((f) =>
        new Date(f.dt * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      ),
      datasets: [
        {
          label: 'Temperature',
          data: forecast.map((f) => f.main.temp),
          borderColor:
            getComputedStyle(document.documentElement).getPropertyValue(
              '--weather'
            ) || '#d97706',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: 'currentColor',
          pointHoverBorderWidth: 2,
          tension: 0.4,
          fill: false,
        },
      ],
    }),
    [forecast]
  );

  const chartOptions = useMemo(() => {
    const isDark = darkMode;
    const grid = isDark
      ? 'rgba(240, 237, 231, 0.06)'
      : 'rgba(23, 22, 20, 0.06)';
    const axis = isDark ? '#7d7871' : '#8a8681';
    const ink = isDark ? '#f0ede7' : '#0e0e0c';

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1a1917' : '#ffffff',
          borderColor: grid,
          borderWidth: 1,
          titleColor: axis,
          bodyColor: ink,
          padding: 10,
          titleFont: { family: 'JetBrains Mono', size: 10, weight: '500' as const },
          bodyFont: { family: 'JetBrains Mono', size: 12, weight: '500' as const },
          displayColors: false,
          callbacks: {
            label: (ctx: any) => `${Math.round(ctx.parsed.y)}°C`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: grid },
          ticks: {
            color: axis,
            font: { family: 'JetBrains Mono', size: 10 },
            maxRotation: 0,
            autoSkipPadding: 20,
          },
        },
        y: {
          grid: { color: grid, drawTicks: false },
          border: { display: false },
          ticks: {
            color: axis,
            font: { family: 'JetBrains Mono', size: 10 },
            padding: 8,
            callback: (v: any) => `${Math.round(v)}°`,
          },
        },
      },
    };
  }, [darkMode]);

  /* Weekly — pick one per day */
  const week = useMemo(() => {
    const seen = new Set<string>();
    const out: ForecastItem[] = [];
    forecast.forEach((f) => {
      const key = new Date(f.dt * 1000).toDateString();
      if (!seen.has(key) && out.length < 8) {
        seen.add(key);
        out.push(f);
      }
    });
    return out;
  }, [forecast]);

  return (
    <div
      className={darkMode ? styles.darkContainer : styles.lightContainer}
      data-condition={condition}
    >
      <Atmosphere condition={condition} />

      <div className={styles.container}>
        {/* ---------------- Header ---------------- */}
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Weather</h1>
            <p className={styles.subtitle}>
              {weather
                ? `${weather.name} · ${new Date(weather.dt * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Awaiting location'}
            </p>
          </div>
        </motion.header>

        {/* ---------------- Search ---------------- */}
        <motion.form
          onSubmit={handleSearch}
          className={styles.searchBar}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE_OUT }}
        >
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search a city…"
            className={styles.searchInput}
            aria-label="Search city"
          />
          <motion.button
            type="submit"
            className={styles.searchButton}
            whileTap={{ scale: 0.97 }}
          >
            Search
          </motion.button>
          <motion.button
            type="button"
            onClick={getLocationWeather}
            className={styles.locationButton}
            whileTap={{ scale: 0.97 }}
          >
            Use my location
          </motion.button>
        </motion.form>

        {/* ---------------- Error ---------------- */}
        <AnimatePresence>
          {error && (
            <motion.div
              className={styles.error}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------- Content ---------------- */}
        <AnimatePresence mode="wait">
          {loading && !hydrated ? (
            <motion.div
              key="skeleton"
              className={styles.skeletonWrap}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className={styles.skeletonBlock} />
              <div className={styles.skeletonBlock} />
              <div className={`${styles.skeletonBlock} ${styles.tall}`} />
            </motion.div>
          ) : weather && aqi ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* -------- Hero -------- */}
              <motion.section
                className={styles.hero}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.heroLeft}>
                  <span className={styles.heroLocation}>
                    <svg
                      className={styles.heroLocationPin}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {weather.name}
                  </span>

                  <p className={styles.heroTemp}>
                    <AnimatedNumber value={Math.round(weather.main.temp)} />
                    <span className={styles.heroTempUnit}>°C</span>
                  </p>

                  <p className={styles.heroCondition}>
                    {weather.weather[0].description}
                  </p>

                  <div className={styles.heroMeta}>
                    <span className={styles.heroMetaItem}>
                      Feels like
                      <span className={styles.heroMetaValue}>
                        {Math.round(weather.main.feels_like)}°
                      </span>
                    </span>
                    <span className={styles.heroMetaItem}>
                      H
                      <span className={styles.heroMetaValue}>
                        {Math.round(weather.main.temp)}°
                      </span>
                    </span>
                  </div>
                </div>

                <div className={styles.heroRight}>
                  <div className={styles.heroIconWrap}>
                    <motion.div
                      className={styles.heroIconGlow}
                      animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.9, 0.6] }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <motion.img
                      src={`https://api.iconify.design/${heroIcon}.svg?color=${encodeURIComponent(
                        'currentColor'
                      )}`}
                      alt={weather.weather[0].description}
                      className={styles.heroIcon}
                      style={{ color: 'var(--weather)' }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
                      transition={{
                        opacity: { duration: 0.6 },
                        scale: { duration: 0.6, ease: EASE_OUT },
                        y: {
                          duration: 5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        },
                      }}
                    />
                  </div>
                </div>
              </motion.section>

              {/* -------- Details -------- */}
              <motion.section
                className={styles.details}
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {[
                  {
                    label: 'Humidity',
                    value: `${weather.main.humidity}%`,
                  },
                  {
                    label: 'Wind',
                    value: `${weather.wind.speed.toFixed(1)} km/h`,
                  },
                  {
                    label: 'Pressure',
                    value: `${weather.main.pressure} hPa`,
                  },
                  {
                    label: 'Rain (1h)',
                    value: weather.rain?.['1h']
                      ? `${weather.rain['1h'].toFixed(1)} mm`
                      : 'None',
                  },
                  {
                    label: 'Air quality',
                    value: aqiValue !== null ? `${aqiValue} · ${aqiCategory(aqiValue)}` : '—',
                    chip:
                      aqiValue !== null ? (
                        <span
                          className={`${styles.aqiChip} ${aqiClass(aqiValue)}`}
                        >
                          {aqiCategory(aqiValue)}
                        </span>
                      ) : null,
                  },
                  {
                    label: 'Coordinates',
                    value: `${weather.coord.lat.toFixed(2)}, ${weather.coord.lon.toFixed(2)}`,
                  },
                ].map((d) => (
                  <motion.div
                    key={d.label}
                    className={styles.detail}
                    variants={fadeUp}
                  >
                    <span className={styles.detailLabel}>{d.label}</span>
                    <span className={styles.detailValue}>
                      {d.chip ? d.chip : d.value}
                    </span>
                  </motion.div>
                ))}
              </motion.section>

              {/* -------- Week -------- */}
              {week.length > 0 && (
                <motion.section
                  className={styles.weekSection}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Next days</h2>
                    <span className={styles.sectionMeta}>
                      {week.length} day forecast
                    </span>
                  </div>

                  <motion.div
                    className={styles.weekScroll}
                    drag="x"
                    dragConstraints={{ left: -400, right: 0 }}
                    dragElastic={0.08}
                  >
                    {week.map((day, i) => {
                      const isToday = i === 0;
                      const icon = weatherIconName(
                        day.weather[0].main,
                        day.weather[0].icon
                      );
                      return (
                        <motion.div
                          key={day.dt}
                          className={`${styles.dayCard} ${
                            isToday ? styles.dayCardToday : ''
                          }`}
                          variants={fadeUp}
                          whileHover={{ y: -2 }}
                        >
                          <span className={styles.dayName}>
                            {isToday
                              ? 'Today'
                              : new Date(day.dt * 1000).toLocaleDateString(
                                  'en-US',
                                  { weekday: 'short' }
                                )}
                          </span>
                          <img
                            className={styles.dayIcon}
                            src={`https://api.iconify.design/${icon}.svg?color=${encodeURIComponent(
                              'currentColor'
                            )}`}
                            alt={day.weather[0].description}
                            style={{ color: 'var(--weather)' }}
                          />
                          <span className={styles.dayTemp}>
                            {Math.round(day.main.temp_max)}°
                          </span>
                          <span className={styles.dayTempLow}>
                            {Math.round(day.main.temp_min)}°
                          </span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.section>
              )}

              {/* -------- Trend -------- */}
              <motion.section
                className={styles.chartSection}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Temperature trend</h2>
                  <span className={styles.sectionMeta}>5-day · 3-hourly</span>
                </div>
                <div className={styles.chartBody}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Weather;
