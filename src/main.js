
import {
  SwissEphemeris,
  Planet,
  HouseSystem
} from "@swisseph/browser";

const $ = (id) => document.getElementById(id);

const descriptions = [
  "Год личного обновления, самостоятельности и инициативы. В центре внимания — ты сама, твои желания, внешность, образ жизни и личные цели. Возможны изменения самоощущения, новый этап в жизни, желание заявить о себе и действовать независимо. Это время формирования нового образа себя и своего будущего.",

  "Важными становятся заработок, доходы, накопления и материальная стабильность. Год может побудить пересмотреть источники дохода, стоимость своей работы, финансовые привычки и отношение к собственности. Особое значение приобретают личные ресурсы, навыки и понимание собственной ценности.",

  "На первый план выходят обучение, документы, переговоры, поездки и повседневные контакты. Возможны новые знакомства, освоение навыков, активное общение с родственниками, братьями, сёстрами и соседями. Информация и способность договариваться могут сыграть важную роль в событиях года.",

  "Главными становятся жильё, недвижимость, семья, родители и личное пространство. Возможны переезд, ремонт, покупка или продажа недвижимости, изменения семейных обстоятельств. Возникает потребность укрепить домашнюю опору, создать комфорт и разобраться с вопросами прошлого.",

  "В центре внимания — романтические отношения, дети, творчество, увлечения и самовыражение. Может усилиться желание проявлять таланты, заниматься любимым делом, выходить на публику и получать признание. Год может быть насыщен событиями, связанными с личной жизнью и творческими проектами.",

  "Основное внимание направлено на работу, обязанности, рабочий график, здоровье и организацию повседневности. Возможны изменения условий труда, новые задачи, перестройка режима и привычек. Важной становится способность выстроить устойчивую систему дел и заботы о себе.",

  "В центре внимания оказываются супруг, партнёр, клиенты, деловые союзники и открытые оппоненты. Год может принести важные решения в личной жизни, оформление отношений, начало сотрудничества или пересмотр договорённостей. Особое значение приобретает баланс интересов и умение договариваться.",

  "Важными становятся общие деньги, кредиты, налоги, инвестиции, страхование, наследство и финансовые вопросы партнёра. Может возникнуть необходимость решать вопросы совместного имущества или обязательств. На внутреннем уровне год может сопровождаться глубокой переоценкой ценностей и психологическими изменениями.",

  "В центре внимания — дальние путешествия, образование, повышение квалификации, иностранные языки и мировоззрение. Может появиться желание получить новое образование, преподавать, установить международные контакты или выйти за пределы привычной среды. Год связан с поиском новых ориентиров и масштабных планов.",

  "Главными становятся профессия, карьера, социальный статус, репутация и общественное признание. Возможны профессиональный рост, смена должности, открытие собственного дела или повышение ответственности. Важным становится вопрос, какого положения и каких результатов ты хочешь достичь.",

  "На первый план выходят друзья, коллективы, сообщества, аудитория и единомышленники. Год может расширить круг общения, принести полезные знакомства, коллективные проекты и поддержку окружающих. Особое значение приобретают долгосрочные планы и люди, которые помогают двигаться к целям.",

  "Важными становятся внутренний мир, уединение, отдых, психологическая работа и завершение процессов прошлого. Может усилиться потребность в тишине, переосмыслении жизненного пути и восстановлении сил. Это время внутренней подготовки к новому этапу и освобождения от того, что больше не приносит пользы."
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
      `Ваш новый личный год начинается: ${formatDate(
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
