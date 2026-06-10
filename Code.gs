// R&D L2 Planning Dashboard - Apps Script Backend

const SHEET_NAME = "Sheet1";
const MILESTONES = ["CA", "Prod. Def.", "Design", "DR CAAV&PRKF", "Proto", "VT", "DVP", "DR TOGO&ISVA"];

function doGet() {
  return HtmlService.createHtmlOutputFromFile("dashboard")
    .setTitle("R&D L2 Planning Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const lastRow = data.length;

  const headers = data[0];

  const projects = [];
  for (let i = 1; i < lastRow; i++) {
    const row = data[i];
    const projectName = row[0];
    if (!projectName) continue;

    // RichText link'i oku (sağ tık → Link ekle)
    let projectUrl = "";
    try {
      const richText = sheet.getRange(i + 1, 1).getRichTextValue();
      projectUrl = richText.getLinkUrl() || "";
    } catch (e) {}

    const milestones = {};
    for (let j = 1; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        milestones[header] = row[j] !== undefined && row[j] !== null ? String(row[j]).trim() : "";
      }
    }

    projects.push({ name: projectName, url: projectUrl, milestones });
  }

  const currentWeek = getCurrentWeekNumber();
  return { projects, milestones: MILESTONES, currentWeek };
}

function getCurrentWeekNumber() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
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
  Logger.log("updateCell called: project=%s, milestone=%s, value=%s", projectName, milestone, value);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Spreadsheet bulunamadı");

  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Sheet bulunamadı: " + SHEET_NAME);

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  Logger.log("Headers: %s", JSON.stringify(headers));

  // Büyük/küçük harf ve boşluk farkı olmaksızın eşleştir
  const milestoneNorm = String(milestone).trim().toLowerCase();
  const colIndex = headers.findIndex(h => h.toLowerCase() === milestoneNorm);
  if (colIndex === -1) throw new Error("Sütun bulunamadı: '" + milestone + "' | Mevcut başlıklar: " + headers.join(", "));

  const projectNorm = String(projectName).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === projectNorm) {
      sheet.getRange(i + 1, colIndex + 1).setValue(value);
      Logger.log("Updated row %d, col %d to '%s'", i + 1, colIndex + 1, value);
      return { success: true };
    }
  }
  throw new Error("Proje bulunamadı: '" + projectName + "'");
}
