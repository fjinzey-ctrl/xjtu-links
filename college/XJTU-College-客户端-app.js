const fallbackDefaultData = { academies: [], schools: [] };
const dataSource = window.XJTU_COLLEGE_DEFAULT_DATA || fallbackDefaultData;
const academySource = dataSource.academySource || "https://www.xjtu.edu.cn/bksy.htm";
const schoolSource = dataSource.schoolSource || "https://www.xjtu.edu.cn/yxsz.htm";
const majorSource = dataSource.majorSource || "https://dean.xjtu.edu.cn/info/1271/9087.htm";
const defaultContent = JSON.parse(JSON.stringify({
  pageContent: dataSource.pageContent || {},
  academies: dataSource.academies || [],
  schools: dataSource.schools || [],
}));
const pageContent = JSON.parse(JSON.stringify(defaultContent.pageContent));
const academies = JSON.parse(JSON.stringify(defaultContent.academies));
const schools = JSON.parse(JSON.stringify(defaultContent.schools));

function readContentOverride() {
  try {
    const raw = localStorage.getItem("xjtuCollegeContentOverride");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.academies) || !Array.isArray(parsed.schools)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const defaultAcademyById = new Map(defaultContent.academies.map((item) => [item.id, item]));
const defaultSchoolById = new Map(defaultContent.schools.map((item) => [item.id, item]));
const mergeWithDefault = (item, defaults) => ({ ...(defaults.get(item.id) || {}), ...item });

const override = readContentOverride();
if (override) {
  Object.assign(pageContent, override.pageContent || {});
  academies.splice(0, academies.length, ...override.academies.map((item) => mergeWithDefault(item, defaultAcademyById)));
  schools.splice(0, schools.length, ...override.schools.map((item) => mergeWithDefault(item, defaultSchoolById)));
}

const allItems = academies.concat(schools);
const state = {
  query: "",
  filter: "all",
  directoryMode: "academies",
  selectedByWorld: {
    academies: null,
    schools: null,
  },
};

const statsEl = document.querySelector("#stats");
const globalSearch = document.querySelector("#globalSearch");
const clearSearch = document.querySelector("#clearSearch");
const modeFilters = document.querySelector("#modeFilters");
const toolbar = document.querySelector(".toolbar");
const academyWorld = document.querySelector("#academyWorld");
const schoolWorld = document.querySelector("#schoolWorld");
const academyInspector = document.querySelector("#academyInspector");
const schoolInspector = document.querySelector("#schoolInspector");
const directoryList = document.querySelector("#directoryList");

const filterDefs = [
  { id: "all", label: "全部" },
  { id: "major", label: "含本科专业" },
  { id: "理", label: "理" },
  { id: "工", label: "工" },
  { id: "医", label: "医" },
  { id: "文", label: "文" },
  { id: "法", label: "法" },
  { id: "经", label: "经" },
  { id: "管", label: "管" },
  { id: "哲", label: "哲" },
  { id: "其他", label: "其他" },
];

const colors = [
  "rgba(185, 28, 28, 0.18)",
  "rgba(37, 99, 168, 0.18)",
  "rgba(22, 129, 95, 0.18)",
  "rgba(183, 121, 31, 0.2)",
];

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function searchableText(item) {
  return [
    item.name,
    item.officialNameZh,
    item.officialNameEn,
    item.officialAbbr,
    item.summary,
    item.focus,
    item.degreeCategory,
    item.location,
    item.useful,
    ...(item.scope || []),
    ...(item.majors || []),
    ...(item.graduatePoints || []),
    ...((item.detailSections || []).flatMap((section) => [section.title, section.text, ...(section.items || [])])),
    ...(item.keywords || []),
  ].join(" ").toLowerCase();
}

function matchesQuery(item) {
  const query = state.query.trim().toLowerCase();
  return !query || searchableText(item).includes(query);
}

function matchesFilter(item) {
  if (state.filter === "all") return true;
  if (item.type === "academy") return true;
  if (state.filter === "major") return item.type === "school" && item.majors?.some((major) => !major.includes("未单列") && !major.includes("研究生"));
  if (state.filter === "哲") return item.type === "school" && (item.degreeCategory === "哲" || item.majors?.some((major) => major.includes("哲学")));
  if (["理", "工", "医", "文", "法", "经", "管", "其他"].includes(state.filter)) return item.type === "school" && item.degreeCategory === state.filter;
  return true;
}

function filtered(items) {
  return items.filter((item) => matchesQuery(item) && matchesFilter(item));
}

function renderStats() {
  const majorSet = new Set();
  schools.forEach((school) => {
    school.majors
      .filter((major) => !major.includes("未单列") && !major.includes("研究生"))
      .forEach((major) => majorSet.add(major));
  });
  const officialSingle = schools.filter((school) => school.majors.some((major) => !major.includes("未单列") && !major.includes("研究生"))).length;
  const stats = [
    ["9", "本科书院"],
    ["35", "学院 / 平台"],
    [String(majorSet.size), "专业关键词"],
    [String(officialSingle), "有专业表对应单位"],
  ];
  statsEl.innerHTML = stats.map(([number, label]) => `<div class="stat"><strong>${number}</strong><span>${label}</span></div>`).join("");
}

function setText(id, value) {
  const el = document.querySelector(`#${id}`);
  if (el && value !== undefined) el.textContent = value;
}

function renderPageContent() {
  setText("navTitle", pageContent.navTitle);
  if (Array.isArray(pageContent.navLinks)) {
    document.querySelector("#navLinks").innerHTML = pageContent.navLinks
      .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
      .join("");
  }
  setText("heroKicker", pageContent.heroKicker);
  setText("heroTitle", pageContent.heroTitle);
  setText("heroLead", pageContent.heroLead);
  setText("sourceTitle", pageContent.sourceTitle);
  if (Array.isArray(pageContent.sourceItems)) {
    document.querySelector("#sourceItems").innerHTML = pageContent.sourceItems
      .map((item) => `<li><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.text)}</span></li>`)
      .join("");
  }
  if (pageContent.searchPlaceholder) globalSearch.placeholder = pageContent.searchPlaceholder;
  setText("accountKicker", pageContent.accountKicker);
  setText("accountTitle", pageContent.accountTitle);
  setText("accountLead", pageContent.accountLead);
  if (Array.isArray(pageContent.checklist)) {
    document.querySelector("#checkGrid").innerHTML = pageContent.checklist
      .map((card) => `
        <article class="check-card ${card.priority ? "priority" : ""}">
          <span class="check-index">${escapeHtml(card.index)}</span>
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.text)}</p>
        </article>
      `)
      .join("");
  }
  setText("mapKicker", pageContent.mapKicker);
  setText("mapTitle", pageContent.mapTitle);
  setText("academyTitle", pageContent.academyTitle);
  setText("academyHint", pageContent.academyHint);
  setText("schoolTitle", pageContent.schoolTitle);
  setText("schoolHint", pageContent.schoolHint);
  setText("directoryKicker", pageContent.directoryKicker);
  setText("directoryTitle", pageContent.directoryTitle);
  setText("directoryLead", pageContent.directoryLead);
  setText("footerNote", pageContent.footerNote);
  setText("siteFooter", pageContent.footerText);
  if (pageContent.heroTitle) document.title = pageContent.heroTitle;
}

function renderFilters() {
  modeFilters.innerHTML = filterDefs
    .map((filter) => `<button class="filter-btn ${state.filter === filter.id ? "active" : ""}" type="button" data-filter="${filter.id}">${filter.label}</button>`)
    .join("");
  modeFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      state.selectedByWorld.schools = null;
      updateFilterButtons();
      renderDirectory();
      schedulePhysicsRefresh("schools");
    });
  });
}

function updateFilterButtons() {
  modeFilters.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function highlight(text) {
  const query = state.query.trim();
  if (!query) return escapeHtml(text);
  const safe = escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(escaped, "gi"), (match) => `<mark>${match}</mark>`);
}

function renderInspector(target, item, type) {
  if (!item) {
    target.innerHTML = `
      <div class="inspector-empty">
        <p>点击${type === "academy" ? "书院" : "学院"}小球查看详情。选中后小球会放大，并推动周围小球产生碰撞。</p>
      </div>
    `;
    return;
  }

  const isAcademy = item.type === "academy";
  const list = isAcademy ? item.scope : item.majors;
  const displayName = !isAcademy && item.officialNameZh ? item.officialNameZh : item.name;
  const officialEnglish = !isAcademy && item.officialNameEn
    ? `${item.officialNameEn}${item.officialAbbr ? ` (${item.officialAbbr})` : ""}`
    : "";
  const sections = item.detailSections?.length ? item.detailSections : [
    { title: "本科入口", items: item.majors || [] },
    { title: "学位门类", items: [item.degreeCategory].filter(Boolean) },
    { title: "实用关注", text: item.focus || "" },
    { title: "硕博/学科信息", items: item.graduatePoints || [] },
  ];
  const usefulText = (text) => String(text || "")
    .replace(item.summary || "", "")
    .replace(/本科入口主要包括：[^。]*。/g, "")
    .trim();
  target.innerHTML = `
    <div class="inspect-logo"><img src="${item.logo}" alt="${escapeHtml(displayName)}徽标"></div>
    <h3>${escapeHtml(displayName)}</h3>
    ${officialEnglish ? `<div class="official-en">${escapeHtml(officialEnglish)}</div>` : ""}
    <div class="meta-line">${isAcademy ? "书院管辖 / 归属范围" : "本科专业 / 方向"}</div>
    <p>${escapeHtml(item.summary)}</p>
    ${isAcademy ? `<p><strong>关注建议：</strong>${escapeHtml(item.useful)}</p><p><strong>位置：</strong>${escapeHtml(item.location)}</p>` : ""}
    ${isAcademy ? `
      <div class="tag-list">
        ${list.map((entry) => `<span class="tag">${highlight(entry)}</span>`).join("")}
      </div>
    ` : sections.map((section) => `
      <section class="detail-block">
        <h4>${escapeHtml(section.title)}</h4>
        ${section.text ? `<p>${highlight(section.title === "实用关注" ? usefulText(section.text) : section.text)}</p>` : ""}
        ${section.items?.length ? `
          <div class="${section.title.includes("本科") ? "major-list" : "tag-list"}">
            ${section.items.map((entry) => `<span class="${section.title.includes("本科") ? "major-pill" : "tag"}">${highlight(entry)}</span>`).join("")}
          </div>
        ` : ""}
      </section>
    `).join("")}
    <a class="source-link" href="${item.source}" target="_blank" rel="noreferrer">
      <span>官网来源</span>
      <code>${escapeHtml(item.source)}</code>
    </a>
  `;
}

function renderDirectory() {
  const base = state.directoryMode === "academies" ? academies : schools;
  const items = filtered(base);
  if (!items.length) {
    directoryList.innerHTML = `<div class="empty-state">没有找到匹配内容。换个关键词或切回“全部”。</div>`;
    return;
  }

  directoryList.innerHTML = items.map((item) => {
    const isAcademy = item.type === "academy";
    const list = isAcademy ? item.scope : item.majors;
    return `
      <article class="directory-card" data-id="${item.id}">
        <img src="${item.logo}" alt="${escapeHtml(item.name)}徽标" loading="lazy">
        <div>
          <h3>${highlight(item.name)}</h3>
          <p>${highlight(item.summary)}</p>
          <div class="${isAcademy ? "tag-list" : "major-list"}">
            ${list.map((entry) => `<span class="${isAcademy ? "tag" : "major-pill"}">${highlight(entry)}</span>`).join("")}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

const physicsWorlds = {
  academies: {
    el: academyWorld,
    inspector: academyInspector,
    type: "academy",
    nodes: [],
    rafId: null,
    lastTime: 0,
    rect: { width: 0, height: 0 },
    baseRadius: 70,
    selectedRadius: 150,
    selectedId: null,
  },
  schools: {
    el: schoolWorld,
    inspector: schoolInspector,
    type: "school",
    nodes: [],
    rafId: null,
    lastTime: 0,
    rect: { width: 0, height: 0 },
    baseRadius: 54,
    selectedRadius: 112,
    selectedId: null,
  },
};

function createBubble(world, item, index) {
  const el = document.createElement("div");
  el.className = `bubble ${world.type === "school" ? "school-bubble" : "academy-bubble"}`;
  el.style.setProperty("--bubble-tone", colors[index % colors.length]);
  el.innerHTML = `
    <button type="button" aria-label="查看${escapeHtml(item.name)}">
      <img src="${item.logo}" alt="" draggable="false">
      <span class="bubble-name">${escapeHtml(item.name)}</span>
    </button>
  `;
  el.querySelector("button").addEventListener("click", () => selectBubble(world, item.id, true));
  world.el.appendChild(el);
  return el;
}

function visiblePhysicsItems(world) {
  const base = world.type === "academy" ? academies : schools;
  return filtered(base);
}

function initPhysicsWorld(worldKey) {
  const world = physicsWorlds[worldKey];
  cancelAnimationFrame(world.rafId);
  world.rafId = null;
  world.el.innerHTML = "";
  world.nodes = [];
  world.selectedId = null;
  state.selectedByWorld[worldKey] = null;
  renderInspector(world.inspector, null, world.type);

  const items = visiblePhysicsItems(world);
  const rect = world.el.getBoundingClientRect();
  world.rect = { width: Math.max(rect.width, 320), height: Math.max(rect.height, 360) };
  const narrowWorld = world.rect.width < 620;
  const baseRadius = narrowWorld
    ? Math.min(world.baseRadius, world.type === "academy" ? 58 : 46)
    : world.baseRadius;
  const selectedRadius = narrowWorld
    ? Math.min(world.selectedRadius, world.rect.width * (world.type === "academy" ? 0.32 : 0.27))
    : world.selectedRadius;
  const cols = Math.max(2, Math.floor(world.rect.width / (baseRadius * 2.35)));

  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = Math.min(world.rect.width - baseRadius - 8, 28 + baseRadius + col * baseRadius * 2.28 + (row % 2) * baseRadius * 0.7);
    const y = Math.min(world.rect.height - baseRadius - 8, 28 + baseRadius + row * baseRadius * 2.2);
    world.nodes.push({
      item,
      el: createBubble(world, item, index),
      x,
      y,
      vx: (Math.random() - 0.5) * 0.72,
      vy: (Math.random() - 0.5) * 0.72,
      r: baseRadius,
      baseRadius,
      selectedRadius,
      targetRadius: baseRadius,
    });
  });

  world.lastTime = performance.now();
  world.rafId = requestAnimationFrame((now) => stepPhysics(world, now));
}

function initAllPhysics() {
  initPhysicsWorld("academies");
  initPhysicsWorld("schools");
}

function schedulePhysicsRefresh(worldKey) {
  clearTimeout(window.__physicsFilterTimer);
  window.__physicsFilterTimer = setTimeout(() => {
    if (worldKey) {
      initPhysicsWorld(worldKey);
    } else {
      initAllPhysics();
    }
  }, 90);
}

function selectBubble(world, id, impulse) {
  const node = world.nodes.find((entry) => entry.item.id === id);
  if (!node) return;

  world.selectedId = world.selectedId === id ? null : id;
  const worldKey = world.type === "academy" ? "academies" : "schools";
  state.selectedByWorld[worldKey] = world.selectedId;

  world.nodes.forEach((entry) => {
    const active = entry.item.id === world.selectedId;
    entry.targetRadius = active ? entry.selectedRadius : entry.baseRadius;
    entry.el.classList.toggle("active", active);
  });

  renderInspector(world.inspector, world.selectedId ? node.item : null, world.type);

  if (impulse && world.selectedId) {
    world.nodes.forEach((entry) => {
      if (entry === node) return;
      const dx = entry.x - node.x || 1;
      const dy = entry.y - node.y || 1;
      const distance = Math.hypot(dx, dy);
      const push = Math.max(0.7, 2.55 - distance / 230);
      entry.vx += (dx / distance) * push;
      entry.vy += (dy / distance) * push;
    });
  }
}

function stepPhysics(world, now) {
  const dt = Math.min(32, now - world.lastTime || 16) / 16;
  world.lastTime = now;
  const width = world.el.clientWidth || world.rect.width;
  const height = world.el.clientHeight || world.rect.height;
  world.rect = { width, height };

  for (const node of world.nodes) {
    node.r += (node.targetRadius - node.r) * 0.12;
    node.vx += Math.sin(now * 0.00042 + node.x * 0.018) * 0.006;
    node.vy += Math.cos(now * 0.00038 + node.y * 0.017) * 0.006;
    node.x += node.vx * dt;
    node.y += node.vy * dt;

    const minX = node.r + 4;
    const minY = node.r + 4;
    const maxX = width - node.r - 4;
    const maxY = height - node.r - 4;

    if (node.x < minX) {
      node.x = minX;
      node.vx = Math.abs(node.vx) * 0.92 + 0.08;
    } else if (node.x > maxX) {
      node.x = maxX;
      node.vx = -Math.abs(node.vx) * 0.92 - 0.08;
    }
    if (node.y < minY) {
      node.y = minY;
      node.vy = Math.abs(node.vy) * 0.92 + 0.08;
    } else if (node.y > maxY) {
      node.y = maxY;
      node.vy = -Math.abs(node.vy) * 0.92 - 0.08;
    }
  }

  for (let i = 0; i < world.nodes.length; i += 1) {
    for (let j = i + 1; j < world.nodes.length; j += 1) {
      const a = world.nodes[i];
      const b = world.nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.001;
    const minDistance = a.r + b.r + 7;
      if (distance < minDistance) {
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        a.x -= nx * overlap * 0.52;
        a.y -= ny * overlap * 0.52;
        b.x += nx * overlap * 0.52;
        b.y += ny * overlap * 0.52;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const impact = relVx * nx + relVy * ny;
        const bounce = Math.max(0.08, -impact * 0.72 + 0.04);
        a.vx -= nx * bounce;
        a.vy -= ny * bounce;
        b.vx += nx * bounce;
        b.vy += ny * bounce;
      }
    }
  }

  for (const node of world.nodes) {
    const speed = Math.hypot(node.vx, node.vy);
    if (speed > 3.2) {
      node.vx = (node.vx / speed) * 3.2;
      node.vy = (node.vy / speed) * 3.2;
    }
    if (speed < 0.14) {
      node.vx += (Math.random() - 0.5) * 0.08;
      node.vy += (Math.random() - 0.5) * 0.08;
    }
    node.vx *= 0.998;
    node.vy *= 0.998;
    node.el.style.width = `${node.r * 2}px`;
    node.el.style.height = `${node.r * 2}px`;
    node.el.style.transform = `translate(${node.x - node.r}px, ${node.y - node.r}px)`;
  }

  world.rafId = requestAnimationFrame((time) => stepPhysics(world, time));
}

function renderAll() {
  renderPageContent();
  renderStats();
  renderFilters();
  renderDirectory();
}

document.querySelectorAll("[data-directory]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-directory]").forEach((entry) => entry.classList.remove("active"));
    button.classList.add("active");
    state.directoryMode = button.dataset.directory;
    renderDirectory();
  });
});

globalSearch.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.selectedByWorld.academies = null;
  state.selectedByWorld.schools = null;
  renderDirectory();
  schedulePhysicsRefresh();
});

clearSearch.addEventListener("click", () => {
  state.query = "";
  globalSearch.value = "";
  state.filter = "all";
  renderAll();
  schedulePhysicsRefresh();
});

window.addEventListener("resize", () => {
  clearTimeout(window.__physicsResizeTimer);
  window.__physicsResizeTimer = setTimeout(initAllPhysics, 160);
  toolbarMetrics = null;
  window.__toolbarResizeTimer = setTimeout(() => {
    captureToolbarMetrics();
    updateFloatingSearch();
  }, 170);
});

let toolbarMetrics = null;

function captureToolbarMetrics() {
  toolbar.classList.remove("is-floating");
  toolbar.style.removeProperty("--float-left");
  toolbar.style.removeProperty("--float-top");
  toolbar.style.removeProperty("--float-width");
  toolbar.style.removeProperty("--float-scale");
  const rect = toolbar.getBoundingClientRect();
  toolbarMetrics = {
    startTop: rect.top + window.scrollY,
    startLeft: rect.left,
    startWidth: rect.width,
    targetTop: window.innerWidth <= 680 ? 12 : 18,
    targetRight: window.innerWidth <= 680 ? 12 : 18,
    targetWidth: Math.min(window.innerWidth <= 680 ? 320 : 360, window.innerWidth - (window.innerWidth <= 680 ? 24 : 36)),
  };
}

function updateFloatingSearch() {
  if (!toolbarMetrics) captureToolbarMetrics();
  const progress = Math.max(0, Math.min(1, (window.scrollY - toolbarMetrics.startTop + 90) / 260));
  const ease = progress * progress * (3 - 2 * progress);
  const targetLeft = Math.max(toolbarMetrics.targetRight, window.innerWidth - toolbarMetrics.targetRight - toolbarMetrics.targetWidth);
  const baseTop = toolbarMetrics.startTop - window.scrollY;
  const currentLeft = toolbarMetrics.startLeft + (targetLeft - toolbarMetrics.startLeft) * ease;
  const currentTop = baseTop + (toolbarMetrics.targetTop - baseTop) * ease;
  const currentWidth = toolbarMetrics.startWidth + (toolbarMetrics.targetWidth - toolbarMetrics.startWidth) * ease;
  const scale = 1 - 0.08 * ease;

  toolbar.classList.toggle("is-floating", progress > 0.02);
  toolbar.style.setProperty("--float-left", `${currentLeft}px`);
  toolbar.style.setProperty("--float-top", `${currentTop}px`);
  toolbar.style.setProperty("--float-width", `${currentWidth}px`);
  toolbar.style.setProperty("--float-scale", String(scale));
}
window.addEventListener("scroll", updateFloatingSearch, { passive: true });
captureToolbarMetrics();
updateFloatingSearch();

renderAll();
initAllPhysics();

window.__xjtuCollegeData = { pageContent, academies, schools, allItems, defaults: defaultContent };
