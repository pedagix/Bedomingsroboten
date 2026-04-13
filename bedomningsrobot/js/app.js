const app = document.getElementById("app");

const state = {
  selectedGradeCategory: "",
  selectedSubject: "",
  currentScreen: "start",
  subjectData: null,
  currentGoalIndex: 0,
  answers: {},
  skippedGoals: []
};

const subjectsByGrade = {
  "7-9": [
    { id: "biologi", name: "Biologi" },
    { id: "geografi", name: "Geografi" },
    { id: "fysik", name: "Fysik" },
    { id: "kemi", name: "Kemi" },
    { id: "matematik", name: "Matematik" },
    { id: "svenska-och-litteratur", name: "Svenska och litteratur" }
  ]
};

const AVAILABLE_GRADES = [10, 9, 8, 7, 6, 5, 4];

async function loadSubjectData() {
  const path = `./data/${state.selectedGradeCategory}/${state.selectedSubject}.json`;
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Kunde inte läsa filen: ${path}`);
  }

  return await response.json();
}

function renderStartScreen() {
  const subjectOptions = state.selectedGradeCategory
    ? subjectsByGrade[state.selectedGradeCategory]
        .map((subject) => {
          const selected = state.selectedSubject === subject.id ? "selected" : "";
          return `<option value="${subject.id}" ${selected}>${subject.name}</option>`;
        })
        .join("")
    : "";

  app.innerHTML = `
    <div class="start-shell">
      <div class="start-card">
        <h1 class="start-title">Bedömningsroboten</h1>

        <div class="start-field">
          <label for="gradeSelect">Årskurs</label>
          <select id="gradeSelect">
            <option value="">Välj årskurs</option>
            <option value="7-9" ${state.selectedGradeCategory === "7-9" ? "selected" : ""}>7–9</option>
          </select>
        </div>

        <div class="start-field">
          <label for="subjectSelect">Ämne</label>
          <select id="subjectSelect" ${state.selectedGradeCategory ? "" : "disabled"}>
            <option value="">Välj ämne</option>
            ${subjectOptions}
          </select>
        </div>

        <button
          id="startBtn"
          class="primary-btn start-main-btn"
          ${state.selectedGradeCategory && state.selectedSubject ? "" : "disabled"}
        >
          Börja
        </button>
      </div>
    </div>
  `;

  document.getElementById("gradeSelect").addEventListener("change", (event) => {
    state.selectedGradeCategory = event.target.value;
    state.selectedSubject = "";
    renderApp();
  });

  document.getElementById("subjectSelect").addEventListener("change", (event) => {
    state.selectedSubject = event.target.value;
    renderApp();
  });

  document.getElementById("startBtn").addEventListener("click", async () => {
    try {
      state.subjectData = await loadSubjectData();
      state.currentGoalIndex = 0;
      state.answers = {};
      state.skippedGoals = [];
      state.currentScreen = "assessment";
      renderApp();
    } catch (error) {
      alert(error.message);
      console.error(error);
    }
  });
}

function renderAssessmentScreen() {
  const goals = state.subjectData.goals;
  const goal = goals[state.currentGoalIndex];
  const totalGoals = goals.length;
  const currentStep = state.currentGoalIndex + 1;
  const progressPercent = (currentStep / totalGoals) * 100;
  const savedAnswer = state.answers[goal.id];

  const assessmentTargetHtml = goal.assessmentTarget
    ? `
      <div class="target-box">
        <div class="target-label">Föremål för bedömningen</div>
        <div class="target-text">${goal.assessmentTarget}</div>
      </div>
    `
    : "";

  const messageHtml = goal.message
    ? `<div class="message-box">${goal.message}</div>`
    : "";

  const notesHtml = goal.notes
    ? `<div class="notes-box"><strong>Notering:</strong> ${goal.notes}</div>`
    : "";

  const gradeRowsHtml = goal.assessable
    ? AVAILABLE_GRADES.map((grade) => {
        const criterionText = goal.criteria?.[String(grade)] || "";
        const selectedClass = savedAnswer === grade ? "selected" : "";

        return `
          <button
            type="button"
            class="grade-row ${selectedClass}"
            data-grade="${grade}"
            aria-pressed="${savedAnswer === grade ? "true" : "false"}"
          >
            <div class="grade-number-box">${grade}</div>
            <div class="grade-criterion-box">
              ${
                criterionText
                  ? `<div class="grade-criterion-text">${criterionText}</div>`
                  : `<div class="grade-criterion-text grade-muted">Ingen kriterietext angiven för denna nivå.</div>`
              }
            </div>
          </button>
        `;
      }).join("")
    : "";

  app.innerHTML = `
    <div class="assessment-shell">
      <div class="assessment-panel">
        <div class="subject-heading">${state.subjectData.subjectName}</div>

        <div class="progress-section">
          <div class="progress-bar-sketch">
            <div class="progress-fill-sketch" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="progress-text-sketch">Delmål ${currentStep} av ${totalGoals}</div>
        </div>

        <div class="goal-content-box">
          <div class="goal-code-sketch">${goal.id}</div>
          <div class="goal-text-sketch">${goal.goalText}</div>
          ${assessmentTargetHtml}
          ${messageHtml}
          ${notesHtml}
        </div>

        ${
          goal.assessable
            ? `
              <div class="grade-stack">
                ${gradeRowsHtml}
              </div>
            `
            : `
              <div class="non-assessable-box">
                Detta mål används inte som grund för bildandet av vitsord.
              </div>
            `
        }

        <div class="bottom-nav">
          <button id="restartBtn" class="secondary-btn nav-btn small-nav-btn">Börja om</button>
          <button id="backBtn" class="secondary-btn nav-btn">Tillbaka</button>
          ${
            goal.assessable
              ? `<button id="skipBtn" class="secondary-btn nav-btn">Hoppa över</button>`
              : `<button id="nextBtn" class="primary-btn nav-btn">Nästa</button>`
          }
        </div>
      </div>
    </div>
  `;

  document.getElementById("restartBtn").addEventListener("click", resetToStart);

  document.getElementById("backBtn").addEventListener("click", () => {
    if (state.currentGoalIndex === 0) {
      resetToStart();
      return;
    }

    state.currentGoalIndex--;
    renderApp();
  });

  if (goal.assessable) {
    document.querySelectorAll(".grade-row").forEach((button) => {
      button.addEventListener("click", () => {
        const grade = Number(button.dataset.grade);
        state.answers[goal.id] = grade;
        state.skippedGoals = state.skippedGoals.filter((id) => id !== goal.id);
        goToNextStep();
      });
    });

    document.getElementById("skipBtn").addEventListener("click", () => {
      delete state.answers[goal.id];

      if (!state.skippedGoals.includes(goal.id)) {
        state.skippedGoals.push(goal.id);
      }

      goToNextStep();
    });
  } else {
    document.getElementById("nextBtn").addEventListener("click", () => {
      goToNextStep();
    });
  }
}

function renderSummaryScreen() {
  const values = Object.values(state.answers);
  const average = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

  const recommended = values.length ? Math.round(average) : "-";

  app.innerHTML = `
    <div class="summary-shell">
      <div class="summary-panel">
        <div class="summary-subject">${state.subjectData.subjectName}</div>
        <div class="summary-status">Bedömning genomförd.</div>

        <div class="summary-average-box">
          <div class="summary-average-label">Medeltal</div>
          <div class="summary-average-value">
            ${values.length ? average.toFixed(2) : "-"}
          </div>
        </div>

        <div class="summary-grade-label">Rekommenderat vitsord</div>
        <div class="summary-grade-circle">${recommended}</div>

        <div class="summary-actions">
          <button id="sameSubjectBtn" class="primary-btn">
            Bedöm samma ämne
          </button>
          <button id="newSubjectBtn" class="secondary-btn">
            Bedöm ett annat ämne
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("sameSubjectBtn").addEventListener("click", restartSameSubject);
  document.getElementById("newSubjectBtn").addEventListener("click", resetToStart);
}

function goToNextStep() {
  const totalGoals = state.subjectData.goals.length;

  if (state.currentGoalIndex < totalGoals - 1) {
    state.currentGoalIndex++;
    renderApp();
  } else {
    state.currentScreen = "summary";
    renderApp();
  }
}

function resetToStart() {
  state.selectedGradeCategory = "";
  state.selectedSubject = "";
  state.currentScreen = "start";
  state.subjectData = null;
  state.currentGoalIndex = 0;
  state.answers = {};
  state.skippedGoals = [];
  renderApp();
}

function renderApp() {
  if (state.currentScreen === "start") {
    renderStartScreen();
    return;
  }

  if (state.currentScreen === "assessment") {
    renderAssessmentScreen();
    return;
  }

  if (state.currentScreen === "summary") {
    renderSummaryScreen();
  }
}

function restartSameSubject() {
  state.currentScreen = "assessment";
  state.currentGoalIndex = 0;
  state.answers = {};
  state.skippedGoals = [];
  renderApp();
}
renderApp();