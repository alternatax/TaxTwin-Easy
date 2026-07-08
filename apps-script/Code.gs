/**
 * Thai Tax Compare — Apps Script backend.
 *
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone) and paste the
 * resulting URL into GAS_API_URL in app.tsx. See README.md for full steps.
 *
 * All requests are POSTs to the single Web App URL with a JSON body of the
 * form { action: "...", ...payload }. See doPost() for the list of actions.
 */

var LOG_SHEET_NAME = "Logs";
var LOG_HEADERS = ["Name", "Email", "Date", "Time", "Timestamp"];

// Google Sheet where user visit logs are stored. The account that deploys
// this Web App must have edit access to this spreadsheet.
var SPREADSHEET_ID = "1ldvHLNVmSPaCp3g1fRPeATMDTB4L41bOxlYSqQlPpYY";

function doGet(e) {
  return jsonResponse({ status: "ok", message: "Thai Tax Compare API" });
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Invalid JSON body" });
  }

  var action = payload.action || "";
  try {
    switch (action) {
      case "logLogin":
        return handleLogLogin(payload);
      case "getUserLogs":
        return handleGetUserLogs();
      case "getSheetsConfig":
        return handleGetSheetsConfig();
      case "taxAdvisor":
        return handleTaxAdvisor(payload);
      default:
        return jsonResponse({ error: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message || String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// --- SPREADSHEET STORAGE -----------------------------------------------

function getOrCreateSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  // Fallback: no fixed sheet configured, so get-or-create one bound to this
  // script's Script Properties (useful if you don't want to hardcode an ID).
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SPREADSHEET_ID");
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      // Fall through and create a new one if the stored ID is no longer valid.
    }
  }
  var ss = SpreadsheetApp.create("Thai Tax Compare - User Logs");
  props.setProperty("SPREADSHEET_ID", ss.getId());
  return ss;
}

function getOrCreateLogSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET_NAME);
    sheet.appendRow(LOG_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleLogLogin(payload) {
  var name = payload.name || "ผู้ใช้ทั่วไป (Guest)";
  var email = (payload.email || "").trim();
  if (!email) {
    return jsonResponse({ error: "Email is required" });
  }

  var now = new Date();
  var date = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy");
  var time = Utilities.formatDate(now, "Asia/Bangkok", "HH:mm:ss");

  var sheet = getOrCreateLogSheet();
  sheet.appendRow([name, email, date, time, now.getTime()]);

  return jsonResponse({ success: true, log: { name: name, email: email, date: date, time: time } });
}

function handleGetUserLogs() {
  var sheet = getOrCreateLogSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ logs: [] });
  }
  var values = sheet.getRange(2, 1, lastRow - 1, LOG_HEADERS.length).getValues();
  var logs = values
    .map(function (row) {
      return { name: row[0], email: row[1], date: row[2], time: row[3], timestamp: row[4] };
    })
    .reverse(); // newest first, matching the original app's ordering
  return jsonResponse({ logs: logs });
}

function handleGetSheetsConfig() {
  var ss = getOrCreateSpreadsheet();
  return jsonResponse({ sheetUrl: ss.getUrl() });
}

// --- AI TAX ADVISOR ------------------------------------------------------

function handleTaxAdvisor(payload) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  var customPrompt = payload.customPrompt || "";

  if (!apiKey) {
    return jsonResponse({ advice: generateRuleBasedAdvice(payload, customPrompt) });
  }

  var prompt = buildAdvisorPrompt(payload, customPrompt);
  var modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (var i = 0; i < modelsToTry.length; i++) {
    var text = callGemini(modelsToTry[i], prompt, apiKey);
    if (text) {
      return jsonResponse({ advice: text });
    }
  }

  // All models failed (quota, permission, or network issue) — fall back gracefully.
  return jsonResponse({ advice: generateRuleBasedAdvice(payload, customPrompt) });
}

function callGemini(modelName, prompt, apiKey) {
  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    modelName +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    muteHttpExceptions: true,
  };

  try {
    var res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() !== 200) {
      Logger.log("Model " + modelName + " failed: " + res.getContentText());
      return null;
    }
    var data = JSON.parse(res.getContentText());
    var text = data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;
    return text || null;
  } catch (err) {
    Logger.log("Model " + modelName + " threw: " + err);
    return null;
  }
}

function buildAdvisorPrompt(data, customPrompt) {
  var revenue = data.revenue || 0;
  var expenseType = data.expenseType || "flat";
  var deductions = data.deductions || 0;
  var personalTax = data.personalTax || 0;
  var personalTaxable = data.personalTaxable || 0;
  var corporateTax = data.corporateTax || 0;
  var corporateNetProfit = data.corporateNetProfit || 0;
  var smeStatus = data.smeStatus !== false;

  var payloadDescription =
    "\n    ข้อมูลภาษีของผู้ใช้งานสำหรับการวิเคราะห์:\n" +
    "    - รายได้รวมปีละ: " + revenue.toLocaleString() + " บาท\n" +
    "    - ค่าลดหย่อนส่วนบุคคลรวม: " + deductions.toLocaleString() + " บาท (ประเภทค่าใช้จ่าย: " +
    (expenseType === "flat" ? "หักเหมา (60%)" : "หักตามจริง") + ")\n" +
    "    - ภาษีบุคคลธรรมดาคำนวณได้: " + personalTax.toLocaleString() + " บาท (เงินได้สุทธิ: " + personalTaxable.toLocaleString() + " บาท)\n" +
    "    - ภาษีนิติบุคคลคำนวณได้: " + corporateTax.toLocaleString() + " บาท (กำไรสุทธิทางบัญชี: " + corporateNetProfit.toLocaleString() + " บาท, สถานะ SME: " + (smeStatus ? "ใช่" : "ไม่ใช่") + ")\n    ";

  var customPromptSection = "";
  if (customPrompt && customPrompt.trim().length > 0) {
    customPromptSection =
      "\n**ประเด็นหรือคำถามพิเศษเพิ่มเติมจากผู้ใช้ที่ต้องการคำแนะนำเป็นพิเศษ**:\n> \"" +
      customPrompt.trim() +
      "\"\nโปรดวิเคราะห์ประเด็นนี้อย่างละเอียดและตอบข้อซักถามนี้เพิ่มเติมในรายงานของท่านด้วย\n";
  }

  return (
    "คุณคือผู้เชี่ยวชาญด้านวางแผนภาษีและบัญชีของประเทศไทย (Thai Tax Planner Expert) \n" +
    "โปรดวิเคราะห์คำนวณเปรียบเทียบระหว่าง \"บุคคลธรรมดา\" และ \"นิติบุคคล\" ตามข้อมูลด้านล่างนี้ และให้คำปรึกษาอย่างละเอียด เป็นมืออาชีพ น่าเชื่อถือ และเข้าใจง่ายสำหรับผู้ประกอบการรายย่อย\n\n" +
    payloadDescription +
    customPromptSection +
    "\nโปรดจัดทำรายงานคำแนะนำภาษาไทย โดยแบ่งเป็นหัวข้อต่อไปนี้อย่างสวยงามและชัดเจน (เป็น Markdown):\n" +
    "1. **สรุปความคุ้มค่าและความแตกต่างทางตัวเลข**\n" +
    "2. **ข้อดีและข้อเสียเฉพาะตัวในเคสนี้**\n" +
    "3. **คำแนะนำเชิงกลยุทธ์วางแผนลดหย่อน (Tax Optimization Strategy)**\n" +
    "4. **บทสรุปและสิ่งที่ต้องเริ่มทำ (Actionable Next Steps)**\n\n" +
    "ใช้ภาษาที่เป็นมิตร สุภาพ อ่านง่าย มีการเน้นตัวหนาเพื่อให้สะดุดตา"
  );
}

/**
 * Local fallback advisor used when GEMINI_API_KEY is not configured, or when
 * the Gemini API call fails. Ported from the app's original Node backend.
 */
function generateRuleBasedAdvice(data, customPrompt) {
  var revenue = data.revenue || 0;
  var personalTax = data.personalTax || 0;
  var personalTaxable = data.personalTaxable || 0;
  var corporateTax = data.corporateTax || 0;
  var corporateNetProfit = data.corporateNetProfit || 0;

  var taxDiff = Math.abs(personalTax - corporateTax);
  var percentDiff = personalTax > 0 ? ((taxDiff / personalTax) * 100).toFixed(1) : "0";

  var numericalAnalysis;
  if (personalTax > corporateTax) {
    numericalAnalysis =
      "จากการคำนวณพบว่า **การเสียภาษีในรูปแบบนิติบุคคลประหยัดภาษีกว่าบุคคลธรรมดาถึง " +
      taxDiff.toLocaleString() + " บาท/ปี** (ประหยัดลงไปประมาณ **" + percentDiff + "%**)\n\n" +
      "- **จุดคุ้มทุน**: ส่วนต่างภาษีที่ประหยัดได้อยู่ที่ **" + taxDiff.toLocaleString() +
      " บาท** ซึ่งสูงกว่าค่าใช้จ่ายในการทำบัญชีและผู้สอบบัญชีรายปี (เฉลี่ยประมาณ 15,000 - 25,000 บาท/ปี) ดังนั้น **ในเชิงตัวเลข การจดทะเบียนนิติบุคคลในเคสนี้มีความคุ้มค่าสูงมาก**";
  } else {
    numericalAnalysis =
      "จากการคำนวณพบว่า **การเสียภาษีในรูปแบบบุคคลธรรมดาประหยัดกว่า (หรือใกล้เคียงกับ) นิติบุคคล โดยต่างกันเพียง " +
      taxDiff.toLocaleString() + " บาท/ปี**\n\n" +
      "- **จุดคุ้มทุน**: หากจดเป็นนิติบุคคล คุณจะต้องมีค่าใช้จ่ายแอบแฝง เช่น ค่าจดทะเบียนจัดตั้งและค่าทำบัญชี/ผู้สอบบัญชีรับอนุญาตรายปี (เริ่มต้น 15,000 - 30,000 บาท/ปี) ซึ่งสูงกว่าส่วนต่างภาษีที่ประหยัดได้\n" +
      "- **คำแนะนำสูงสุด**: **แนะนำให้ดำเนินธุรกิจในรูปแบบบุคคลธรรมดาต่อไปก่อน** จนกว่ารายได้หรือกำไรจะเติบโตขึ้นมากกว่านี้";
  }

  var customQueryResponse = "";
  if (customPrompt && customPrompt.trim().length > 0) {
    customQueryResponse =
      "\n### 💬 ผลการวิเคราะห์เฉพาะประเด็นที่คุณระบุ: \"" + customPrompt + "\"\n" +
      "- สำหรับรายได้ปีละ **" + revenue.toLocaleString() + " บาท** และกำไรสุทธิ **" + corporateNetProfit.toLocaleString() +
      " บาท** แนะนำให้ปรึกษาสำนักงานบัญชีผู้เชี่ยวชาญเพิ่มเติมเพื่อพิจารณาประเด็นนี้อย่างละเอียด\n";
  }

  return (
    "### 💡 รายงานการวิเคราะห์และวางแผนภาษีเชิงลึกเฉพาะบุคคล (Local AI Fallback Engine)\n\n" +
    "> ⚠️ **หมายเหตุ**: ระบบประมวลผลผ่านกลไกสมองกลวิเคราะห์กฎหมายภาษีท้องถิ่น (Local Tax Expert Engine) เนื่องจากยังไม่ได้ตั้งค่า GEMINI_API_KEY หรือ API ภายนอกขัดข้องชั่วคราว\n\n" +
    "---\n\n#### 1. สรุปความคุ้มค่าและความแตกต่างทางตัวเลข\n" + numericalAnalysis + "\n\n" +
    "- **ตารางเปรียบเทียบภาระภาษีรวมสุทธิ**:\n" +
    "  - **รูปแบบบุคคลธรรมดา**: เสียภาษีรวมประมาณ **" + personalTax.toLocaleString() + " บาท** (ฐานเงินได้สุทธิ: " + personalTaxable.toLocaleString() + " บาท)\n" +
    "  - **รูปแบบนิติบุคคล**: เสียภาษีรวมประมาณ **" + corporateTax.toLocaleString() + " บาท** (กำไรสุทธิก่อนภาษี: " + corporateNetProfit.toLocaleString() + " บาท)\n" +
    "  - **ผลต่างสุทธิ**: **" + taxDiff.toLocaleString() + " บาท**\n\n---\n" +
    customQueryResponse +
    "\n---\n\n#### 2. คำแนะนำเชิงกลยุทธ์วางแผนลดหย่อน (Tax Optimization Strategy)\n" +
    "* **บุคคลธรรมดา**: ใช้สิทธิลดหย่อนครอบครัว, กองทุน SSF/RMF/ThaiESG และประกันชีวิต/สุขภาพให้เต็มสิทธิ\n" +
    "* **นิติบุคคล**: จัดสรรเงินเดือนกรรมการให้เหมาะสมเพื่อกระจายฐานภาษี และวางระบบเอกสารรายจ่ายให้ครบถ้วน\n\n" +
    "#### 3. บทสรุปและสิ่งที่ต้องเริ่มทำ (Actionable Next Steps)\n" +
    "1. 📝 ตรวจสอบระบบบัญชีปัจจุบันและเริ่มเก็บเอกสารรายจ่ายจริง\n" +
    "2. 🔎 ระวังเกณฑ์ VAT 1.8 ล้านบาท/ปี\n" +
    "3. 🤝 ปรึกษาผู้เชี่ยวชาญก่อนตัดสินใจจดทะเบียนบริษัทหรือห้างหุ้นส่วน"
  );
}
