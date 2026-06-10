// R&D L2 Planning Dashboard - Apps Script Backend

const SHEET_NAME  = "Sheet1";
const TASKS_SHEET = "Tasks";
const MILESTONES  = ["CA", "Prod. Def.", "Design", "DR CAAV&PRKF", "Proto", "VT", "DVP", "DR TOGO&ISVA"];

// ── Web App entry ────────────────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile("dashboard")
    .setTitle("R&D L2 Planning")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Sheets menu ──────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 Dashboard")
    .addItem("Dashboard'u Aç", "openDashboard")
    .addToUi();
}

function openDashboard() {
  const html = HtmlService.createHtmlOutputFromFile("dashboard")
    .setWidth(1400).setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "R&D L2 Planning");
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === TASKS_SHEET) {
      sheet.getRange(1, 1, 1, 6).setValues([["Project","Milestone","Task","Status","Week","Owner"]]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function getCurrentWeekNumber() {
  const now  = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day  = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ── Main data load ───────────────────────────────────────────────────────────
function getDashboardData() {
  const sheet = getSheet(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const currentWeek = getCurrentWeekNumber();

  const projects = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    let url = "";
    try { url = sheet.getRange(i + 1, 1).getRichTextValue().getLinkUrl() || ""; } catch(e) {}

    const milestones = {};
    for (let j = 1; j < headers.length; j++) {
      if (headers[j]) milestones[String(headers[j]).trim()] = row[j] != null ? String(row[j]).trim() : "";
    }
    projects.push({ name: String(row[0]).trim(), url, milestones });
  }
  return { projects, milestones: MILESTONES, currentWeek };
}

// ── Project tasks ────────────────────────────────────────────────────────────
function getProjectTasks(projectName) {
  const sheet = getSheet(TASKS_SHEET);
  const data  = sheet.getDataRange().getValues();
  const norm  = projectName.trim().toLowerCase();
  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === norm) {
      tasks.push({
        row      : i + 1,
        project  : String(data[i][0]).trim(),
        milestone: String(data[i][1]).trim(),
        task     : String(data[i][2]).trim(),
        status   : String(data[i][3]).trim(),
        week     : String(data[i][4]).trim(),
        owner    : String(data[i][5]).trim()
      });
    }
  }
  return tasks;
}

// ── Add task ─────────────────────────────────────────────────────────────────
function addTask(projectName, milestone, task, status, week, owner) {
  if (!projectName || !task) throw new Error("Proje adı ve görev zorunlu");
  const sheet = getSheet(TASKS_SHEET);
  sheet.appendRow([
    projectName.trim(), milestone.trim(), task.trim(),
    status || "Bekliyor", week || "", owner || ""
  ]);
  return { success: true };
}

// ── Update task field ────────────────────────────────────────────────────────
function updateTask(rowNum, field, value) {
  const colMap = { project:1, milestone:2, task:3, status:4, week:5, owner:6 };
  const col = colMap[field];
  if (!col) throw new Error("Geçersiz alan: " + field);
  const sheet = getSheet(TASKS_SHEET);
  sheet.getRange(rowNum, col).setValue(value);
  return { success: true };
}

// ── Delete task ──────────────────────────────────────────────────────────────
function deleteTask(rowNum) {
  getSheet(TASKS_SHEET).deleteRow(rowNum);
  return { success: true };
}

// ── Milestone cell update ────────────────────────────────────────────────────
function updateCell(projectName, milestone, value) {
  Logger.log("updateCell: project=%s milestone=%s value=%s", projectName, milestone, value);
  const sheet = getSheet(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const colIndex = headers.findIndex(h => h === milestone.trim().toLowerCase());
  if (colIndex === -1) throw new Error("Sütun bulunamadı: " + milestone + " | Başlıklar: " + data[0].join(", "));
  const norm = projectName.trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === norm) {
      sheet.getRange(i + 1, colIndex + 1).setValue(value);
      return { success: true };
    }
  }
  throw new Error("Proje bulunamadı: " + projectName);
}

// ── Add project ──────────────────────────────────────────────────────────────
function addProject(projectName, projectUrl) {
  projectName = String(projectName).trim();
  if (!projectName) throw new Error("Proje adı boş olamaz");
  const sheet = getSheet(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  if (data.slice(1).some(r => String(r[0]).trim().toLowerCase() === projectName.toLowerCase()))
    throw new Error("Bu isimde bir proje zaten var: " + projectName);
  const newRow = sheet.getLastRow() + 1;
  const cell = sheet.getRange(newRow, 1);
  if (projectUrl) {
    cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(projectName).setLinkUrl(projectUrl).build());
  } else {
    cell.setValue(projectName);
  }
  return { success: true };
}

// ── Update project link ──────────────────────────────────────────────────────
function updateProjectLink(projectName, projectUrl) {
  const sheet = getSheet(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const norm  = String(projectName).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === norm) {
      const cell = sheet.getRange(i + 1, 1);
      cell.setRichTextValue(SpreadsheetApp.newRichTextValue()
        .setText(String(data[i][0]).trim())
        .setLinkUrl(projectUrl || null).build());
      return { success: true };
    }
  }
  throw new Error("Proje bulunamadı: " + projectName);
}
