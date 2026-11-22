
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");

const suggestionsBox = document.getElementById("suggestions");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");
const errorMessage = document.getElementById("errorMessage");
const weather = document.getElementById("weather");

let searchTimer;
let requestNumber = 0;

// Weather conditions
function weatherInfo(code) {
    const conditions = {
        0: ["Clear Sky", "☀️"],
        1: ["Mainly Clear", "🌤️"],
        2: ["Partly Cloudy", "⛅"],
        3: ["Overcast", "☁️"],
        45: ["Foggy", "🌫️"],
        48: ["Rime Fog", "🌫️"],
        51: ["Light Drizzle", "🌦️"],
        53: ["Drizzle", "🌦️"],
        55: ["Heavy Drizzle", "🌧️"],
        61: ["Light Rain", "🌧️"],
        63: ["Moderate Rain", "🌧️"],
        65: ["Heavy Rain", "🌧️"],
        71: ["Light Snow", "🌨️"],
        73: ["Snow", "❄️"],
        75: ["Heavy Snow", "❄️"],
        80: ["Rain Showers", "🌦️"],
        81: ["Rain Showers", "🌧️"],
        82: ["Heavy Rain Showers", "⛈️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm with Hail", "⛈️"],
        99: ["Heavy Thunderstorm", "⛈️"]
    };

    return conditions[code] || ["Unknown Weather", "🌡️"];
}

// Loading and error
function showLoading(show) {
    loading.classList.toggle("hidden", !show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorBox.classList.remove("hidden");
    weather.classList.add("hidden");
}

// Worldwide city suggestions
cityInput.addEventListener("input", function () {
    const query = this.value.trim();

    clearTimeout(searchTimer);
    suggestionsBox.innerHTML = "";
    suggestionsBox.classList.add("hidden");

    if (query.length < 2) return;

    searchTimer = setTimeout(() => {
        getCitySuggestions(query);
    }, 300);
});

async function getCitySuggestions(query) {
    const currentRequest = ++requestNumber;

    try {
        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=100&language=en&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("City search failed");
        }

        const data = await response.json();

        if (currentRequest !== requestNumber) return;

        suggestionsBox.innerHTML = "";

        if (!data.results || data.results.length === 0) {
            const item = document.createElement("div");
            item.className = "suggestion-item";
            item.textContent = "No location found";
            suggestionsBox.appendChild(item);
            suggestionsBox.classList.remove("hidden");
            return;
        }

        data.results.forEach(city => {
            const item = document.createElement("div");
            item.className = "suggestion-item";

            const title = document.createElement("strong");
            title.textContent = city.name;

            const subtitle = document.createElement("small");
            subtitle.textContent = [
                city.admin1,
                city.admin2,
                city.country
            ].filter(Boolean).join(", ");

            item.appendChild(title);
            item.appendChild(subtitle);

            item.addEventListener("click", () => {
                cityInput.value = city.name;
                suggestionsBox.classList.add("hidden");

                getWeather(
                    city.latitude,
                    city.longitude,
                    city.name
                );
            });

            suggestionsBox.appendChild(item);
        });

        suggestionsBox.classList.remove("hidden");

    } catch (error) {
        console.error(error);
    }
}

// Search city manually
async function searchWeather() {
    const city = cityInput.value.trim();

    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    suggestionsBox.classList.add("hidden");
    showLoading(true);
    errorBox.classList.add("hidden");

    try {
        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error("City not found. Please try another name.");
        }

        const result = data.results[0];

        await getWeather(
            result.latitude,
            result.longitude,
            result.name
        );

    } catch (error) {
        showLoading(false);
        showError(error.message);
    }
}

// Fetch weather data
async function getWeather(latitude, longitude, cityName) {
    showLoading(true);
    errorBox.classList.add("hidden");
    weather.classList.add("hidden");

    try {
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=7`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Weather service is unavailable.");
        }

        const data = await response.json();

        displayWeather(data, cityName);

        showLoading(false);
        weather.classList.remove("hidden");

    } catch (error) {
        showLoading(false);
        showError("Unable to get weather. Please try again.");
        console.error(error);
    }
}

// Display weather information
function displayWeather(data, cityName) {
    const current = data.current;
    const daily = data.daily;

    const info = weatherInfo(current.weather_code);

    document.getElementById("cityName").textContent = cityName;

    document.getElementById("currentDate").textContent =
        new Date(current.time).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    document.getElementById("currentIcon").textContent = info[1];
    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m);

    document.getElementById("weatherText").textContent = info[0];

    document.getElementById("feelsLike").textContent =
        Math.round(current.apparent_temperature);

    document.getElementById("humidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("wind").textContent =
        current.wind_speed_10m;

    document.getElementById("pressure").textContent =
        Math.round(current.pressure_msl);

    document.getElementById("rain").textContent =
        daily.precipitation_probability_max[0] ?? 0;

    document.getElementById("sunrise").textContent =
        daily.sunrise[0].substring(11, 16);

    document.getElementById("sunset").textContent =
        daily.sunset[0].substring(11, 16);

    document.getElementById("forecast").innerHTML = "";

    daily.time.forEach((date, index) => {
        const forecastInfo = weatherInfo(daily.weather_code[index]);

        const day = index === 0
            ? "Today"
            : new Date(date + "T12:00:00").toLocaleDateString(
                "en-IN", { weekday: "short" }
            );

        const card = document.createElement("div");
        card.className = "forecast-card";

        card.innerHTML = `
            <p>${day}</p>
            <div class="forecast-icon">${forecastInfo[1]}</div>
            <strong>${Math.round(daily.temperature_2m_max[index])}°</strong>
            <span>${Math.round(daily.temperature_2m_min[index])}°</span>
            <small>${daily.precipitation_probability_max[index] ?? 0}% rain</small>
        `;

        document.getElementById("forecast").appendChild(card);
    });
}

// Search button
searchBtn.addEventListener("click", searchWeather);

// Enter key
cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        suggestionsBox.classList.add("hidden");
        searchWeather();
    }
});

// Current location
locationBtn.addEventListener("click", function () {
    if (!navigator.geolocation) {
        showError("Location is not supported by your browser.");
        return;
    }

    showLoading(true);
    errorBox.classList.add("hidden");

    navigator.geolocation.getCurrentPosition(
        position => {
            getWeather(
                position.coords.latitude,
                position.coords.longitude,
                "Your Location"
            );
        },
        () => {
            showLoading(false);
            showError("Please allow location permission and try again.");
        }
    );
});

// Close suggestions on outside click
document.addEventListener("click", function (event) {
    if (!event.target.closest(".autocomplete-box")) {
        suggestionsBox.classList.add("hidden");
    }
});

// Default city
searchWeather();
