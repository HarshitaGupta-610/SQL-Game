const API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

const FALLBACK_SUSPECTS = [
  {
    id: 1,
    dbName: "Raj",
    name: "Suspect A",
    role: "Security Guard",
    age: 45,
    location: "Mall Entrance",
    alibi: "Was at the entrance",
    image: "Assets/raj.png",
    jacket: "Formal Suit",
    fingerprint: "No",
    enteredLate: "No",
    isCulprit: false
  },
  {
    id: 2,
    dbName: "Priya",
    name: "Suspect B",
    role: "Shop Owner",
    age: 32,
    location: "Jewelry Shop",
    alibi: "Closing the shop",
    image: "Assets/priya.png",
    jacket: "Blue Dress",
    fingerprint: "No",
    enteredLate: "No",
    isCulprit: false
  },
  {
    id: 3,
    dbName: "Aman",
    name: "Suspect C",
    role: "Customer",
    age: 28,
    location: "Jewelry Shop",
    alibi: "Browsing items",
    image: "Assets/aman.png",
    jacket: "Red Jacket",
    fingerprint: "Yes",
    enteredLate: "Yes",
    isCulprit: true
  },
  {
    id: 4,
    dbName: "Neha",
    name: "Suspect D",
    role: "Cleaner",
    age: 26,
    location: "Mall Hallway",
    alibi: "Cleaning after hours",
    image: "Assets/neha.png",
    jacket: "Dark Uniform",
    fingerprint: "No",
    enteredLate: "No",
    isCulprit: false
  },
  {
    id: 5,
    dbName: "Vikram",
    name: "Suspect E",
    role: "Delivery Boy",
    age: 35,
    location: "Back Gate",
    alibi: "Delivered package at 7:45 PM",
    image: "Assets/vikram.png",
    jacket: "Purple Jacket",
    fingerprint: "No",
    enteredLate: "No",
    isCulprit: false
  }
];

const FALLBACK_CLUES = [
  {
    id: "jacket",
    icon: "checkroom",
    title: "Witness Report",
    text: "Saw a person wearing a red jacket near the jewelry shop."
  },
  {
    id: "fingerprint",
    icon: "fingerprint",
    title: "Forensic Match",
    text: "Fingerprint found on glass display."
  },
  {
    id: "time",
    icon: "schedule",
    title: "Entry Log",
    text: "Someone entered after closing hours."
  }
];

let suspects = [];
let clues = [];

let analyzedClues = new Set();
let interrogatedSuspects = new Set();
let guessedSuspects = new Set();
let attemptsLeft = 3;
let timeLeft = 300;
let timerId = null;
let typingTimerId = null;
let dataLoaded = false;

const storyText = "There is a jewelry shop, and Mr. Mehra is the owner. He is sad because last night someone stole his jewelry.";

const culpritRule = (suspect) => suspect.isCulprit === true;

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function makeAlias(index) {
  return `Suspect ${String.fromCharCode(65 + index)}`;
}

function toCsv(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "None";
  }
  return values.join(", ");
}

async function loadGameData() {
  if (dataLoaded) {
    return;
  }

  try {
    const bootstrapRes = await fetch(`${API_BASE}/game/bootstrap`);
    if (!bootstrapRes.ok) {
      throw new Error("SQL bootstrap route failed.");
    }

    const bootstrap = await bootstrapRes.json();
    const culpritName = normalizeName(bootstrap.culpritName || "");

    suspects = (bootstrap.suspects || []).map((row, idx) => {
      const alias = typeof row.alias_name === "string" && row.alias_name.trim()
        ? row.alias_name
        : makeAlias(idx);

      return {
        id: Number(row.id),
        dbName: row.db_name,
        name: alias,
        age: Number(row.age) || 0,
        role: row.role || "Unknown",
        alibi: row.alibi || "No alibi reported.",
        location: row.location || "Unknown",
        image: row.image || "Assets/FirstPage.jpg",
        jacket: row.jacket || "Unknown",
        fingerprint: row.fingerprint || "No",
        enteredLate: row.entered_late || "No",
        isCulprit: normalizeName(row.db_name) === culpritName
      };
    });

    clues = (bootstrap.clues || []).map((clue) => ({
      id: clue.id,
      icon: clue.icon,
      title: clue.title,
      text: clue.text
    }));

    const inv = bootstrap.investigation || {};
    const sceneNames = toCsv((inv.sceneSuspects || []).map((r) => r.name));
    const redNames = toCsv((inv.redClothing || []).map((r) => r.name));
    const fingerprintNames = toCsv((inv.fingerprintMatches || []).map((r) => r.name));
    const witnessSceneText = toCsv((inv.witnessScene || []).map((r) => `${r.time}: ${r.statement}`));
    const evidenceMapText = toCsv((inv.evidenceMatches || []).map((r) => `${r.name} -> ${r.type}`));

    clues.push(
      {
        id: "q_scene",
        icon: "storefront",
        title: "Suspects At Jewelry Shop",
        text: `Matches: ${sceneNames}`
      },
      {
        id: "q_red",
        icon: "styler",
        title: "Red Clothing Match",
        text: `Matches: ${redNames}`
      },
      {
        id: "q_fp",
        icon: "biotech",
        title: "Fingerprint Match",
        text: `Matches: ${fingerprintNames}`
      },
      {
        id: "q_witness",
        icon: "record_voice_over",
        title: "Witnesses Near Crime Scene",
        text: `${witnessSceneText}`
      },
      {
        id: "q_scene_context",
        icon: "location_on",
        title: "Crime Scene Context",
        text: `Primary scene: Jewelry Shop. Suspects seen there: ${sceneNames}`
      },
      {
        id: "q_join",
        icon: "dataset_linked",
        title: "Evidence To Suspect Match",
        text: `Matches: ${evidenceMapText}`
      }
    );

    if (!suspects.length || !clues.length) {
      throw new Error("SQL bootstrap returned empty game data.");
    }

    dataLoaded = true;
  } catch (error) {
    console.error("Failed to load SQL game data:", error);
    suspects = [...FALLBACK_SUSPECTS];
    clues = [...FALLBACK_CLUES];
    dataLoaded = true;
  }
}

function getCulprit() {
  return suspects.find(culpritRule) || suspects[0];
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
  }
  timerId = null;
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    timeLeft -= 1;
    renderTimer();
    if (timeLeft <= 0) {
      endGame(false, null, true);
    }
  }, 1000);
}

function renderTimer() {
  const mins = String(Math.max(0, Math.floor(timeLeft / 60))).padStart(2, "0");
  const secs = String(Math.max(0, timeLeft % 60)).padStart(2, "0");
  document.getElementById("timer").textContent = `${mins}:${secs}`;
}

function renderAttempts() {
  const attemptsEl = document.getElementById("attempts");
  attemptsEl.textContent = String(attemptsLeft);
  attemptsEl.classList.toggle("danger-text", attemptsLeft <= 1);
}

function setProgress(step) {
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  progressText.textContent = `Stage ${step} of 4`;
  progressBar.style.width = `${step * 25}%`;
}

function showScreen(screenId) {
  const screens = ["storyScreen", "guideScreen", "stage1Screen", "stage2Screen", "stage3Screen", "stage4Screen"];
  screens.forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(screenId).classList.remove("hidden");
}

function updateStatus(message, ready) {
  const status = document.getElementById("statusMessage");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("ready", ready);
}

function renderSuspects(containerId, mode) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  suspects.forEach((suspect) => {
    const isInterrogated = interrogatedSuspects.has(suspect.id);
    const isAlreadyGuessed = guessedSuspects.has(suspect.id);

    const card = document.createElement("article");
    card.className = `suspect-card ${mode === "guess" ? "selectable" : "locked"}`;
    if (mode === "guess" && isAlreadyGuessed) {
      card.classList.add("disabled");
    }

    let intelMarkup = "";
    if (mode !== "guess") {
      intelMarkup = isInterrogated
        ? `
          <div class="tag-row">
            <span class="tag">Age: ${suspect.age}</span>
            <span class="tag">Role: ${suspect.role}</span>
            <span class="tag">Location: ${suspect.location}</span>
            <span class="tag">Jacket: ${suspect.jacket}</span>
            <span class="tag">Fingerprint: ${suspect.fingerprint}</span>
            <span class="tag">Late Entry: ${suspect.enteredLate}</span>
          </div>
          <p class="intel-locked">Alibi: ${suspect.alibi}</p>
        `
        : '<p class="intel-locked">No info visible. Interrogate this suspect to reveal details.</p>';
    }

    card.innerHTML = `
      <img src="${suspect.image}" alt="${suspect.name}">
      <div class="suspect-meta">
        <h3>${suspect.name}</h3>
        ${intelMarkup}
        ${mode === "interrogate" ? `
          <button class="ghost mini" data-action="interrogate" data-id="${suspect.id}">
            <span class="material-symbols-outlined">forum</span>
            ${isInterrogated ? "Re-Interrogate" : "Interrogate"}
          </button>
        ` : ""}
        ${mode === "guess" ? `
          <button class="primary mini" data-action="guess" data-id="${suspect.id}" ${isAlreadyGuessed ? "disabled" : ""}>
            <span class="material-symbols-outlined">gavel</span>
            ${isAlreadyGuessed ? "Already Guessed" : "Guess This Suspect"}
          </button>
        ` : ""}
      </div>
    `;

    if (mode === "interrogate") {
      const interrogateBtn = card.querySelector('[data-action="interrogate"]');
      interrogateBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        interrogateSuspect(suspect.id);
      });
    }

    if (mode === "guess") {
      const guessBtn = card.querySelector('[data-action="guess"]');
      guessBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleGuess(suspect);
      });

      card.addEventListener("click", () => {
        if (!isAlreadyGuessed) {
          handleGuess(suspect);
        }
      });
    }

    container.appendChild(card);
  });
}

function interrogateSuspect(suspectId) {
  interrogatedSuspects.add(suspectId);
  renderSuspects("suspectsContainer", "interrogate");
  updateStatus("Interrogation complete. Hidden details revealed for this suspect.", false);
}

function renderClues() {
  const clueContainer = document.getElementById("clueContainer");
  clueContainer.innerHTML = "";

  clues.forEach((clue) => {
    const reviewed = analyzedClues.has(clue.id);
    const card = document.createElement("article");
    card.className = "clue-card";
    card.innerHTML = `
      <div class="clue-top">
        <span class="material-symbols-outlined">${clue.icon}</span>
        <strong>${clue.title}</strong>
      </div>
      <p>${clue.text}</p>
      <button class="ghost" onclick="analyzeClue('${clue.id}')">
        <span class="material-symbols-outlined">analytics</span>
        ${reviewed ? "Rechecked" : "Analyze"}
      </button>
      <p class="analyzed">${reviewed ? "Clue analyzed and understood." : "Pending analysis."}</p>
    `;
    clueContainer.appendChild(card);
  });
}

function analyzeClue(clueId) {
  analyzedClues.add(clueId);
  renderClues();
}

function goToStory() {
  setProgress(0);
  showScreen("storyScreen");
  startStoryTyping();
}

function goToGuide() {
  setProgress(0);
  showScreen("guideScreen");
}

async function startGame() {
  await loadGameData();

  analyzedClues = new Set();
  interrogatedSuspects = new Set();
  guessedSuspects = new Set();
  attemptsLeft = 3;
  timeLeft = 300;

  renderTimer();
  renderAttempts();
  renderClues();
  renderSuspects("suspectsContainer", "interrogate");
  renderSuspects("accuseContainer", "guess");
  document.getElementById("guessMessage").textContent = "Make your best guess carefully.";
  updateStatus("Stage 1 active. Interrogate suspects first.", false);

  startTimer();
  goStage1();
}

function goStage1() {
  setProgress(1);
  showScreen("stage1Screen");
}

function goStage2() {
  setProgress(2);
  showScreen("stage2Screen");
}

function goStage3() {
  if (analyzedClues.size < clues.length) {
    showScreen("stage2Screen");
    setProgress(2);
    const remaining = clues.length - analyzedClues.size;
    const clueContainer = document.getElementById("clueContainer");
    if (clueContainer) {
      clueContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const stage2Title = document.querySelector("#stage2Screen .screen-head p");
    if (stage2Title) {
      stage2Title.textContent = `Analyze all clues first. ${remaining} clue(s) still need review before Stage 3 opens.`;
    }
    return;
  }

  setProgress(3);
  renderSuspects("accuseContainer", "guess");
  showScreen("stage3Screen");
}

function handleGuess(suspect) {
  if (attemptsLeft <= 0 || timeLeft <= 0) {
    return;
  }

  if (guessedSuspects.has(suspect.id)) {
    document.getElementById("guessMessage").textContent = "You already guessed this suspect. Try another one.";
    return;
  }

  guessedSuspects.add(suspect.id);

  if (culpritRule(suspect)) {
    endGame(true, suspect, false);
    return;
  }

  attemptsLeft -= 1;
  renderAttempts();

  if (attemptsLeft <= 0) {
    endGame(false, suspect, false);
    return;
  }

  document.getElementById("guessMessage").textContent = `Wrong guess. ${attemptsLeft} attempt(s) left.`;
  renderSuspects("accuseContainer", "guess");
}

function endGame(isSolved, guessedSuspect, timedOut) {
  stopTimer();
  setProgress(4);

  const culprit = getCulprit();
  const resultText = document.getElementById("resultText");
  const resultMeta = document.getElementById("resultMeta");
  const resultImage = document.getElementById("resultImage");

  if (isSolved && guessedSuspect) {
    resultImage.src = guessedSuspect.image;
    resultImage.alt = guessedSuspect.name;
    resultText.textContent = `You got it! ${guessedSuspect.name} is the culprit.`;
    resultText.className = "success";
    resultMeta.textContent = `Great job detective. You solved the case in ${document.getElementById("timer").textContent} with ${attemptsLeft} attempt(s) left.`;
  } else {
    resultImage.src = culprit.image;
    resultImage.alt = culprit.name;
    resultText.textContent = "Case Failed.";
    resultText.className = "fail";
    if (timedOut) {
      resultMeta.textContent = `Time is over. The culprit was ${culprit.name}.`;
    } else {
      resultMeta.textContent = `No attempts left. The culprit was ${culprit.name}.`;
    }
  }

  showScreen("stage4Screen");
}

function restartGame() {
  stopTimer();
  analyzedClues = new Set();
  interrogatedSuspects = new Set();
  guessedSuspects = new Set();
  attemptsLeft = 3;
  timeLeft = 300;
  renderAttempts();
  renderTimer();
  resetGuideChecklist();
  goToStory();
}

function startStoryTyping() {
  const narration = document.getElementById("storyNarration");
  if (!narration) {
    return;
  }

  if (typingTimerId) {
    clearInterval(typingTimerId);
  }

  narration.textContent = "";
  let idx = 0;
  typingTimerId = setInterval(() => {
    narration.textContent += storyText[idx];
    idx += 1;
    if (idx >= storyText.length) {
      clearInterval(typingTimerId);
      typingTimerId = null;
    }
  }, 16);
}

function setupGuideChecklist() {
  const checks = document.querySelectorAll(".rule-check");
  const startBtn = document.getElementById("startBtn");
  if (!checks.length || !startBtn) {
    return;
  }

  const refreshState = () => {
    const allChecked = Array.from(checks).every((check) => check.checked);
    startBtn.disabled = !allChecked;
    startBtn.innerHTML = allChecked
      ? '<span class="material-symbols-outlined">sports_esports</span>Start Game'
      : '<span class="material-symbols-outlined">sports_esports</span>Start Game (Unlock By Checking Rules)';
  };

  checks.forEach((check) => {
    check.addEventListener("change", refreshState);
  });

  refreshState();
}

function resetGuideChecklist() {
  const checks = document.querySelectorAll(".rule-check");
  checks.forEach((check) => {
    check.checked = false;
  });
  setupGuideChecklist();
}

setProgress(0);
renderTimer();
renderAttempts();
goToStory();
setupGuideChecklist();
