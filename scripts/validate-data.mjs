import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (...parts) => JSON.parse(await readFile(path.join(projectRoot, ...parts), "utf8"));
const errors = [];
const allowedImportance = new Set(["primary", "major", "supporting"]);
const allowedSourceModes = new Set(["text-verified", "user-confirmed"]);
const allowedStatuses = new Set(["active", "deceased", "missing"]);
const allowedRelationTypes = new Set([
  "family",
  "romance",
  "mentor",
  "ally",
  "enemy",
  "rival",
  "same-faction",
  "leader-subordinate",
  "debt"
]);
const unresolvedText = /待確認|未知|暫定|可能是|也許/;

const assertUnique = (items, label, workId) => {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`${workId}: ${label} ID 重複：${item.id}`);
    seen.add(item.id);
  }
};

const works = await readJson("data", "works.json");
assertUnique(works, "作品", "全站");

for (const workEntry of works) {
  const base = ["data", "works", workEntry.id];
  const [work, characters, factions, relationships] = await Promise.all([
    readJson(...base, "work.json"),
    readJson(...base, "characters.json"),
    readJson(...base, "factions.json"),
    readJson(...base, "relationships.json")
  ]);

  if (work.id !== workEntry.id) errors.push(`${workEntry.id}: work.json ID 不一致`);
  assertUnique(characters, "人物", work.id);
  assertUnique(factions, "勢力", work.id);
  assertUnique(relationships, "關係", work.id);

  const characterIds = new Set(characters.map((item) => item.id));
  const factionIds = new Set(factions.map((item) => item.id));

  for (const character of characters) {
    if (!character.name || !character.role || !character.summary) errors.push(`${work.id}: 人物 ${character.id} 缺少必要文字`);
    if (!allowedImportance.has(character.importance)) errors.push(`${work.id}: 人物 ${character.id} importance 無效`);
    if (!allowedSourceModes.has(character.sourceMode)) errors.push(`${work.id}: 人物 ${character.id} sourceMode 無效`);
    if (character.status && !allowedStatuses.has(character.status)) errors.push(`${work.id}: 人物 ${character.id} status 無效`);
    if (character.summary.length > 80) errors.push(`${work.id}: 人物 ${character.id} 摘要超過 80 字`);
    if (character.spoilerChapter > work.coverageThroughChapter) errors.push(`${work.id}: 人物 ${character.id} 超出章節上限`);
    if (unresolvedText.test(JSON.stringify(character))) errors.push(`${work.id}: 人物 ${character.id} 含未決文字`);
    for (const factionId of character.factionIds ?? []) {
      if (!factionIds.has(factionId)) errors.push(`${work.id}: 人物 ${character.id} 引用不存在勢力 ${factionId}`);
    }
  }

  for (const faction of factions) {
    if (!allowedSourceModes.has(faction.sourceMode)) errors.push(`${work.id}: 勢力 ${faction.id} sourceMode 無效`);
    if (faction.summary.length > 80) errors.push(`${work.id}: 勢力 ${faction.id} 摘要超過 80 字`);
    if (faction.spoilerChapter > work.coverageThroughChapter) errors.push(`${work.id}: 勢力 ${faction.id} 超出章節上限`);
  }

  for (const relation of relationships) {
    if (!characterIds.has(relation.sourceId) || !characterIds.has(relation.targetId)) {
      errors.push(`${work.id}: 關係 ${relation.id} 引用不存在人物`);
    }
    if (!allowedRelationTypes.has(relation.type)) errors.push(`${work.id}: 關係 ${relation.id} type 無效`);
    if (!allowedSourceModes.has(relation.sourceMode)) errors.push(`${work.id}: 關係 ${relation.id} sourceMode 無效`);
    if (relation.spoilerChapter > work.coverageThroughChapter) errors.push(`${work.id}: 關係 ${relation.id} 超出章節上限`);
    if (unresolvedText.test(JSON.stringify(relation))) errors.push(`${work.id}: 關係 ${relation.id} 含未決文字`);
  }
}

const dataDirectories = await readdir(path.join(projectRoot, "data", "works"), { withFileTypes: true });
for (const directory of dataDirectories.filter((item) => item.isDirectory())) {
  if (!works.some((work) => work.id === directory.name)) errors.push(`作品資料夾未列入 works.json：${directory.name}`);
}

if (errors.length) {
  console.error(`資料驗證失敗（${errors.length} 項）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const characterTotal = await Promise.all(works.map((work) => readJson("data", "works", work.id, "characters.json")));
const relationshipTotal = await Promise.all(works.map((work) => readJson("data", "works", work.id, "relationships.json")));
console.log(`資料驗證通過：${works.length} 部作品、${characterTotal.flat().length} 位人物、${relationshipTotal.flat().length} 條關係。`);
