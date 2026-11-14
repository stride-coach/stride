const hour = 3_600_000;

function hours(url) {
  const start = Date.parse(`${url.searchParams.get("start_date")}T00:00:00Z`);
  const end = Date.parse(`${url.searchParams.get("end_date")}T23:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return [];
  return Array.from(
    { length: Math.floor((end - start) / hour) + 1 },
    (_, index) => start + index * hour,
  );
}

function temperature(epochMs, base) {
  const hourOfDay = new Date(epochMs).getUTCHours();
  return (
    Math.round((base + 4 * Math.sin(((hourOfDay - 9) * Math.PI) / 12)) * 10) /
    10
  );
}

function forecast(url, latitude, longitude) {
  if (!url.searchParams.get("hourly"))
    return { latitude, longitude, timezone: "Europe/Paris" };
  const times = hours(url);
  const temperatures = times.map((time) => temperature(time, 10));
  return {
    latitude,
    longitude,
    hourly: {
      time: times.map((time) => time / 1000),
      temperature_2m: temperatures,
      apparent_temperature: temperatures.map((value) => value - 2),
      precipitation_probability: times.map(() => 10),
      weather_code: times.map(() => 2),
      wind_speed_10m: times.map(() => 14),
      wind_direction_10m: times.map(() => 250),
      wind_gusts_10m: times.map(() => 28),
    },
  };
}

function archive(url, latitude, longitude) {
  const times = hours(url);
  return {
    latitude,
    longitude,
    hourly: {
      time: times.map((time) => time / 1000),
      temperature_2m: times.map((time) => temperature(time, 9)),
      precipitation: times.map((time) =>
        new Date(time).getUTCDate() % 4 === 0 ? 0.4 : 0,
      ),
      weather_code: times.map((time) =>
        new Date(time).getUTCDate() % 4 === 0 ? 61 : 3,
      ),
    },
  };
}

export function openMeteoResponse(url) {
  const kind = url.pathname.endsWith("/v1/archive")
    ? archive
    : url.pathname.endsWith("/v1/forecast")
      ? forecast
      : null;
  if (!kind) return null;
  const latitudes = (url.searchParams.get("latitude") ?? "").split(",");
  const longitudes = (url.searchParams.get("longitude") ?? "").split(",");
  const locations = latitudes.map((latitude, index) =>
    kind(url, Number(latitude), Number(longitudes[index])),
  );
  return locations.length === 1 ? locations[0] : locations;
}
