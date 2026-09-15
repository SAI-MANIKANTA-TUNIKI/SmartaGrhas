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
    main?: string;
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
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
};

// Animation variants for cards
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Animation for weather particles
const particleVariants: Variants = {
  animate: {
    y: [0, 10, 0],
    x: [0, 5, 0],
    opacity: [0.3, 0.7, 0.3],
    transition: {
      duration: 5,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
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
        params: {
          q: cityName,
          appid: API_KEY,
          units: 'metric',
        },
      });

      const weatherData: WeatherData = weatherRes.data;
      setWeather(weatherData);

      const forecastRes = await axios.get(`${API_URL_FORECAST}`, {
        params: {
          q: cityName,
          appid: API_KEY,
          units: 'metric',
          cnt: 40,
        },
      });

      setForecast(forecastRes.data.list);

      const aqiRes = await axios.get(`${API_URL}/air_pollution`, {
        params: {
          lat: weatherData.coord.lat,
          lon: weatherData.coord.lon,
          appid: API_KEY,
        },
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
              params: {
                lat: coords.latitude,
                lon: coords.longitude,
                appid: API_KEY,
                units: 'metric',
              },
            });

            const weatherData: WeatherData = weatherRes.data;
            setWeather(weatherData);

            const forecastRes = await axios.get(`${API_URL_FORECAST}`, {
              params: {
                lat: coords.latitude,
                lon: coords.longitude,
                appid: API_KEY,
                units: 'metric',
                cnt: 40,
              },
            });

            setForecast(forecastRes.data.list);

            const aqiRes = await axios.get(`${API_URL}/air_pollution`, {
              params: {
                lat: coords.latitude,
                lon: coords.longitude,
                appid: API_KEY,
              },
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

    if (city) {
      fetchWeatherData(city);
    }
  };

  useEffect(() => {
    getLocationWeather();
  }, []);

  const chartData = {
    labels: forecast.map((f) =>
      new Date(f.dt * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
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

  // Determine weather condition
  const getWeatherCondition = () => {
    if (!weather) return 'clear-day';

    const condition = weather.weather[0].main?.toLowerCase() || '';

    if (condition.includes('thunder')) return 'thunder';
    if (condition.includes('drizzle')) return 'drizzle';
    if (condition.includes('rain')) return 'rain';
    if (condition.includes('snow')) return 'snow';
    if (
      condition.includes('mist') ||
      condition.includes('fog') ||
      condition.includes('haze')
    ) {
      return 'mist';
    }
    if (condition.includes('cloud')) return 'cloudy';

    if (condition.includes('clear')) {
      const hour = new Date(weather.dt * 1000).getHours();

      return hour >= 6 && hour < 18
        ? 'clear-day'
        : 'clear-night';
    }

    return 'clear-day';
  };

  if (loading) {
    return (
      <div
        className={
          darkMode ? styles.darkContainer : styles.lightContainer
        }
      >
        <div className={styles.container}>
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonBlock} />
            <div className={`${styles.skeletonBlock} ${styles.tall}`} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          darkMode ? styles.darkContainer : styles.lightContainer
        }
      >
        <div className={styles.container}>
          <div className={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  const weatherCondition = getWeatherCondition();

  return (
    <motion.div
      className={
        darkMode ? styles.darkContainer : styles.lightContainer
      }
      data-condition={weatherCondition}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Atmospheric effects */}
      <div className={styles.atmosphere} aria-hidden="true">
        {weatherCondition === 'rain' ||
        weatherCondition === 'drizzle' ||
        weatherCondition === 'thunder'
          ? Array.from({ length: 24 }).map((_, index) => (
              <span
                key={`drop-${index}`}
                className={styles.drop}
                style={{
                  left: `${(index * 17) % 100}%`,
                  animation: `dropFall ${
                    0.9 + (index % 5) * 0.25
                  }s linear infinite`,
                  animationDelay: `${(index % 8) * -0.35}s`,
                }}
              />
            ))
          : null}

        {weatherCondition === 'snow'
          ? Array.from({ length: 30 }).map((_, index) => (
              <span
                key={`flake-${index}`}
                className={styles.flake}
                style={{
                  left: `${(index * 13) % 100}%`,
                  animation: `flakeFall ${
                    5 + (index % 6)
                  }s linear infinite`,
                  animationDelay: `${(index % 10) * -0.7}s`,
                }}
              />
            ))
          : null}

        {weatherCondition === 'clear-day' && (
          <div className={styles.sunGlow} />
        )}

        {weatherCondition === 'cloudy' && (
          <>
            <div
              className={styles.cloudBand}
              style={{
                top: '10%',
                left: '-10%',
                animation:
                  'cloudDrift 14s ease-in-out infinite alternate',
              }}
            />
            <div
              className={styles.cloudBand}
              style={{
                top: '25%',
                right: '-15%',
                animation:
                  'cloudDrift 18s ease-in-out infinite alternate-reverse',
              }}
            />
          </>
        )}
      </div>

      <div className={styles.container}>
        {/* Page Header */}
        <motion.header
          className={styles.header}
          variants={cardVariants}
        >
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              Weather Dashboard
            </h1>

            <p className={styles.subtitle}>
              Get the latest weather updates
            </p>
          </div>
        </motion.header>

        {/* Search */}
        <motion.form
          onSubmit={handleSearch}
          className={styles.searchBar}
          variants={containerVariants}
        >
          <motion.input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search city..."
            className={styles.searchInput}
            whileFocus={{ scale: 1.01 }}
          />

          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.searchButton}
          >
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
          <>
            {/* Hero Weather */}
            <motion.section
              className={styles.hero}
              variants={cardVariants}
            >
              <div className={styles.heroLeft}>
                <p className={styles.heroLocation}>
                  <span className={styles.heroLocationPin}>
                    ●
                  </span>
                  {weather.name}
                </p>

                <h2 className={styles.heroTemp}>
                  {Math.round(weather.main.temp)}
                  <span className={styles.heroTempUnit}>°C</span>
                </h2>

                <p className={styles.heroCondition}>
                  {weather.weather[0].description}
                </p>

                <div className={styles.heroMeta}>
                  <span className={styles.heroMetaItem}>
                    Updated:
                    <span className={styles.heroMetaValue}>
                      {new Date(
                        weather.dt * 1000
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>

                  <span className={styles.heroMetaItem}>
                    Feels like:
                    <span className={styles.heroMetaValue}>
                      {Math.round(weather.main.feels_like)}°C
                    </span>
                  </span>
                </div>
              </div>

              <div className={styles.heroRight}>
                <div className={styles.heroIconWrap}>
                  <div className={styles.heroIconGlow} />

                  <motion.img
                    src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                    alt={weather.weather[0].description}
                    className={styles.heroIcon}
                    animate={{
                      y: [0, -5, 0],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                    }}
                  />
                </div>
              </div>
            </motion.section>

            {/* Weather Details */}
            <motion.section
              className={styles.details}
              variants={containerVariants}
            >
              {[
                {
                  label: 'Feels Like',
                  value: `${Math.round(
                    weather.main.feels_like
                  )}°C`,
                  sub: 'Apparent temperature',
                },
                {
                  label: 'Humidity',
                  value: `${weather.main.humidity}%`,
                  sub: 'Relative humidity',
                },
                {
                  label: 'Wind',
                  value: `${weather.wind.speed} km/h`,
                  sub: 'Current wind speed',
                },
                {
                  label: 'Pressure',
                  value: `${weather.main.pressure} hPa`,
                  sub: 'Atmospheric pressure',
                },
                {
                  label: 'Rain',
                  value: weather.rain?.['1h']
                    ? `${Math.round(
                        weather.rain['1h'] * 100
                      )}%`
                    : 'Low',
                  sub: 'Last 1 hour',
                },
                {
                  label: 'Air Quality',
                  value: `${aqi.list[0].main.aqi}`,
                  sub: getAQICategory(
                    aqi.list[0].main.aqi
                  ),
                },
              ].map((item, index) => {
                const aqiValue =
                  aqi.list[0].main.aqi;

                let aqiClass = '';

                if (item.label === 'Air Quality') {
                  if (aqiValue <= 50) {
                    aqiClass = styles.aqiGood;
                  } else if (aqiValue <= 100) {
                    aqiClass = styles.aqiModerate;
                  } else {
                    aqiClass = styles.aqiBad;
                  }
                }

                return (
                  <motion.div
                    key={index}
                    className={styles.detail}
                    variants={cardVariants}
                  >
                    <span className={styles.detailLabel}>
                      {item.label}
                    </span>

                    <div className={styles.detailValue}>
                      {item.value}
                    </div>

                    {item.label === 'Air Quality' ? (
                      <span
                        className={`${styles.aqiChip} ${aqiClass}`}
                      >
                        {item.sub}
                      </span>
                    ) : (
                      <span className={styles.detailSub}>
                        {item.sub}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </motion.section>

            {/* Weekly Forecast */}
            <motion.section
              className={styles.weekSection}
              variants={cardVariants}
            >
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  This Week
                </h2>

                <span className={styles.sectionMeta}>
                  5 day forecast
                </span>
              </div>

              <motion.div
                className={styles.weekScroll}
                drag="x"
                dragConstraints={{
                  left: -250,
                  right: 0,
                }}
              >
                {/* Today */}
                <motion.div
                  className={`${styles.dayCard} ${styles.dayCardToday}`}
                  variants={cardVariants}
                >
                  <span className={styles.dayName}>
                    Today
                  </span>

                  <img
                    src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                    alt={weather.weather[0].description}
                    className={styles.dayIcon}
                  />

                  <span className={styles.dayTemp}>
                    {Math.round(weather.main.temp)}°
                  </span>

                  <span className={styles.dayTempLow}>
                    Now
                  </span>
                </motion.div>

                {forecast
                  .filter((_, index) => index % 8 === 0)
                  .slice(0, 8)
                  .map((day, index) => (
                    <motion.div
                      key={index}
                      className={styles.dayCard}
                      variants={cardVariants}
                    >
                      <span className={styles.dayName}>
                        {new Date(
                          day.dt * 1000
                        ).toLocaleDateString('en-US', {
                          weekday: 'short',
                        })}
                      </span>

                      <img
                        src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                        alt={day.weather[0].description}
                        className={styles.dayIcon}
                      />

                      <span className={styles.dayTemp}>
                        {Math.round(day.main.temp)}°
                      </span>

                      <span className={styles.dayTempLow}>
                        {new Date(
                          day.dt * 1000
                        ).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </motion.div>
                  ))}
              </motion.div>
            </motion.section>

            {/* Temperature Chart */}
            <motion.section
              className={styles.chartSection}
              variants={cardVariants}
            >
              <div className={styles.sectionHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>
                    Temperature Trend
                  </h3>

                  <span className={styles.sectionMeta}>
                    Forecast temperature
                  </span>
                </div>
              </div>

              <div className={styles.chartBody}>
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                      },
                      title: {
                        display: false,
                      },
                    },
                  }}
                />
              </div>
            </motion.section>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Weather;
