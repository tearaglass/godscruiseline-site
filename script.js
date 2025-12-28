import { records } from "./records-data.js";
import { projects } from "./projects-data.js";

// Sets footer year without hard-coding.
const yearEl = document.querySelector("[data-year]");
if (yearEl) {
  yearEl.textContent = "2026";
}

const STATUS_LABELS = {
  public: "Public",
  registered: "Registered",
  authorized: "Authorized",
  restricted: "Restricted"
};

const DIVISION_LABELS = {
  broadcast: "Broadcast",
  works: "Works",
  research: "Research",
  narrative: "Narrative",
  exchange: "Exchange",
  access: "Access"
};

const MEDIUM_LABELS = {
  text: "Text",
  audio: "Audio",
  video: "Video",
  system: "System",
  image: "Image",
  dataset: "Dataset",
  artifact: "Artifact"
};

const PUBLIC_PLACEHOLDER = "Content pending publication.";
const RESTRICTED_NOTICE = "This record is not available at your clearance level.";
const MISSING_RECORD = "Record unavailable.";
const MISSING_PROJECT = "Project unavailable.";
const ARCHIVED_NOTICE = "Archived for reference.";
const DECAY_NOTICE = "This record is no longer available.";
const CLEARANCE_LEVELS = ["public", "registered", "witness", "authorized", "restricted"];
const CLEARANCE_STORAGE_KEY = "gc_clearance";
const ADMIN_STORAGE_KEY = "gc_admin";

function getClearance() {
  const stored = localStorage.getItem(CLEARANCE_STORAGE_KEY);
  if (CLEARANCE_LEVELS.includes(stored)) {
    return stored;
  }
  localStorage.setItem(CLEARANCE_STORAGE_KEY, "public");
  return "public";
}

function setClearance(level) {
  if (!CLEARANCE_LEVELS.includes(level)) {
    return;
  }
  localStorage.setItem(CLEARANCE_STORAGE_KEY, level);
}

function isAdmin() {
  return localStorage.getItem(ADMIN_STORAGE_KEY) === "true";
}

function setAdmin(value) {
  if (value) {
    localStorage.setItem(ADMIN_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
}

function getClearanceRank(level) {
  const index = CLEARANCE_LEVELS.indexOf(level);
  return index === -1 ? 0 : index;
}

function getRestrictedNotice() {
  if (typeof getClearance === "function" && getClearance() === "witness") {
    return "This record remains sealed.";
  }
  return RESTRICTED_NOTICE;
}

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

function formatDivision(division) {
  return DIVISION_LABELS[division] || division;
}

function formatMedium(medium) {
  return MEDIUM_LABELS[medium] || medium;
}

function renderRecordRows(recordList, tableBody) {
  tableBody.textContent = "";
  recordList.forEach((record) => {
    const row = document.createElement("tr");
    row.dataset.status = record.status;
    const archivalState = record.archival?.state || "active";
    row.dataset.archival = archivalState;
    row.classList.toggle("record-decayed", archivalState === "decayed");

    const idCell = document.createElement("td");
    idCell.textContent = record.id;

    const titleCell = document.createElement("td");
    const titleLink = document.createElement("a");
    titleLink.href = `record.html?id=${encodeURIComponent(record.id)}`;
    titleLink.textContent = record.title;
    titleLink.dataset.status = record.status;
    titleCell.appendChild(titleLink);

    const divisionCell = document.createElement("td");
    divisionCell.textContent = formatDivision(record.division);

    const yearCell = document.createElement("td");
    yearCell.textContent = record.year;

    const statusCell = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.textContent = formatStatus(record.status);
    statusSpan.className = `status status-${record.status}`;
    statusCell.appendChild(statusSpan);

    if (archivalState === "archived") {
      const archivalSpan = document.createElement("span");
      archivalSpan.className = "meta archival-indicator";
      archivalSpan.textContent = "Archived";
      statusCell.appendChild(archivalSpan);
    }

    row.append(idCell, titleCell, divisionCell, yearCell, statusCell);
    tableBody.appendChild(row);
  });
}

function attachRestrictedNotice(tableBody, noticeEl) {
  if (tableBody.dataset.noticeBound === "true") {
    return;
  }
  tableBody.dataset.noticeBound = "true";

  tableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const row = target.closest("tr");
    if (!row || row.dataset.status !== "restricted") {
      return;
    }

    event.preventDefault();
    if (noticeEl) {
      noticeEl.textContent = getRestrictedNotice();
      noticeEl.hidden = false;
    }
  });
}

function renderRecordsTable() {
  const tableBody = document.querySelector("[data-records-body]");
  if (!tableBody) {
    return;
  }

  const notice = document.querySelector("[data-records-notice]");
  const recordList = records.slice();
  const charterIndex = recordList.findIndex((entry) => entry.id === "GC-R-000");
  if (charterIndex === -1) {
    recordList.unshift({
      id: "GC-R-000",
      title: "System Charter",
      division: "access",
      medium: "system",
      year: 2036,
      status: "public"
    });
  } else if (charterIndex > 0) {
    const [charter] = recordList.splice(charterIndex, 1);
    recordList.unshift(charter);
  }
  renderRecordRows(recordList, tableBody);
  attachRestrictedNotice(tableBody, notice);
}

function renderRecordDetail() {
  const titleEl = document.querySelector("[data-record-title]");
  const statusEl = document.querySelector("[data-record-status]");
  const contentEl = document.querySelector("[data-record-content]");
  const fieldEls = document.querySelectorAll("[data-field]");
  const archivalTermEl = document.querySelector("[data-archival-term]");
  const archivalNoteEl = document.querySelector("[data-archival-note]");

  if (
    !titleEl ||
    !statusEl ||
    !contentEl ||
    fieldEls.length === 0 ||
    !archivalTermEl ||
    !archivalNoteEl
  ) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const recordId = params.get("id");
  let record = records.find((entry) => entry.id === recordId);
  if (!record && recordId === "GC-R-000") {
    record = {
      id: "GC-R-000",
      title: "System Charter",
      division: "access",
      medium: "system",
      year: 2036,
      status: "public"
    };
  }

  if (!record) {
    titleEl.textContent = MISSING_RECORD;
    statusEl.textContent = MISSING_RECORD;
    contentEl.textContent = "";
    archivalTermEl.textContent = "";
    archivalNoteEl.textContent = "";
    archivalTermEl.style.display = "none";
    archivalNoteEl.style.display = "none";
    fieldEls.forEach((fieldEl) => {
      fieldEl.textContent = "";
    });
    return;
  }

  titleEl.textContent = record.title;
  const fieldValues = {
    id: record.id,
    division: formatDivision(record.division),
    medium: formatMedium(record.medium),
    year: String(record.year),
    status: formatStatus(record.status)
  };

  fieldEls.forEach((fieldEl) => {
    const key = fieldEl.dataset.field;
    fieldEl.textContent = fieldValues[key] || "";
  });

  const archivalState = record.archival?.state || "active";
  if (archivalState === "archived") {
    archivalTermEl.textContent = "Archival";
    archivalNoteEl.textContent = ARCHIVED_NOTICE;
    archivalTermEl.style.display = "";
    archivalNoteEl.style.display = "";
  } else {
    archivalTermEl.textContent = "";
    archivalNoteEl.textContent = "";
    archivalTermEl.style.display = "none";
    archivalNoteEl.style.display = "none";
  }

  if (archivalState === "decayed") {
    statusEl.textContent = DECAY_NOTICE;
    contentEl.textContent = "";
    return;
  }

  const isCharterRecord = record.id === "GC-R-000";
  const hasCharterContent = isCharterRecord && record.content;

  if (hasCharterContent) {
    statusEl.textContent = "";
    contentEl.textContent = record.content;
  } else if (record.status === "public") {
    statusEl.textContent = "";
    contentEl.textContent = PUBLIC_PLACEHOLDER;
  } else {
    statusEl.textContent = getRestrictedNotice();
    contentEl.textContent = "";
  }

  if (hasCharterContent && typeof getClearance === "function" && typeof setClearance === "function") {
    const charterInitiated = localStorage.getItem("gc_charter_initiated");
    if (charterInitiated === "true") {
      return;
    }

    let clearanceUpgradeTriggered = false;
    let clearanceTimerReady = false;

    const isEligible = () => {
      if (clearanceUpgradeTriggered || !clearanceTimerReady) {
        return false;
      }
      const rect = contentEl.getBoundingClientRect();
      return rect.bottom <= window.innerHeight;
    };

    const tryUpgrade = () => {
      if (!isEligible()) {
        return;
      }
      clearanceUpgradeTriggered = true;
      if (getClearance() === "public") {
        setClearance("registered");
      }
      localStorage.setItem("gc_charter_initiated", "true");
      window.removeEventListener("scroll", tryUpgrade);
    };

    window.setTimeout(() => {
      clearanceTimerReady = true;
      tryUpgrade();
    }, 20000);

    window.addEventListener("scroll", tryUpgrade, { passive: true });
  }
}

function renderProjectsIndex() {
  const tableBody = document.querySelector("[data-projects-body]");
  if (!tableBody) {
    return;
  }

  projects.forEach((project) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const nameLink = document.createElement("a");
    nameLink.href = `project.html?id=${encodeURIComponent(project.id)}`;
    nameLink.textContent = project.name;
    nameCell.appendChild(nameLink);

    const descriptionCell = document.createElement("td");
    descriptionCell.textContent = project.description;

    const statusCell = document.createElement("td");
    statusCell.textContent = formatStatus(project.status);

    row.append(nameCell, descriptionCell, statusCell);
    tableBody.appendChild(row);
  });
}

function recordMatchesProject(record, projectId) {
  if (!record.project) {
    return false;
  }
  if (Array.isArray(record.project)) {
    return record.project.includes(projectId);
  }
  return record.project === projectId;
}

function renderProjectDetail() {
  const nameEl = document.querySelector("[data-project-name]");
  const descriptionEl = document.querySelector("[data-project-description]");
  const statusEl = document.querySelector("[data-project-status]");
  const tableBody = document.querySelector("[data-project-records-body]");
  const noticeEl = document.querySelector("[data-project-records-notice]");

  if (!nameEl || !descriptionEl || !statusEl || !tableBody) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");
  const project = projects.find((entry) => entry.id === projectId);

  if (!project) {
    nameEl.textContent = MISSING_PROJECT;
    descriptionEl.textContent = "";
    statusEl.textContent = "";
    tableBody.textContent = "";
    return;
  }

  nameEl.textContent = project.name;
  descriptionEl.textContent = project.description;
  statusEl.textContent = formatStatus(project.status);

  const projectRecords = records.filter((record) =>
    recordMatchesProject(record, project.id)
  );
  renderRecordRows(projectRecords, tableBody);
  attachRestrictedNotice(tableBody, noticeEl);
}

function parseCSV(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || null;
  }
  return parts;
}

function downloadJSON(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function initRecordForm() {
  const form = document.querySelector('form.form[aria-label="File record"]');
  if (!form) {
    return;
  }

  const noticeEl = form.querySelector("[data-form-notice]");
  const requiredFields = ["id", "title", "division", "medium", "year", "status", "archivalState"];
  const archivalStateEl = form.querySelector('select[data-record-field="archivalState"]');
  const archivalNoteEl = form.querySelector('textarea[data-record-field="archivalNote"]');

  const syncArchivalNoteVisibility = (state) => {
    if (!archivalNoteEl) {
      return;
    }
    if (state === "archived" || state === "decayed") {
      archivalNoteEl.hidden = false;
      return;
    }
    archivalNoteEl.hidden = true;
    archivalNoteEl.value = "";
  };

  if (archivalStateEl) {
    syncArchivalNoteVisibility(archivalStateEl.value);
    archivalStateEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }
      syncArchivalNoteVisibility(target.value);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const fieldEls = form.querySelectorAll("[data-record-field]");
    const fields = {};
    fieldEls.forEach((fieldEl) => {
      const key = fieldEl.dataset.recordField;
      if (!key) {
        return;
      }
      if (fieldEl instanceof HTMLInputElement || fieldEl instanceof HTMLTextAreaElement || fieldEl instanceof HTMLSelectElement) {
        fields[key] = fieldEl.value.trim();
      }
    });

    const missingRequired = requiredFields.some((key) => !fields[key]);
    if (missingRequired) {
      if (noticeEl) {
        noticeEl.textContent = "Submission failed. Required fields missing.";
        noticeEl.hidden = false;
      }
      return;
    }

    const yearNumber = Number(fields.year);
    const record = {
      id: fields.id,
      title: fields.title,
      division: fields.division,
      medium: fields.medium,
      year: yearNumber,
      status: fields.status
    };

    const authorValue = parseCSV(fields.author || "");
    if (authorValue) {
      record.author = authorValue;
    }

    if (fields.origin) {
      record.origin = fields.origin;
    }

    if (fields.sourceRef) {
      record.sourceRef = fields.sourceRef;
    }

    if (fields.dateCreated) {
      record.dateCreated = fields.dateCreated;
    }

    if (fields.datePublished) {
      record.datePublished = fields.datePublished;
    }

    const tagsValue = parseCSV(fields.tags || "");
    if (tagsValue) {
      record.tags = tagsValue;
    }

    if (fields.sensitivityLevel) {
      record.sensitivity = {
        level: fields.sensitivityLevel,
        note: fields.sensitivityNote || ""
      };
    }

    if (fields.context) {
      record.context = fields.context;
    }

    const projectValue = parseCSV(fields.project || "");
    if (projectValue) {
      record.project = projectValue;
    }

    if (fields.archivalState && fields.archivalState !== "active") {
      record.archival = {
        state: fields.archivalState,
        since: yearNumber,
        note: fields.archivalNote || ""
      };
    }

    downloadJSON(record, `record_${fields.id}.json`);

    if (noticeEl) {
      noticeEl.textContent = `Record ${fields.id} filed successfully.`;
      noticeEl.hidden = false;
    }
  });
}

function initProjectForm() {
  const form = document.querySelector('form.form[aria-label="Register project"]');
  if (!form) {
    return;
  }

  const noticeEl = form.querySelector("[data-form-notice]");
  const requiredFields = ["id", "name", "status"];

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const fieldEls = form.querySelectorAll("[data-project-field]");
    const fields = {};
    fieldEls.forEach((fieldEl) => {
      const key = fieldEl.dataset.projectField;
      if (!key) {
        return;
      }
      if (fieldEl instanceof HTMLInputElement || fieldEl instanceof HTMLTextAreaElement || fieldEl instanceof HTMLSelectElement) {
        fields[key] = fieldEl.value.trim();
      }
    });

    const missingRequired = requiredFields.some((key) => !fields[key]);
    if (missingRequired) {
      if (noticeEl) {
        noticeEl.textContent = "Submission failed. Required fields missing.";
        noticeEl.hidden = false;
      }
      return;
    }

    const project = {
      id: fields.id,
      name: fields.name,
      status: fields.status
    };

    if (fields.description) {
      project.description = fields.description;
    }

    if (fields.lead) {
      project.lead = fields.lead;
    }

    if (fields.scope) {
      project.scope = fields.scope;
    }

    if (fields.startYear) {
      const startYear = Number(fields.startYear);
      if (!Number.isNaN(startYear)) {
        project.startYear = startYear;
      }
    }

    if (fields.endYear) {
      const endYear = Number(fields.endYear);
      if (!Number.isNaN(endYear)) {
        project.endYear = endYear;
      }
    }

    downloadJSON(project, `project_${fields.id}.json`);

    if (noticeEl) {
      noticeEl.textContent = `Project ${fields.id} registered successfully.`;
      noticeEl.hidden = false;
    }
  });
}

function initAnnotations() {
  const annotationsSection = document.querySelector("[data-annotations]");
  if (!annotationsSection) {
    return;
  }

  const listEl = annotationsSection.querySelector("[data-annotation-list]");
  const emptyEl = annotationsSection.querySelector("[data-annotation-empty]");
  const formEl = annotationsSection.querySelector(".annotation-form");
  const inputEl = annotationsSection.querySelector("[data-annotation-input]");
  const noticeEl = annotationsSection.querySelector("[data-annotation-notice]");

  if (!listEl || !emptyEl || !formEl || !inputEl) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const recordId = params.get("id");
  if (!recordId) {
    return;
  }

  const storageKey = `annotations:${recordId}`;

  const loadAnnotations = () => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const saveAnnotations = (items) => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toISOString().slice(0, 10);
  };

  const renderAnnotations = (items) => {
    listEl.textContent = "";

    if (!items.length) {
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    items.forEach((annotation) => {
      const itemEl = document.createElement("li");
      itemEl.className = "annotation";

      const bodyEl = document.createElement("p");
      bodyEl.className = "annotation-body";
      bodyEl.textContent = annotation.text;

      const metaEl = document.createElement("p");
      metaEl.className = "meta annotation-meta";
      metaEl.textContent = "Recorded ";

      const timeEl = document.createElement("time");
      timeEl.textContent = formatDate(annotation.timestamp);
      metaEl.appendChild(timeEl);

      itemEl.append(bodyEl, metaEl);
      listEl.appendChild(itemEl);
    });
  };

  let annotations = loadAnnotations();
  renderAnnotations(annotations);

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = inputEl.value.trim();
    if (!text) {
      return;
    }

    const next = { text, timestamp: Date.now() };
    annotations = [...annotations, next];
    saveAnnotations(annotations);
    renderAnnotations(annotations);
    inputEl.value = "";

    if (noticeEl) {
      noticeEl.textContent = "Annotation recorded.";
      noticeEl.hidden = false;
    }
  });
}

function applyClearanceUI() {
  if (typeof getClearance !== "function") {
    return;
  }
  const clearance = getClearance();
  const clearanceRank = getClearanceRank(clearance);
  const navLinks = document.querySelectorAll('nav ul li a[href]');
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }
    const listItem = link.closest("li");
    if (!listItem) {
      return;
    }
    if (clearance === "public") {
      listItem.hidden = !(href === "system.html" || href === "records.html");
      return;
    }
    if (href === "divisions.html") {
      listItem.hidden = clearanceRank < getClearanceRank("authorized");
      return;
    }
    listItem.hidden = false;
  });

  const annotationsSection = document.querySelector("[data-annotations]");
  if (annotationsSection) {
    annotationsSection.hidden = !isAdmin() && clearanceRank < getClearanceRank("witness");
  }
  const annotationForm = document.querySelector(".annotation-form");
  if (annotationForm) {
    annotationForm.hidden = !isAdmin() && clearance === "registered";
  }

  const footerGrids = document.querySelectorAll(".footer-grid");
  footerGrids.forEach((grid) => {
    const existing = grid.querySelector("[data-clearance-indicator]");
    if (existing) {
      existing.remove();
    }
  });

  if (window.location.pathname.endsWith("/access.html") || window.location.pathname.endsWith("access.html")) {
    const accessFooter = document.querySelector(".footer-grid");
    if (accessFooter && clearance === "witness") {
      const clearanceEl = document.createElement("span");
      clearanceEl.dataset.clearanceIndicator = "true";
      clearanceEl.textContent = "Clearance: Witness";
      accessFooter.appendChild(clearanceEl);
    }
  }

  const internalToolsSection = document.querySelector('section[aria-label="Internal tools"]');
  if (internalToolsSection) {
    const internalLinks = internalToolsSection.querySelectorAll('a[href="file-record.html"], a[href="register-project.html"]');
    const showTools = isAdmin() || clearanceRank >= getClearanceRank("authorized");
    internalLinks.forEach((link) => {
      link.hidden = !showTools;
    });
    const separator = internalToolsSection.querySelector('span[aria-hidden="true"]');
    if (separator) {
      separator.hidden = !showTools;
    }
    const metaRows = internalToolsSection.querySelectorAll(".meta");
    metaRows.forEach((row) => {
      if (row.querySelector('a[href="file-record.html"]') || row.querySelector('a[href="register-project.html"]')) {
        row.hidden = !showTools;
      }
    });
  }
}

function initPassphraseInput() {
  const form = document.querySelector('form.form[aria-label="Passphrase input"]');
  if (!form) {
    return;
  }
  const input = form.querySelector("#passphrase-input");
  const noticeEl = form.querySelector("[data-passphrase-notice]");
  if (!input || !noticeEl) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value === "agata") {
      setClearance("witness");
      noticeEl.textContent = "Recorded.";
      noticeEl.hidden = false;
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
      return;
    }
    if (value === "agata-internal-operator") {
      setAdmin(true);
      noticeEl.textContent = "Access state updated.";
      noticeEl.hidden = false;
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
      return;
    }
    noticeEl.textContent = "No change.";
    noticeEl.hidden = false;
  });
}

function initRestrictedForms() {
  if (typeof getClearance !== "function") {
    return;
  }
  const clearanceRank = getClearanceRank(getClearance());
  if (clearanceRank >= getClearanceRank("authorized") || isAdmin()) {
    return;
  }
  const forms = document.querySelectorAll(
    'form.form[aria-label="File record"], form.form[aria-label="Register project"]'
  );
  forms.forEach((form) => {
    const noticeEl = form.querySelector("[data-form-notice]");
    if (noticeEl) {
      noticeEl.textContent = "Access restricted.";
      noticeEl.hidden = false;
    }
    const fields = form.querySelectorAll("input, select, textarea, button");
    fields.forEach((field) => {
      field.disabled = true;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  });
}

renderRecordsTable();
renderRecordDetail();
renderProjectsIndex();
renderProjectDetail();
initRecordForm();
initProjectForm();
initAnnotations();
applyClearanceUI();
initPassphraseInput();
initRestrictedForms();
