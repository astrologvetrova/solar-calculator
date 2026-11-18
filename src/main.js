
import {
  SwissEphemeris,
  Planet,
  HouseSystem
} from "@swisseph/browser";

const $ = id => document.getElementById(id);

const form = $("solarForm");
const cityInput = $("birthCity");
const cityList = $("cities");
const yearSelect = $("solarYear");
const button = $("solarButton");
const result = $("solarResult");
const errorBox = $("solarError");

let selectedCity = null;
let swe = null;
let searchTimer = null;

const houseThemes = [
  "Личность и новые начинания",
  "Деньги, доходы и личные ресурсы",
  "Общение, обучение и поездки",
  "Дом, семья и недвижимость",
  "Любовь, дети и творчество",
  "Работа, здоровье и повседневные дела",
  "Отношения и партнёрство",
  "Общие финансы и трансформация",
  "Путешествия, образование и мировоззрение",
  "Карьера, статус и достижения",
  "Друзья, окружение и планы на будущее",
  "Внутренний мир и завершение циклов"
];

const interpretations = [
  "Год личной инициативы. В центре внимания окажетесь вы сами, ваши желания, самостоятельность и новые начинания. Хорошее время, чтобы заявить о себе и определить личные ориентиры.",
  "На первый план выходят деньги, заработок, материальные ресурсы и личные ценности. Важно пересмотреть отношение к доходам, финансовым возможностям и собственным навыкам.",
  "Год общения, информации, обучения и новых контактов. Значимыми могут стать поездки, документы, переговоры, отношения с родственниками и ближайшим окружением.",
  "Внимание сосредоточится на доме, семье, недвижимости и личном пространстве. Возможны важные семейные решения, перемены в жилищных условиях и вопросы, связанные с родителями.",
  "Год творчества, самовыражения, любви и детей. Важными становятся личные увлечения, романтические отношения, радость жизни и проекты, в которые хочется вкладывать душу.",
  "В центре внимания работа, повседневные обязанности, организация жизни и забота о здоровье. Год подходит для пересмотра привычек, рабочего графика и системы ежедневных дел.",
  "Главная тема года — отношения и взаимодействие с другими людьми. Особое значение приобретают брак, партнёрство, сотрудничество, договорённости и умение находить баланс интересов.",
  "Год глубоких перемен и вопросов общих ресурсов. Важными могут стать кредиты, налоги, инвестиции, деньги партнёра, наследство и пересмотр финансовых обязательств.",
  "На первый план выходят расширение горизонтов, образование, путешествия и мировоззрение. Год может принести новые знания, интерес к другим культурам и изменение жизненных взглядов.",
  "В центре внимания карьера, профессия, статус и общественная реализация. Важными становятся профессиональные цели, ответственность, достижения и направление дальнейшего развития.",
  "Год общения с единомышленниками, друзьями и коллективами. Особое значение приобретают аудитория, сообщества, командные проекты и долгосрочные планы.",
  "Важной становится внутренняя жизнь, потребность в уединении и переосмыслении. Год подходит для завершения старых процессов, восстановления сил и работы с тем, что обычно остаётся за кадром."
];

// Заполняем список годов
const currentYear = new Date().getFullYear();

for (let year = currentYear; year <= currentYear + 10; year++) {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  yearSelect.appendChild(option);
}

// Перевод местного времени города в UTC
function localTimeToUTC(date, time, timezone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const desired = Date.UTC(
    year, month - 1, day, hour, minute
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
        .filter(p => p.type !== "literal")
        .map(p => [p.type, Number(p.value)])
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

    if (difference === 0) break;
  }

  return new Date(guess);
}

// Поиск города рождения
cityInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  selectedCity = null;

  const query = cityInput.value.trim();

  if (query.length < 2) {
    cityList.innerHTML = "";
    return;
  }

  searchTimer = setTimeout(async () => {
    try {
      const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(query) +
        "&count=7&language=ru&format=json";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Ошибка поиска города.");
      }

      const data = await response.json();
      cityList.innerHTML = "";

      (data.results || []).forEach(place => {
        const item = document.createElement("div");
        item.className = "city-option";

        item.textContent = [
          place.name,
          place.admin1,
          place.country
        ].filter(Boolean).join(", ");

        item.addEventListener("click", () => {
          selectedCity = place;
          cityInput.value = item.textContent;
          cityList.innerHTML = "";
        });

        cityList.appendChild(item);
      });

      if (!data.results || !data.results.length) {
        cityList.textContent = "Город не найден. Попробуйте другое название.";
      }

    } catch (err) {
      showError("Не удалось найти город. Проверьте интернет-соединение.");
    }
  }, 400);
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function normalize(angle) {
  return ((angle % 360) + 360) % 360;
}

// Разница углов в диапазоне от -180 до +180
function angleDifference(a, b) {
  return ((a - b + 540) % 360) - 180;
}

// Положение Солнца на заданный момент
function getSunLongitude(timestamp) {
  const jd = swe.dateToJulianDay(new Date(timestamp));
  const sun = swe.calculatePosition(jd, Planet.Sun);
  return normalize(sun.longitude);
}

// Ищем точный момент возвращения Солнца
function findSolarReturn(natalLongitude, year, timezone) {
  const start = localTimeToUTC(
    `${year}-01-01`, "00:00", timezone
  ).getTime();

  const end = localTimeToUTC(
    `${year + 1}-01-01`, "00:00", timezone
  ).getTime();

  const step = 6 * 60 * 60 * 1000;

  let left = start;
  let leftDiff = angleDifference(
    getSunLongitude(left),
    natalLongitude
  );

  for (
    let right = left + step;
    right <= end;
    right += step
  ) {
    const rightDiff = angleDifference(
      getSunLongitude(right),
      natalLongitude
    );

    // Солнце движется вперёд по зодиаку.
    // Ищем переход через натальный градус.
    if (
      leftDiff <= 0 &&
      rightDiff >= 0 &&
      leftDiff > -5 &&
      rightDiff < 5
    ) {
      let low = left;
      let high = right;

      while (high - low > 1000) {
        const middle = Math.floor((low + high) / 2);

        const middleDiff = angleDifference(
          getSunLongitude(middle),
          natalLongitude
        );

        if (middleDiff < 0) {
          low = middle;
        } else {
          high = middle;
        }
      }

      return new Date((low + high) / 2);
    }

    left = right;
    leftDiff = rightDiff;
  }

  throw new Error(
    "Не удалось найти момент соляра в выбранном году."
  );
}

// Определяем дом по куспидам
function findHouse(longitude, cusps) {
  const position = normalize(longitude);

  for (let i = 1; i <= 12; i++) {
    const start = normalize(cusps[i]);
    const end = normalize(cusps[i === 12 ? 1 : i + 1]);

    const arc = normalize(end - start);
    const distance = normalize(position - start);

    if (distance < arc || arc === 0) {
      return i;
    }
  }

  throw new Error("Не удалось определить дом Солнца.");
}

// Отображаем дату соляра в часовом поясе рождения
function formatSolarDate(date, timezone) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

// Основной расчёт
form.addEventListener("submit", async event => {
  event.preventDefault();

  result.hidden = true;
  errorBox.hidden = true;
  button.disabled = true;
  button.textContent = "Рассчитываем...";

  try {
    const birthDate = $("birthDate").value;
    const birthTime = $("birthTime").value;
    const solarYear = Number(yearSelect.value);

    if (!birthDate || !birthTime) {
      throw new Error("Укажите дату и время рождения.");
    }

    if (!selectedCity) {
      throw new Error("Выберите город из списка подсказок.");
    }

    if (!selectedCity.timezone) {
      throw new Error("Не удалось определить часовой пояс города.");
    }

    const timezone = selectedCity.timezone;

    const birthUTC = localTimeToUTC(
      birthDate,
      birthTime,
      timezone
    );

    if (!swe) {
      swe = new SwissEphemeris();
      await swe.init();
    }

    // Натальное Солнце
    const birthJD = swe.dateToJulianDay(birthUTC);

    const natalSun = swe.calculatePosition(
      birthJD,
      Planet.Sun
    );

    // Точный момент возвращения Солнца
    const solarReturn = findSolarReturn(
      natalSun.longitude,
      solarYear,
      timezone
    );

    // Дома на момент соляра по координатам города рождения
    const returnJD = swe.dateToJulianDay(solarReturn);

    const houses = swe.calculateHouses(
      returnJD,
      selectedCity.latitude,
      selectedCity.longitude,
      HouseSystem.Placidus
    );

    // Положение Солнца непосредственно в момент соляра
    const returnSun = swe.calculatePosition(
      returnJD,
      Planet.Sun
    );

    const house = findHouse(
      returnSun.longitude,
      houses.cusps
    );

    $("resultTitle").textContent =
      `Солнце в ${house}-м доме соляра`;

    $("resultSubtitle").textContent =
      houseThemes[house - 1];

    $("resultText").textContent =
      interpretations[house - 1];

    const dateNote = document.createElement("p");
    dateNote.style.color = "#897B72";
    dateNote.style.fontSize = "12px";
    dateNote.textContent =
      "Момент соляра: " +
      formatSolarDate(solarReturn, timezone);

    $("resultText").after(dateNote);

    result.hidden = false;

    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (err) {
    showError(
      err.message || "Не удалось выполнить расчёт."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Рассчитать мой соляр";
  }
});
