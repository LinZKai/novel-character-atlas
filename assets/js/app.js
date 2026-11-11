import { relationStyles, renderRelationshipGraph } from "./relationship-graph.js";

const state = {
  works: [],
  activeWork: null,
  characters: [],
  factions: [],
  relationships: [],
  search: "",
  importance: "all",
  faction: "all",
  relationshipType: "all"
};

const elements = {
  workSelect: document.querySelector("#work-select"),
  search: document.querySelector("#character-search"),
  importance: document.querySelector("#importance-filter"),
  faction: document.querySelector("#faction-filter"),
  relationshipType: document.querySelector("#relationship-filter"),
  clearFilters: document.querySelector("#clear-filters"),
  grid: document.querySelector("#character-grid"),
  empty: document.querySelector("#character-empty"),
  resultsCount: document.querySelector("#results-count"),
  graph: document.querySelector("#relationship-graph"),
  legend: document.querySelector("#relationship-legend"),
  relationshipList: document.querySelector("#relationship-list"),
  dialog: document.querySelector("#character-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close")
};

const importanceLabels = {
  primary: "核心人物",
  major: "重要人物",
  supporting: "篇章人物"
};

const statusLabels = {
  active: "活動中",
  deceased: "已身亡",
  missing: "失蹤"
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法載入 ${url}（${response.status}）`);
  return response.json();
};

const factionMap = () => new Map(state.factions.map((faction) => [faction.id, faction]));
const characterMap = () => new Map(state.characters.map((character) => [character.id, character]));

const displayFactionNames = (character) => {
  const map = factionMap();
  return character.factionIds.length ? character.factionIds.map((id) => map.get(id)?.name).filter(Boolean) : ["無所屬勢力"];
};

const fillText = (selector, value) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
};

function renderWorkMeta() {
  const work = state.activeWork;
  fillText("[data-work-title]", work.title);
  fillText("[data-work-author]", work.author);
  fillText("[data-coverage-label]", work.coverageLabel);
  fillText("[data-coverage-end]", work.coverageEndTitle);
  fillText("[data-work-description]", work.description);
  fillText("[data-disclaimer]", work.disclaimer);
  document.querySelector("#character-count").textContent = state.characters.length;
  document.querySelector("#relationship-count").textContent = state.relationships.length;
  document.querySelector("#faction-count").textContent = state.factions.length;
}

function populateFilters() {
  elements.faction.innerHTML = '<option value="all">全部勢力</option>';
  for (const faction of state.factions) {
    elements.faction.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(faction.id)}">${escapeHtml(faction.name)}</option>`);
  }

  const presentTypes = [...new Set(state.relationships.map((relationship) => relationship.type))];
  elements.relationshipType.innerHTML = '<option value="all">全部關係</option>';
  for (const type of presentTypes) {
    const style = relationStyles[type] ?? { label: type };
    elements.relationshipType.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(type)}">${escapeHtml(style.label)}</option>`);
  }

  elements.legend.replaceChildren();
  for (const type of presentTypes) {
    const style = relationStyles[type];
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = `<i class="legend-line" style="--relation-color: ${style.color}" aria-hidden="true"></i>${escapeHtml(style.label)}`;
    elements.legend.append(item);
  }
}

function filteredCharacters() {
  const query = state.search.trim().toLocaleLowerCase("zh-Hant");
  return state.characters.filter((character) => {
    const factionNames = displayFactionNames(character);
    const searchable = [character.name, ...character.aliases, character.role, character.summary, ...character.keywords, ...factionNames]
      .join(" ")
      .toLocaleLowerCase("zh-Hant");
    const matchesSearch = !query || searchable.includes(query);
    const matchesImportance = state.importance === "all" || character.importance === state.importance;
    const matchesFaction = state.faction === "all" || character.factionIds.includes(state.faction);
    return matchesSearch && matchesImportance && matchesFaction;
  });
}

function characterCard(character) {
  const factions = displayFactionNames(character);
  const aliases = character.aliases.length ? character.aliases.join("、") : "　";
  return `
    <button class="character-card" type="button" data-character-id="${escapeHtml(character.id)}" data-initial="${escapeHtml(character.name.at(0))}">
      <span class="card-topline">
        <span class="importance-badge">${escapeHtml(importanceLabels[character.importance])}</span>
        <span class="source-badge">原文核對</span>
      </span>
      <h3>${escapeHtml(character.name)}</h3>
      <span class="aliases">${escapeHtml(aliases)}</span>
      <span class="role">${escapeHtml(character.role)}</span>
      <span class="summary">${escapeHtml(character.summary)}</span>
      <span class="tag-row">${factions.map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("")}</span>
      <span class="chapter-link"><span>正文初登場</span><strong>第 ${character.firstAppearanceChapter} 章</strong></span>
    </button>`;
}

function renderCharacters() {
  const characters = filteredCharacters();
  elements.grid.innerHTML = characters.map(characterCard).join("");
  elements.empty.hidden = characters.length > 0;
  elements.resultsCount.textContent = `顯示 ${characters.length}／${state.characters.length} 位人物`;
  elements.grid.querySelectorAll("[data-character-id]").forEach((card) => {
    card.addEventListener("click", () => openCharacter(card.dataset.characterId));
  });
}

function relationshipsForCharacter(characterId) {
  return state.relationships.filter(
    (relationship) => relationship.sourceId === characterId || relationship.targetId === characterId
  );
}

function openCharacter(characterId) {
  const characters = characterMap();
  const character = characters.get(characterId);
  if (!character) return;
  const relations = relationshipsForCharacter(characterId);
  const factions = displayFactionNames(character);
  const aliases = character.aliases.length ? character.aliases.join("、") : "無";
  const relationMarkup = relations.length
    ? relations
        .map((relationship) => {
          const otherId = relationship.sourceId === character.id ? relationship.targetId : relationship.sourceId;
          const other = characters.get(otherId);
          return `<li><button type="button" data-related-character="${escapeHtml(otherId)}"><strong>${escapeHtml(other?.name ?? otherId)}</strong>｜${escapeHtml(relationship.label)}<br /><small>${escapeHtml(relationship.summary)}</small></button></li>`;
        })
        .join("")
    : "<li>目前沒有已收錄關係。</li>";

  elements.dialogContent.innerHTML = `
    <article class="dialog-profile">
      <p class="dialog-kicker">${escapeHtml(importanceLabels[character.importance])} · 原文核對</p>
      <h2 id="dialog-name">${escapeHtml(character.name)}</h2>
      <p class="aliases">${escapeHtml(aliases)}</p>
      <p class="dialog-summary">${escapeHtml(character.summary)}</p>
      <ul class="profile-facts">
        <li><span>人物定位</span><strong>${escapeHtml(character.role)}</strong></li>
        <li><span>所屬勢力</span><strong>${escapeHtml(factions.join("、"))}</strong></li>
        <li><span>首次登場</span><strong>正文第 ${character.firstAppearanceChapter} 章</strong></li>
        <li><span>本進度狀態</span><strong>${escapeHtml(statusLabels[character.status] ?? "未列入")}</strong></li>
        <li><span>安全閱讀進度</span><strong>正文第 ${character.spoilerChapter} 章後</strong></li>
        <li><span>核對章節</span><strong>${character.sourceChapters.map((chapter) => `第 ${chapter} 章`).join("、")}</strong></li>
      </ul>
      <section class="dialog-relations" aria-labelledby="dialog-relations-title">
        <h3 id="dialog-relations-title">已收錄人物關係</h3>
        <ul>${relationMarkup}</ul>
      </section>
    </article>`;

  elements.dialogContent.querySelectorAll("[data-related-character]").forEach((button) => {
    button.addEventListener("click", () => openCharacter(button.dataset.relatedCharacter));
  });

  if (!elements.dialog.open) elements.dialog.showModal();
}

function renderRelationshipList() {
  const characters = characterMap();
  const relationships =
    state.relationshipType === "all"
      ? state.relationships
      : state.relationships.filter((relationship) => relationship.type === state.relationshipType);
  elements.relationshipList.innerHTML = relationships
    .map(
      (relationship) => `<li><strong>${escapeHtml(characters.get(relationship.sourceId)?.name)}－${escapeHtml(relationship.label)}－${escapeHtml(characters.get(relationship.targetId)?.name)}</strong><br />${escapeHtml(relationship.summary)}</li>`
    )
    .join("");
}

function renderRelations() {
  renderRelationshipGraph({
    svg: elements.graph,
    characters: state.characters,
    relationships: state.relationships,
    activeType: state.relationshipType,
    onSelect: openCharacter
  });
  renderRelationshipList();
}

async function loadWork(workId) {
  const entry = state.works.find((work) => work.id === workId);
  if (!entry) throw new Error(`找不到作品 ${workId}`);
  const base = entry.dataPath;
  const [work, characters, factions, relationships] = await Promise.all([
    fetchJson(`${base}/work.json`),
    fetchJson(`${base}/characters.json`),
    fetchJson(`${base}/factions.json`),
    fetchJson(`${base}/relationships.json`)
  ]);
  state.activeWork = work;
  state.characters = characters;
  state.factions = factions;
  state.relationships = relationships;
  state.search = "";
  state.importance = "all";
  state.faction = "all";
  state.relationshipType = "all";
  elements.search.value = "";
  elements.importance.value = "all";
  renderWorkMeta();
  populateFilters();
  renderCharacters();
  renderRelations();
}

async function init() {
  state.works = await fetchJson("data/works.json");
  elements.workSelect.innerHTML = state.works
    .map((work) => `<option value="${escapeHtml(work.id)}">${escapeHtml(work.title)}</option>`)
    .join("");
  await loadWork(state.works[0].id);
}

elements.search.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCharacters();
});
elements.importance.addEventListener("change", (event) => {
  state.importance = event.target.value;
  renderCharacters();
});
elements.faction.addEventListener("change", (event) => {
  state.faction = event.target.value;
  renderCharacters();
});
elements.relationshipType.addEventListener("change", (event) => {
  state.relationshipType = event.target.value;
  renderRelations();
});
elements.workSelect.addEventListener("change", (event) => loadWork(event.target.value));
elements.clearFilters.addEventListener("click", () => {
  state.search = "";
  state.importance = "all";
  state.faction = "all";
  elements.search.value = "";
  elements.importance.value = "all";
  elements.faction.value = "all";
  renderCharacters();
  elements.search.focus();
});
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

init().catch((error) => {
  console.error(error);
  elements.resultsCount.textContent = "人物資料載入失敗，請確認網站是透過 HTTP 伺服器開啟。";
  elements.empty.hidden = false;
  elements.empty.textContent = error.message;
});
