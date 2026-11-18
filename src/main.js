import {
  SwissEphemeris,
  Planet,
  HouseSystem
} from "@swisseph/browser";

const $ = (id) => document.getElementById(id);

const descriptions = [
  "Личность, самостоятельность, инициатива и новые начинания.",
  "Личные доходы, заработок, материальные ресурсы и ценности.",
  "Общение, обучение, документы, поездки и новые контакты.",
  "Дом, семья, недвижимость, род и внутреннее благополучие.",
  "Любовь, дети, творчество, увлечения и самовыражение.",
  "Работа, повседневные обязанности, здоровье и организация жизни.",
  "Отношения, брак, партнёрство и деловое сотрудничество.",
  "Общие финансы, инвестиции, кредиты и глубокие перемены.",
  "Путешествия, образование, мировоззрение и расширение горизонтов.",
  "Карьера, профессия, статус, достижения и общественное признание.",
  "Друзья, единомышленники, аудитория и долгосрочные планы.",
  "Внутренний мир, уединение, завершение циклов и скрытые ресурсы."
];

let swe = null;
let selectedCity = null;
let searchTimer = null;

const yearSelect = $("solarYear");
const currentYear = new Date().getFullYear();

for (let year = currentYear; year <= currentYear + 10; year++) {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  yearSelect.appendChild(option);
}

yearSelect.value = String(currentYear);

function normalize(angle) {
  return ((angle % 360) + 360) % 360;
}

function angleDifference(angle, target) {
  let difference = normalize(angle - target);

  if (difference > 180) {
    difference -= 360;
  }

  return difference;
}

function isLeapYear(year) {
  return year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);
}

function localTimeToUTC(date, time, timezone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const desired = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute
  );

  let guess = desired;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  for (let i = 0; i < 5; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess))
        .filter(part => part.type !== "literal")
        .map(part => [part.type, Number(part.value)])
    );

    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

    const difference = desired - represented;

    guess += difference;

    if (difference === 0) {
      break;
    }
  }

  return new Date(guess);
}

function getSunLongitude(date) {
  const jd = swe.dateToJulianDay(date);

  return swe.calculatePosition(
    jd,
    Planet.Sun
  ).longitude;
}

function findSolarReturn(
  natalLongitude,
  year,
  birthDate,
  timezone
) {
  const [, month, originalDay] = birthDate
    .split("-")
    .map(Number);

  const day =
    month === 2 &&
    originalDay === 29 &&
    !isLeapYear(year)
      ? 28
      : originalDay;

  const dateString =
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const approximateDate = localTimeToUTC(
    dateString,
    "12:00",
    timezone
  );

  const dayMs = 24 * 60 * 60 * 1000;

  let low = approximateDate.getTime() - 4 * dayMs;
  let high = approximateDate.getTime() + 4 * dayMs;

  const lowDifference = angleDifference(
    getSunLongitude(new Date(low)),
    natalLongitude
  );

  const highDifference = angleDifference(
    getSunLongitude(new Date(high)),
    natalLongitude
  );

  if (!(lowDifference <= 0 && highDifference >= 0)) {
    throw new Error(
      "Не удалось найти момент соляра. Проверь дату рождения и год."
    );
  }

  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);

    const difference = angleDifference(
      getSunLongitude(new Date(middle)),
      natalLongitude
    );

    if (difference < 0) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return new Date(
    Math.floor((low + high) / 2)
  );
}

function findHouse(longitude, cusps) {
  const position = normalize(longitude);

  for (let house = 1; house <= 12; house++) {
    const start = normalize(cusps[house]);

    const nextHouse = house === 12 ? 1 : house + 1;

    const end = normalize(cusps[nextHouse]);

    const arc = normalize(end - start);
    const distance = normalize(position - start);

    if (distance < arc) {
      return house;
    }
  }

  throw new Error(
    "Не удалось определить дом Солнца."
  );
}

function formatDate(date, timezone) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

$("city").addEventListener("input", () => {
  clearTimeout(searchTimer);

  selectedCity = null;

  const query = $("city").value.trim();

  $("citySuggestions").replaceChildren();

  if (query.length < 2) {
    return;
  }

  searchTimer = setTimeout(async () => {
    try {
      const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(query) +
        "&count=6&language=ru&format=json";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Ошибка поиска города");
      }

      const data = await response.json();

      $("citySuggestions").replaceChildren();

      (data.results || []).forEach(place => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "suggestion";

        item.textContent = [
          place.name,
          place.admin1,
          place.country
        ].filter(Boolean).join(", ");

        item.addEventListener("click", () => {
          selectedCity = place;

          $("city").value = item.textContent;

          $("citySuggestions").replaceChildren();

          $("status").textContent = "";
        });

        $("citySuggestions").appendChild(item);
      });

      if (!data.results || data.results.length === 0) {
        $("status").textContent =
          "Город не найден. Попробуй другое написание.";
      }
    } catch (error) {
      $("status").textContent =
        "Не удалось найти город. Проверь подключение к интернету.";
    }
  }, 350);
});

$("solarForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  $("result").hidden = true;

  $("status").textContent = "Выполняется расчёт...";

  $("calculateButton").disabled = true;

  try {
    const birthDate = $("birthDate").value;
    const birthTime = $("birthTime").value;
    const year = Number($("solarYear").value);

    if (!birthDate || !birthTime) {
      throw new Error(
        "Укажи дату и время рождения."
      );
    }

    if (!selectedCity) {
      throw new Error(
        "Выбери город рождения из выпадающего списка."
      );
    }

    if (!selectedCity.timezone) {
      throw new Error(
        "Не удалось определить часовой пояс города."
      );
    }

    if (!swe) {
      swe = new SwissEphemeris();

      await swe.init();
    }

    const birthUTC = localTimeToUTC(
      birthDate,
      birthTime,
      selectedCity.timezone
    );

    const birthJD = swe.dateToJulianDay(birthUTC);

    const natalSun = swe.calculatePosition(
      birthJD,
      Planet.Sun
    );

    const solarReturn = findSolarReturn(
      natalSun.longitude,
      year,
      birthDate,
      selectedCity.timezone
    );

    const solarJD = swe.dateToJulianDay(
      solarReturn
    );

    const houses = swe.calculateHouses(
      solarJD,
      selectedCity.latitude,
      selectedCity.longitude,
      HouseSystem.Placidus
    );

    const solarSun = swe.calculatePosition(
      solarJD,
      Planet.Sun
    );

    const house = findHouse(
      solarSun.longitude,
      houses.cusps
    );

    $("houseNumber").textContent =
      `${house} дом`;

    $("houseTitle").textContent =
      `Солнце в ${house} доме соляра`;

    $("houseDescription").textContent =
      descriptions[house - 1];

    $("result").hidden = false;

    $("status").textContent =
      `Момент соляра: ${formatDate(
        solarReturn,
        selectedCity.timezone
      )}`;

    $("result").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    $("status").textContent =
      error.message ||
      "Не удалось выполнить расчёт. Попробуй ещё раз.";

  } finally {
    $("calculateButton").disabled = false;
  }
});
