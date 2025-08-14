const firebaseConfig = {
  apiKey: "AIzaSyA3D_wCMyR65nTT_WHpPjn4HvEsLA6RANc",
  authDomain: "dict-multilingual.firebaseapp.com",
  databaseURL: "https://dict-multilingual-default-rtdb.firebaseio.com",
  projectId: "dict-multilingual",
  storageBucket: "dict-multilingual.appspot.com",
  messagingSenderId: "330095453001",
  appId: "1:330095453001:web:4166435a9d2653cc23f098",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const fromLangSelect = document.getElementById("fromLang");
const toLangSelect = document.getElementById("toLang");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const addNewBtn = document.getElementById("addNewBtn");
const suggestionsDiv = document.getElementById("suggestions");
const entryDiv = document.getElementById("entry");
const editForm = document.getElementById("editForm");
const editWord = document.getElementById("editWord");
const editTranscription = document.getElementById("editTranscription");
const translationGroups = document.getElementById("translationGroups");
const addTranslationBtn = document.getElementById("addTranslationBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const sourceGroups = document.getElementById("sourceGroups");
const addSourceBtn = document.getElementById("addSourceBtn");
const editPos = document.getElementById("editPos");

let currentFromLang = "";
let currentToLang = "";
let currentEntryKey = "";
let isEditing = false;
let currentSuggestions = [];
let highlightedIndex = -1;

fromLangSelect.addEventListener("change", updateToLangOptions);
toLangSelect.addEventListener("change", () => {
  currentFromLang = fromLangSelect.value;
  currentToLang = toLangSelect.value;
});

searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});
searchBtn.addEventListener("click", performSearch);
addNewBtn.addEventListener("click", showAddNewForm);
cancelEditBtn.addEventListener("click", cancelEdit);
saveEditBtn.addEventListener("click", saveEntry);
addTranslationBtn.addEventListener("click", addTranslationGroup);
searchInput.addEventListener("keydown", handleSuggestionNavigation);
document.addEventListener("click", closeSuggestionsOnClickOutside);
addSourceBtn.addEventListener("click", addSourceGroup);

function updateToLangOptions() {
  const fromLang = fromLangSelect.value;
  toLangSelect.innerHTML = '<option value="">To...</option>';

  if (!fromLang) return;

  const languages = [
    "erzya",
    "estonian",
    "finnish",
    "hungarian",
    "ingrian",
    "karelian",
    "komi",
    "livonian",
    "mari",
    "moksha",
    "sami",
    "udmurt",
    "veps",
    "votic",
    "english",
    "german",
    "russian"
  ];
  const languageLabels = {
    erzya: "Erzya",
    estonian: "Estonian",
    finnish: "Finnish",
    hungarian: "Hungarian",
    ingrian: "Ingrian",
    karelian: "Karelian",
    komi: "Komi",
    livonian: "Livonian",
    mari: "Mari",
    moksha: "Moksha",
    sami: "Northern Sami",
    udmurt: "Udmurt",
    veps: "Veps",
    votic: "Votic",
    english: "English",
    german: "German",
    russian: "Russian"
  };
  languages.forEach((lang) => {
    if (lang !== fromLang) {
      const option = document.createElement("option");
      option.value = lang;
      option.textContent = languageLabels[lang];
      toLangSelect.appendChild(option);
    }
  });
}

function handleSearchInput() {
  const query = searchInput.value.trim().toLowerCase();
  highlightedIndex = -1;

  if (!query || query.length < 1 || !currentFromLang || !currentToLang) {
    suggestionsDiv.style.display = "none";
    return;
  }

  const direction = `${currentFromLang}_${currentToLang}`;
  const ref = database.ref(`dictionary/${direction}`);
  const SUGGESTION_LIMIT = 6;

  ref.orderByChild("word")
    .startAt(query)
    .endAt(query + "\uf8ff")
    .limitToFirst(SUGGESTION_LIMIT)
    .once("value", (snapshot) => {
      currentSuggestions = [];
      snapshot.forEach((childSnapshot) => {
        currentSuggestions.push({
          key: childSnapshot.key,
          word: childSnapshot.val().word,
        });
      });

      displaySuggestions(currentSuggestions);
    });
}

function displaySuggestions(results) {
  suggestionsDiv.innerHTML = "";

  if (results.length === 0) {
    suggestionsDiv.style.display = "none";
    return;
  }

  results.forEach((result, index) => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = result.word;
    div.addEventListener("click", () => {
      searchInput.value = result.word;
      performSearch();
      suggestionsDiv.style.display = "none";
    });

    if (searchInput.value) {
      const matchStart = result.word
        .toLowerCase()
        .indexOf(searchInput.value.toLowerCase());
      if (matchStart >= 0) {
        const before = result.word.substring(0, matchStart);
        const match = result.word.substring(
          matchStart,
          matchStart + searchInput.value.length
        );
        const after = result.word.substring(
          matchStart + searchInput.value.length
        );

        div.innerHTML = `${before}<strong>${match}</strong>${after}`;
      }
    }

    suggestionsDiv.appendChild(div);
  });

  suggestionsDiv.style.display = "block";
}

function performSearch() {
  const query = searchInput.value.trim();

  if (!currentFromLang || !currentToLang) {
    alert("Please select both source and target languages.");
    return;
  }

  if (!query) {
    alert("Please enter a word to search.");
    return;
  }

  suggestionsDiv.style.display = "none";

  const direction = `${currentFromLang}_${currentToLang}`;
  const ref = database.ref(`dictionary/${direction}`);

  ref.orderByChild("word")
    .equalTo(query)
    .once(
      "value",
      (snapshot) => {
        if (snapshot.exists()) {
          const key = Object.keys(snapshot.val())[0];
          loadEntry(key);
        } else {
          alert("No entries match your search.");
        }
      },
      (error) => {
        alert("No entries match your search.");
      }
    );
}

function handleSuggestionNavigation(e) {
  if (
    !suggestionsDiv.style.display ||
    suggestionsDiv.style.display === "none"
  )
    return;

  const items = suggestionsDiv.querySelectorAll(".suggestion-item");

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % items.length;
      updateHighlight();
      break;
    case "ArrowUp":
      e.preventDefault();
      highlightedIndex =
        (highlightedIndex - 1 + items.length) % items.length;
      updateHighlight();
      break;
    case "Enter":
      if (highlightedIndex >= 0) {
        e.preventDefault();
        const selected = currentSuggestions[highlightedIndex];
        searchInput.value = selected.word;
        performSearch();
        suggestionsDiv.style.display = "none";
      }
      break;
    case "Escape":
      suggestionsDiv.style.display = "none";
      break;
  }
}

function updateHighlight() {
  const items = suggestionsDiv.querySelectorAll(".suggestion-item");
  items.forEach((item, index) => {
    item.classList.toggle("highlighted", index === highlightedIndex);
  });

  if (highlightedIndex >= 0) {
    items[highlightedIndex].scrollIntoView({
      block: "nearest",
    });
  }
}

function closeSuggestionsOnClickOutside(e) {
  if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
    suggestionsDiv.style.display = "none";
  }
}

function loadEntry(key) {
  currentEntryKey = key;
  const direction = `${currentFromLang}_${currentToLang}`;
  const ref = database.ref(`dictionary/${direction}/${key}`);

  ref.once("value", (snapshot) => {
    const entry = snapshot.val();
    displayEntry(entry);
  });
}

function displayEntry(entry) {
  let transcriptionDisplay = "";
  if (entry.transcription) {
    const transcriptions = entry.transcription
      .split(",")
      .map((t) => t.trim());
    transcriptionDisplay = transcriptions.map(t => `<span class="slash">/</span>${t}<span class="slash">/</span>`).join(", ");
  }

  let wordAndPos = `<span class="entry-word">${entry.word}</span>`;
  if (entry.pos) {
    wordAndPos += `<span class="entry-pos">${entry.pos}</span>`;
  }

  let html = `
        <div class="word-and-pos">${wordAndPos}</div>
        <div class="entry-transcription">${transcriptionDisplay}</div>
        <div class="translations">
    `;

  if (entry.translations) {
    entry.translations.forEach((trans, index) => {
      html += `
                <div class="translation">
                    <div class="translation-meaning">${
                        index + 1
                    }. ${trans.meaning}</div>
                    <div class="examples">
            `;

      if (trans.examples) {
        trans.examples.forEach((ex) => {
          html += `
                        <div class="example">
                            <b>${ex.source}</b>&ensp;${ex.target}
                        </div>
                    `;
        });
      }

      html += `</div></div>`;
    });
  }

  html += `</div>`;

  if (entry.sources && entry.sources.length > 0) {
    html += `
            <div class="sources">
                <h3>Sources</h3>
                <ul>
                    ${entry.sources
                        .map(
                            (source) =>
                                `<li>${source}</li>`
                        )
                        .join("")}
                </ul>
            </div>
        `;
  }

  entryDiv.innerHTML = html;
  entryDiv.style.display = "block";
  editForm.style.display = "none";

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => showEditForm(entry));
  entryDiv.appendChild(editBtn);
}

function showAddNewForm() {
  if (!currentFromLang || !currentToLang) {
    alert("Please select both source and target languages.");
    return;
  }

  isEditing = false;
  currentEntryKey = "";
  const searchTerm = searchInput.value.trim();
  editWord.value = searchTerm || "";
  editPos.value = "";
  editTranscription.value = "";
  translationGroups.innerHTML = "";
  sourceGroups.innerHTML = "";
  addTranslationGroup();
  addSourceGroup();

  entryDiv.style.display = "none";
  editForm.style.display = "block";

  if (searchTerm) {
    editTranscription.focus();
  }
}

function showEditForm(entry) {
  isEditing = true;
  editWord.value = entry.word;
  editWord.dataset.originalWord = entry.word;
  editPos.value = entry.pos || "";
  editTranscription.value = entry.transcription || "";
  translationGroups.innerHTML = "";
  sourceGroups.innerHTML = "";

  if (entry.translations) {
    entry.translations.forEach((trans) => {
      const transGroup = document.createElement("div");
      transGroup.className = "translation-group";

      const meaningContainer = document.createElement("div");
      meaningContainer.className = "translation-meaning-container";

      const meaningInput = document.createElement("input");
      meaningInput.type = "text";
      meaningInput.className = "translation-meaning";
      meaningInput.value = trans.meaning;
      transGroup.appendChild(meaningInput);

      const addExampleBtnContainer = document.createElement("div");
      addExampleBtnContainer.className = "add-example-btn-container";

      const addExampleBtn = document.createElement("button");
      addExampleBtn.className = "add-example-btn";
      addExampleBtn.textContent = "Add Example";
      addExampleBtn.addEventListener("click", () =>
        addExampleGroup(transGroup)
      );
      transGroup.appendChild(addExampleBtn);

      const removeTransBtn = document.createElement("button");
      removeTransBtn.className = "remove-translation-btn remove-btn";
      removeTransBtn.textContent = "✖";
      removeTransBtn.addEventListener("click", () => transGroup.remove());
      transGroup.appendChild(removeTransBtn);

      const examplesDiv = document.createElement("div");
      examplesDiv.className = "examples";

      if (trans.examples) {
        trans.examples.forEach((ex) => {
          const exGroup = document.createElement("div");
          exGroup.className = "example-group";

          const sourceInput = document.createElement("input");
          sourceInput.type = "text";
          sourceInput.className = "example-source";
          sourceInput.value = ex.source;
          exGroup.appendChild(sourceInput);

          const targetInput = document.createElement("input");
          targetInput.type = "text";
          targetInput.className = "example-target";
          targetInput.value = ex.target;
          exGroup.appendChild(targetInput);

          const removeExBtn = document.createElement("button");
          removeExBtn.className = "remove-example-btn remove-btn";
          removeExBtn.textContent = "✖";
          removeExBtn.addEventListener("click", () =>
            exGroup.remove()
          );
          exGroup.appendChild(removeExBtn);

          examplesDiv.appendChild(exGroup);
        });
      }

      transGroup.appendChild(examplesDiv);
      translationGroups.appendChild(transGroup);
    });
  } else {
    addTranslationGroup();
  }

  if (entry.sources && entry.sources.length > 0) {
    entry.sources.forEach((source) => {
      const group = document.createElement("div");
      group.className = "source-group";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "source-input";
      input.value = source;
      group.appendChild(input);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-source-btn remove-btn";
      removeBtn.textContent = "✖";
      removeBtn.addEventListener("click", () => group.remove());
      group.appendChild(removeBtn);

      sourceGroups.appendChild(group);
    });
  } else {
    addSourceGroup();
  }

  entryDiv.style.display = "none";
  editForm.style.display = "block";
}

function cancelEdit() {
  editForm.style.display = "none";
  if (currentEntryKey) {
    loadEntry(currentEntryKey);
  } else {
    entryDiv.style.display = "none";
  }
}

function saveEntry() {
  const word = editWord.value.trim();
  if (!word) {
    alert("Please enter a word.");
    return;
  }

  const direction = `${currentFromLang}_${currentToLang}`;
  const ref = database.ref(`dictionary/${direction}`);

  const checkForDuplicate = () => {
    return new Promise((resolve) => {
      if (isEditing && word === editWord.dataset.originalWord) {
        resolve(false);
        return;
      }

      ref.orderByChild("word")
        .equalTo(word)
        .once("value", (snapshot) => {
          resolve(snapshot.exists());
        });
    });
  };

  checkForDuplicate().then((isDuplicate) => {
    if (isDuplicate) {
      alert("An entry with this word already exists in this language direction.");
      return;
    }

    const sources = [];
    document.querySelectorAll(".source-input").forEach((input) => {
      const value = input.value.trim();
      if (value) sources.push(value);
    });

    const translations = [];
    const transGroups = translationGroups.querySelectorAll(".translation-group");

    transGroups.forEach((group) => {
      const meaning = group.querySelector(".translation-meaning").value.trim();
      if (!meaning) return;

      const examples = [];
      const exGroups = group.querySelectorAll(".example-group");

      exGroups.forEach((exGroup) => {
        const source = exGroup.querySelector(".example-source").value.trim();
        const target = exGroup.querySelector(".example-target").value.trim();

        if (source && target) {
          examples.push({
            source,
            target
          });
        }
      });

      translations.push({
        meaning,
        examples: examples.length ? examples : null,
      });
    });

    if (translations.length === 0) {
      alert("At least one translation is required.");
      return;
    }

    const entry = {
      word,
      pos: editPos.value || null,
      transcription: editTranscription.value.trim().replace(/\s*,\s*/g, ",") || null,
      translations,
      sources: sources.length ? sources : null,
    };

    if (isEditing) {
      ref.child(currentEntryKey).update(entry);
    } else {
      ref.push(entry);
    }

    editForm.style.display = "none";
    searchInput.value = word;
    performSearch();
  });
}

function addTranslationGroup() {
  const group = document.createElement("div");
  group.className = "translation-group";

  const meaningContainer = document.createElement("div");
  meaningContainer.className = "translation-meaning-container";

  const meaningInput = document.createElement("input");
  meaningInput.type = "text";
  meaningInput.className = "translation-meaning";
  meaningInput.placeholder = "Translation";
  group.appendChild(meaningInput);

  const addExampleBtn = document.createElement("button");
  addExampleBtn.className = "add-example-btn";
  addExampleBtn.textContent = "Add Example";
  addExampleBtn.addEventListener("click", () => addExampleGroup(group));
  group.appendChild(addExampleBtn);

  const removeTransBtn = document.createElement("button");
  removeTransBtn.className = "remove-translation-btn remove-btn";
  removeTransBtn.textContent = "✖";
  removeTransBtn.addEventListener("click", function() {
    if (translationGroups.children.length > 1) {
      group.remove();
    }
  });
  group.appendChild(removeTransBtn);

  const examplesDiv = document.createElement("div");
  examplesDiv.className = "examples";
  group.appendChild(examplesDiv);

  translationGroups.appendChild(group);
}

function addExampleGroup(transGroup) {
  const examplesDiv = transGroup.querySelector(".examples");

  const group = document.createElement("div");
  group.className = "example-group";

  const sourceInput = document.createElement("input");
  sourceInput.type = "text";
  sourceInput.className = "example-source";
  sourceInput.placeholder = "Source language example";
  group.appendChild(sourceInput);

  const targetInput = document.createElement("input");
  targetInput.type = "text";
  targetInput.className = "example-target";
  targetInput.placeholder = "Target language example";
  group.appendChild(targetInput);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-example-btn remove-btn";
  removeBtn.textContent = "✖";
  removeBtn.addEventListener("click", () => group.remove());
  group.appendChild(removeBtn);

  examplesDiv.appendChild(group);
}

function addSourceGroup() {
  const group = document.createElement("div");
  group.className = "source-group";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "source-input";
  input.placeholder = "Source reference";
  group.appendChild(input);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-source-btn remove-btn";
  removeBtn.textContent = "✖";
  removeBtn.addEventListener("click", () => group.remove());
  group.appendChild(removeBtn);

  sourceGroups.appendChild(group);
}