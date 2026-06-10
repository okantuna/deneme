// R&D L2 Planning Dashboard - Apps Script Backend

const SHEET_NAME = "Sheet1";
const MILESTONES = ["CA", "Prod. Def.", "Design", "DR CAAV&PRKF", "Proto", "VT", "DVP", "DR", "TOGO&ISVA"];

function doGet() {
  return HtmlService.createHtmlOutputFromFile("dashboard")
    .setTitle("R&D L2 Planning Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  // Row 0 = headers, Row 1+ = projects
  const headers = data[0]; // e.g. ["Project", "CA", "Prod. Def.", ...]

  const projects = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const projectName = row[0];
    if (!projectName) continue;

    const milestones = {};
    for (let j = 1; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        milestones[header] = row[j] !== undefined && row[j] !== null ? String(row[j]).trim() : "";
      }
    }

    projects.push({ name: projectName, milestones });
  }

  const currentWeek = getCurrentWeekNumber();
  return { projects, milestones: MILESTONES, currentWeek };
}

function getCurrentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil(((diff / oneWeek) + start.getDay() + 1) / 7);
}

// Sheets menüsü oluştur
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 Dashboard")
    .addItem("Dashboard'u Aç", "openDashboard")
    .addToUi();
}

// Sheets içinde tam ekran dialog olarak aç
function openDashboard() {
  const html = HtmlService.createHtmlOutputFromFile("dashboard")
    .setWidth(1400)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "R&D L2 Planning Dashboard");
}

// Update a cell value from the dashboard
function updateCell(projectName, milestone, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const colIndex = headers.indexOf(milestone);
  if (colIndex === -1) throw new Error("Milestone not found: " + milestone);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(projectName).trim()) {
      sheet.getRange(i + 1, colIndex + 1).setValue(value);
      return { success: true };
    }
  }
  throw new Error("Project not found: " + projectName);
}
