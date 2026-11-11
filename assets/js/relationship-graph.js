const SVG_NS = "http://www.w3.org/2000/svg";

export const relationStyles = {
  family: { label: "親屬", color: "#d8a657" },
  romance: { label: "情感", color: "#d96c72" },
  mentor: { label: "師徒", color: "#76a9c9" },
  ally: { label: "同盟／合作", color: "#75b894" },
  enemy: { label: "敵對", color: "#d05a4f" },
  rival: { label: "競爭／衝突", color: "#c78c50" },
  "same-faction": { label: "同門／同勢力", color: "#8c91ad" },
  "leader-subordinate": { label: "主從／上下屬", color: "#a481c1" },
  debt: { label: "恩情／承諾", color: "#b6a36d" }
};

const createSvgElement = (name, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};

const computePositions = (characters, relationships) => {
  const width = 1000;
  const height = 700;
  const center = { x: width / 2, y: height / 2 };
  const primary = characters.find((character) => character.importance === "primary") ?? characters[0];
  const connectedToPrimary = new Set(
    relationships
      .filter((relationship) => relationship.sourceId === primary.id || relationship.targetId === primary.id)
      .flatMap((relationship) => [relationship.sourceId, relationship.targetId])
  );
  connectedToPrimary.delete(primary.id);

  const inner = characters.filter((character) => connectedToPrimary.has(character.id));
  const outer = characters.filter((character) => character.id !== primary.id && !connectedToPrimary.has(character.id));
  const positions = new Map([[primary.id, center]]);

  inner.forEach((character, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / inner.length;
    const radiusX = inner.length > 11 ? 295 : 260;
    const radiusY = inner.length > 11 ? 235 : 210;
    positions.set(character.id, {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY
    });
  });

  outer.forEach((character, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * (index + 0.5)) / Math.max(outer.length, 1);
    positions.set(character.id, {
      x: center.x + Math.cos(angle) * 430,
      y: center.y + Math.sin(angle) * 300
    });
  });

  return positions;
};

export function renderRelationshipGraph({ svg, characters, relationships, activeType = "all", onSelect }) {
  svg.replaceChildren();
  const visibleRelationships =
    activeType === "all" ? relationships : relationships.filter((relationship) => relationship.type === activeType);
  const connectedIds = new Set(visibleRelationships.flatMap((relationship) => [relationship.sourceId, relationship.targetId]));
  const positions = computePositions(characters, relationships);
  const characterMap = new Map(characters.map((character) => [character.id, character]));

  const edgeLayer = createSvgElement("g", { class: "edge-layer" });
  const nodeLayer = createSvgElement("g", { class: "node-layer" });
  svg.append(edgeLayer, nodeLayer);

  for (const relationship of relationships) {
    const start = positions.get(relationship.sourceId);
    const end = positions.get(relationship.targetId);
    if (!start || !end) continue;
    const style = relationStyles[relationship.type] ?? { color: "#aaa", label: relationship.label };
    const line = createSvgElement("line", {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      class: `graph-edge${activeType !== "all" && relationship.type !== activeType ? " is-muted" : ""}`,
      style: `--edge-color: ${style.color}`,
      "data-source": relationship.sourceId,
      "data-target": relationship.targetId,
      "data-type": relationship.type
    });
    const title = createSvgElement("title");
    title.textContent = `${characterMap.get(relationship.sourceId)?.name ?? ""}－${relationship.label}－${characterMap.get(relationship.targetId)?.name ?? ""}`;
    line.append(title);
    edgeLayer.append(line);
  }

  for (const character of characters) {
    const position = positions.get(character.id);
    if (!position) continue;
    const isMuted = activeType !== "all" && !connectedIds.has(character.id);
    const group = createSvgElement("g", {
      class: `graph-node${character.importance === "primary" ? " is-primary" : ""}${isMuted ? " is-muted" : ""}`,
      transform: `translate(${position.x} ${position.y})`,
      tabindex: "0",
      role: "button",
      "aria-label": `查看${character.name}人物資料`,
      "data-character-id": character.id
    });
    const circle = createSvgElement("circle", { r: character.importance === "primary" ? 48 : 37 });
    const name = createSvgElement("text", { y: character.name.length > 3 ? 6 : 7 });
    name.textContent = character.name;
    const title = createSvgElement("title");
    title.textContent = `${character.name}｜${character.role}`;
    group.append(circle, name, title);

    const select = () => {
      svg.querySelectorAll(".graph-node").forEach((node) => node.classList.toggle("is-focus", node === group));
      svg.querySelectorAll(".graph-edge").forEach((edge) => {
        const touchesNode = edge.dataset.source === character.id || edge.dataset.target === character.id;
        edge.classList.toggle("is-focus", touchesNode);
        if (activeType === "all") edge.classList.toggle("is-muted", !touchesNode);
      });
      onSelect?.(character.id);
    };

    group.addEventListener("click", select);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
    group.addEventListener("blur", () => {
      svg.querySelectorAll(".graph-node").forEach((node) => node.classList.remove("is-focus"));
      svg.querySelectorAll(".graph-edge").forEach((edge) => {
        edge.classList.remove("is-focus");
        if (activeType === "all") edge.classList.remove("is-muted");
      });
    });
    nodeLayer.append(group);
  }
}
