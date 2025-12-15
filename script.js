const els = {
  themeToggle: document.getElementById("theme-toggle"),
  blockSelector: document.getElementById("block-selector"),
  quizCard: document.getElementById("quiz-card"),
  summaryCard: document.getElementById("summary-card"),
  progressLabel: document.getElementById("progress-label"),
  scorePill: document.getElementById("score-pill"),
  progressFill: document.getElementById("progress-fill"),
  status: document.getElementById("status"),
  questionBlock: document.getElementById("question-block"),
  questionText: document.getElementById("question-text"),
  optionsForm: document.getElementById("options-form"),
  feedback: document.getElementById("feedback"),
  explanation: document.getElementById("explanation"),
  submitBtn: document.getElementById("submit-btn"),
  nextBtn: document.getElementById("next-btn"),
  summaryTitle: document.getElementById("summary-title"),
  summaryScore: document.getElementById("summary-score"),
  summaryDetail: document.getElementById("summary-detail"),
  statCorrect: document.getElementById("stat-correct"),
  statWrong: document.getElementById("stat-wrong"),
  statAccuracy: document.getElementById("stat-accuracy"),
  restartBtn: document.getElementById("restart-btn"),
};

const BLOCK_SIZE = 25;

const state = {
  allQuestions: [],     // все валидные вопросы (до 100)
  currentBlock: [],     // текущий блок из 25 вопросов
  index: 0,
  score: 0,
  answered: 0,
  locked: false,
  selectedBlockIndex: null,
};

// Добавим кнопки выбора блока
const blockButtons = document.querySelectorAll(".block-btn");

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  attachHandlers();

  // Загружаем ВСЕ вопросы один раз
  loadAllQuestions();
});

function attachHandlers() {
  els.themeToggle.addEventListener("click", toggleTheme);
  els.submitBtn.addEventListener("click", handleSubmit);
  els.nextBtn.addEventListener("click", handleNext);
  els.restartBtn.addEventListener("click", () => {
    showBlockSelector();
  });
}

// === ЗАГРУЗКА ВСЕХ ВОПРОСОВ ОДИН РАЗ ===
async function loadAllQuestions() {
  setStatus("Сұрақтар жүктелуде...", "info-muted");
  try {
    const res = await fetch("tzi_questions.csv");
    if (!res.ok) throw new Error("Файлды жүктеу мүмкін болмады");
    const text = await res.text();
    const parsed = parseCsv(text);

    const validQuestions = parsed.filter(q => {
      const hasOptions = ["A", "B", "C", "D"].every(letter => q[letter] && q[letter].trim() !== "");
      const hasValidAnswer = ["A", "B", "C", "D"].includes((q.Answer || "").trim().toUpperCase());
      return hasOptions && hasValidAnswer;
    });

    if (!validQuestions.length) throw new Error("Сұрақтар табылмады");

    // Ограничиваем до 100 вопросов
    state.allQuestions = validQuestions.slice(0, 100);

    // Активируем кнопки выбора
    blockButtons.forEach(btn => {
      btn.disabled = false;
      btn.addEventListener("click", () => {
        const blockIndex = parseInt(btn.dataset.block);
        startBlock(blockIndex);
      });
    });

    showBlockSelector();
  } catch (err) {
    setStatus(
      `Қате: ${err.message}. Файлды сервер арқылы ашыңыз (мысалы, "python -m http.server").`,
      "bad"
    );
    els.blockSelector.hidden = true;
  }
}

// === ПОКАЗАТЬ ЭКРАН ВЫБОРА ===
function showBlockSelector() {
  els.blockSelector.hidden = false;
  els.quizCard.hidden = true;
  els.summaryCard.hidden = true;
}

// === НАЧАТЬ ВЫБРАННЫЙ БЛОК ===
function startBlock(blockIndex) {
  const start = blockIndex * BLOCK_SIZE;
  const end = start + BLOCK_SIZE;
  const block = state.allQuestions.slice(start, end);

  if (block.length === 0) {
    alert("Бұл бөлімде сұрақтар жоқ.");
    return;
  }

  state.currentBlock = block;
  state.selectedBlockIndex = blockIndex;
  state.index = 0;
  state.score = 0;
  state.answered = 0;

  els.blockSelector.hidden = true;
  els.quizCard.hidden = false;
  els.summaryCard.hidden = true;
  els.questionBlock.classList.remove("hidden");
  setStatus("");
  renderQuestion();
}

// === РЕНДЕР ВОПРОСА ===
function renderQuestion() {
  const q = getCurrent();
  if (!q) return;

  els.questionText.textContent = `${state.index + 1}. ${q.Question}`;
  els.optionsForm.innerHTML = "";

  ["A", "B", "C", "D"].forEach(letter => {
    const text = q[letter];
    if (text === undefined) return;
    const option = buildOption(letter, text);
    els.optionsForm.appendChild(option);
  });

  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.explanation.classList.add("hidden");
  els.explanation.textContent = "";

  els.submitBtn.disabled = false;
  els.nextBtn.disabled = true;
  els.nextBtn.textContent = "Келесі сұрақ";
  state.locked = false;

  updateProgress();
}

function buildOption(letter, text) {
  const label = document.createElement("label");
  label.className = "option";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "answer";
  input.value = letter;
  input.required = true;
  const badge = document.createElement("span");
  badge.className = "letter";
  badge.textContent = letter;
  const body = document.createElement("span");
  body.className = "option-body";
  body.textContent = text;
  label.appendChild(input);
  label.appendChild(badge);
  label.appendChild(body);
  return label;
}

// === ОБРАБОТКА ОТВЕТА ===
function handleSubmit() {
  if (state.locked) return;

  const checked = els.optionsForm.querySelector('input[name="answer"]:checked');
  if (!checked) {
    setStatus("Алдымен жауапты таңдаңыз.", "bad");
    return;
  }

  const q = getCurrent();
  const correct = (q.Answer || "").trim().toUpperCase();
  const chosen = checked.value;

  const options = els.optionsForm.querySelectorAll(".option");
  options.forEach(opt => {
    const val = opt.querySelector("input").value;
    opt.querySelector("input").disabled = true;
    if (val === correct) opt.classList.add("correct");
    else if (val === chosen && chosen !== correct) opt.classList.add("incorrect");
  });

  if (chosen === correct) {
    state.score += 1;
    els.feedback.textContent = "Дұрыс! Жақсы жұмыс.";
    els.feedback.classList.add("ok");
  } else {
    els.feedback.textContent = `Қате. Дұрыс жауап: ${correct}.`;
    els.feedback.classList.add("bad");
  }

  const explanation = q.Explanation || "";
  if (explanation.trim()) {
    els.explanation.textContent = `Түсіндірме: ${explanation}`;
    els.explanation.classList.remove("hidden");
  }

  state.answered += 1;
  els.scorePill.textContent = `Ұпай: ${state.score}`;
  els.submitBtn.disabled = true;

  const isLast = state.index >= state.currentBlock.length - 1;
  els.nextBtn.textContent = isLast ? "Нәтижені көру" : "Келесі сұрақ";
  els.nextBtn.disabled = false;
  state.locked = true;
  setStatus("");
}

function handleNext() {
  if (state.index >= state.currentBlock.length - 1) {
    showSummary();
    return;
  }
  state.index += 1;
  renderQuestion();
}

// === ПОКАЗАТЬ ИТОГИ ===
function showSummary() {
  els.quizCard.hidden = true;
  els.summaryCard.hidden = false;

  const total = state.currentBlock.length;
  const wrong = total - state.score;
  const accuracy = total ? Math.round((state.score / total) * 100) : 0;

  els.summaryTitle.textContent = "Бөлім аяқталды";
  els.summaryScore.textContent = `${state.score}/${total}`;
  els.summaryDetail.textContent = "Бұл бөлім аяқталды. Басқа бөлімді таңдауға болады.";
  els.statCorrect.textContent = state.score;
  els.statWrong.textContent = wrong;
  els.statAccuracy.textContent = `${accuracy}%`;

  updateProgress(1);
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getCurrent() {
  return state.currentBlock[state.index];
}

function setStatus(message, tone = "") {
  els.status.textContent = message;
  els.status.className = tone ? `info ${tone}` : "info";
}

function updateProgress(forcedRatio) {
  const total = state.currentBlock.length;
  const current = state.index + 1;
  const ratio = forcedRatio !== undefined ? forcedRatio : total ? current / total : 0;
  els.progressLabel.textContent = `${Math.min(current, total)}/${total} сұрақ`;
  els.progressFill.style.width = `${Math.min(ratio * 100, 100)}%`;
  els.scorePill.textContent = `Ұпай: ${state.score}`;
}

// === ТЕМА ===
function initTheme() {
  const saved = localStorage.getItem("tzi-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = saved ? saved === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", dark);
  updateThemeButton(dark);
}

function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("tzi-theme", dark ? "dark" : "light");
  updateThemeButton(dark);
}

function updateThemeButton(isDark) {
  els.themeToggle.querySelector(".icon").textContent = isDark ? "☀️" : "🌙";
  els.themeToggle.querySelector(".label").textContent = isDark ? "Жарық режимі" : "Қараңғы режим";
}

// === CSV ПАРСЕР ===
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] || "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
}

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}
