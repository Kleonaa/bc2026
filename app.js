const data = window.SEKTA_TRAINING_DATA;
const STORAGE_KEY = "sektaBootcamp2026.progress.v1";

const state = {
  week: "all",
  type: "all",
  status: "all",
  query: "",
  videoOnly: false,
  progress: loadProgress(),
};

const elements = {
  weekFilters: document.querySelector("#weekFilters"),
  typeFilters: document.querySelector("#typeFilters"),
  statusFilters: document.querySelector("#statusFilters"),
  searchInput: document.querySelector("#searchInput"),
  videoOnly: document.querySelector("#videoOnly"),
  dayList: document.querySelector("#dayList"),
  emptyState: document.querySelector("#emptyState"),
  progressRing: document.querySelector("#progressRing"),
  progressPercent: document.querySelector("#progressPercent"),
  progressCount: document.querySelector("#progressCount"),
  visibleCount: document.querySelector("#visibleCount"),
  videoCount: document.querySelector("#videoCount"),
  averageRating: document.querySelector("#averageRating"),
  totalTime: document.querySelector("#totalTime"),
  nextTrainingButton: document.querySelector("#nextTrainingButton"),
};

const allTrainings = data.days.flatMap((day) => day.items);
const trainingTypes = ["all", ...new Set(allTrainings.map((item) => item.title))];

init();

function init() {
  renderFilterButtons();
  bindEvents();
  render();
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function getProgress(id) {
  return state.progress[id] || { done: false, rating: 0 };
}

function updateProgress(id, patch) {
  state.progress[id] = { ...getProgress(id), ...patch };
  saveProgress();
  render();
}

function renderFilterButtons() {
  const weeks = ["all", ...new Set(data.days.map((day) => day.week))];
  elements.weekFilters.innerHTML = weeks
    .map((week) => {
      const label = week === "all" ? "All" : `Week ${week}`;
      return `<button type="button" class="${week === "all" ? "is-active" : ""}" data-week="${week}">${label}</button>`;
    })
    .join("");

  elements.typeFilters.innerHTML = trainingTypes
    .map((type) => {
      const label = type === "all" ? "All" : type;
      return `<button type="button" class="${type === "all" ? "is-active" : ""}" data-type="${escapeAttr(type)}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function bindEvents() {
  elements.weekFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-week]");
    if (!button) return;
    state.week = button.dataset.week;
    setActive(elements.weekFilters, button);
    render();
  });

  elements.typeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    state.type = button.dataset.type;
    setActive(elements.typeFilters, button);
    render();
  });

  elements.statusFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    state.status = button.dataset.status;
    setActive(elements.statusFilters, button);
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.videoOnly.addEventListener("change", (event) => {
    state.videoOnly = event.target.checked;
    render();
  });

  elements.nextTrainingButton.addEventListener("click", () => {
    const next = allTrainings.find((training) => !getProgress(training.id).done);
    if (!next) return;
    clearFiltersForTraining(next);
    requestAnimationFrame(() => {
      document.querySelector(`[data-training-id="${CSS.escape(next.id)}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  });

  elements.dayList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-done]");
    if (!checkbox) return;
    updateProgress(checkbox.dataset.done, { done: checkbox.checked });
  });

  elements.dayList.addEventListener("click", (event) => {
    const star = event.target.closest("[data-rating]");
    if (star) {
      const current = getProgress(star.dataset.training).rating;
      const next = Number(star.dataset.rating);
      updateProgress(star.dataset.training, { rating: current === next ? 0 : next });
      return;
    }

    const details = event.target.closest("[data-details]");
    if (details) {
      const card = details.closest(".training-card");
      const description = card.querySelector(".description");
      const open = description.classList.toggle("is-open");
      details.textContent = open ? "Hide details" : "Details";
    }
  });
}

function clearFiltersForTraining(training) {
  state.week = String(training.week);
  state.type = "all";
  state.status = "all";
  state.query = "";
  state.videoOnly = false;
  elements.searchInput.value = "";
  elements.videoOnly.checked = false;
  setButtonByData(elements.weekFilters, "week", state.week);
  setButtonByData(elements.typeFilters, "type", state.type);
  setButtonByData(elements.statusFilters, "status", state.status);
  render();
}

function setActive(container, activeButton) {
  container.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button === activeButton);
  });
}

function setButtonByData(container, key, value) {
  const button = container.querySelector(`[data-${key}="${CSS.escape(value)}"]`);
  if (button) setActive(container, button);
}

function render() {
  const filteredDays = data.days
    .map((day) => ({
      ...day,
      items: day.items.filter(matchesFilters),
    }))
    .filter((day) => day.items.length > 0);

  renderStats(filteredDays);
  renderDays(filteredDays);
}

function matchesFilters(training) {
  const progress = getProgress(training.id);
  const haystack = [
    training.weekName,
    training.day,
    training.title,
    training.duration,
    training.coach,
    training.equipment,
    training.summary,
    training.description,
    ...training.muscles,
  ]
    .join(" ")
    .toLowerCase();

  if (state.week !== "all" && String(training.week) !== state.week) return false;
  if (state.type !== "all" && training.title !== state.type) return false;
  if (state.videoOnly && !training.videoUrl) return false;
  if (state.query && !haystack.includes(state.query)) return false;
  if (state.status === "done" && !progress.done) return false;
  if (state.status === "open" && progress.done) return false;
  if (state.status === "rated" && !progress.rating) return false;

  return true;
}

function renderStats(filteredDays) {
  const visible = filteredDays.flatMap((day) => day.items);
  const done = allTrainings.filter((training) => getProgress(training.id).done).length;
  const total = allTrainings.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const ratings = allTrainings
    .map((training) => getProgress(training.id).rating)
    .filter((rating) => rating > 0);
  const average = ratings.length
    ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
    : "-";

  elements.progressRing.style.setProperty("--progress", `${percent}%`);
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressCount.textContent = `${done} / ${total} trainings`;
  elements.visibleCount.textContent = visible.length;
  elements.videoCount.textContent = visible.filter((training) => training.videoUrl).length;
  elements.averageRating.textContent = average;
  elements.totalTime.textContent = formatMinutes(
    visible.reduce((sum, training) => sum + durationToMinutes(training.duration), 0)
  );
}

function renderDays(days) {
  elements.emptyState.hidden = days.length > 0;
  elements.dayList.innerHTML = days.map(renderDay).join("");
}

function renderDay(day) {
  const done = day.items.filter((item) => getProgress(item.id).done).length;

  return `
    <section class="day-section">
      <div class="day-heading">
        <h2>${escapeHtml(day.weekName)}, day ${day.day}</h2>
        <span class="day-progress">${done} / ${day.items.length} done</span>
      </div>
      <div class="training-grid">
        ${day.items.map(renderTraining).join("")}
      </div>
    </section>
  `;
}

function renderTraining(training) {
  const progress = getProgress(training.id);
  const muscles = training.muscles.map((muscle) => `<span class="chip">${escapeHtml(muscle)}</span>`).join("");
  const description = training.description || training.summary || "";

  return `
    <article class="training-card ${progress.done ? "is-done" : ""}" data-training-id="${escapeAttr(training.id)}">
      <div class="card-top">
        <div class="card-title-row">
          <h3>${escapeHtml(training.title)}</h3>
          <span class="duration">${escapeHtml(training.duration || "No time")}</span>
        </div>
        <p class="summary">${escapeHtml(training.summary || "No short description yet.")}</p>
      </div>

      <div class="meta-grid">
        ${metaLine("Coach", training.coach)}
        ${metaLine("Equipment", training.equipment)}
        ${muscles ? `<div class="chip-row">${muscles}</div>` : ""}
      </div>

      <div class="card-actions">
        <label class="done-toggle">
          <input type="checkbox" data-done="${escapeAttr(training.id)}" ${progress.done ? "checked" : ""}>
          <span>Done</span>
        </label>
        <div class="stars" aria-label="Rating for ${escapeAttr(training.title)}">
          ${[1, 2, 3, 4, 5].map((rating) => renderStar(training.id, rating, progress.rating)).join("")}
        </div>
      </div>

      <div class="secondary-actions">
        <button class="details-button" type="button" data-details="${escapeAttr(training.id)}">Details</button>
        ${renderVideoLink(training)}
      </div>

      <p class="description">${escapeHtml(description)}</p>
    </article>
  `;
}

function metaLine(label, value) {
  if (!value) return "";
  return `
    <div class="meta-line">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function renderStar(trainingId, rating, currentRating) {
  return `
    <button
      class="star-button ${rating <= currentRating ? "is-active" : ""}"
      type="button"
      data-training="${escapeAttr(trainingId)}"
      data-rating="${rating}"
      aria-label="${rating} stars"
      title="${rating} stars"
    >★</button>
  `;
}

function renderVideoLink(training) {
  if (!training.videoUrl) {
    return `<span class="video-link is-missing">Video later</span>`;
  }

  return `
    <a class="video-link" href="${escapeAttr(training.videoUrl)}" target="_blank" rel="noreferrer">
      Open video
    </a>
  `;
}

function durationToMinutes(duration) {
  const match = String(duration).match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) + Number(match[2]) / 60;
}

function formatMinutes(value) {
  if (!value) return "0m";
  const minutes = Math.round(value);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
