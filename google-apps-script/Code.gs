/**
 * OM Universal Operations secure Google login gateway.
 * Copy this file and Index.html into a script bound to the management Sheet.
 * Deploy the web app as the owner and allow anyone with a Google account to open it.
 */

var CONFIG = {
  USERS_SHEET: "Users",
  SALES_SHEET: "Sales_Data",
  MERCURY_SHEET: "Mercury_Tasks",
  QUICKC_SHEET: "QuickC_Summary",
  EXPENSES_SHEET: "Support_Expenses",
  WEBSITE_EXPORT_SHEET: "Website_Export",
  PUBLIC_LOGIN_URL: "https://omuniversalllc.github.io/om-universal-operations-dashboard/",
  ASSET_BASE_URL: "https://omuniversalllc.github.io/om-universal-operations-dashboard/"
};

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:Arial,sans-serif;background:#f3f6f4;color:#14231f;display:grid;place-items:center;min-height:100vh;margin:0">' +
    '<main style="max-width:520px;background:#fff;border:1px solid #dce5e1;border-radius:20px;padding:34px;box-shadow:0 20px 60px rgba(20,35,31,.12)">' +
    '<h1 style="margin:0 0 12px">Sign in from the OM portal</h1><p style="line-height:1.6;color:#66766f">For security, open the official login page and select Sign in with Google.</p>' +
    '<a style="display:inline-block;margin-top:12px;background:#0b6958;color:#fff;padding:11px 14px;border-radius:9px;text-decoration:none;font-weight:700" href="' + CONFIG.PUBLIC_LOGIN_URL + '">Open secure login</a>' +
    '</main></body></html>'
  ).setTitle("OM Universal Operations — Secure Login");
}

function doPost(e) {
  try {
    var credential = e && e.parameter ? String(e.parameter.credential || "") : "";
    if (!credential) return accessDenied_("Google did not provide a valid sign-in credential.");

    var identity = verifyGoogleCredential_(credential);
    var user = findApprovedUser_(identity.email);
    if (!user || String(user.active).toLowerCase() !== "yes") {
      return accessDenied_("This Google email is not active in the private Users sheet.");
    }

    var data = filterForStoreAccess_(getDashboardData_(), user.storeAccess);
    var template = HtmlService.createTemplateFromFile("Index");
    template.assetBaseUrl = CONFIG.ASSET_BASE_URL;
    template.publicLoginUrl = CONFIG.PUBLIC_LOGIN_URL;
    template.userJson = safeJson_({
      email: identity.email,
      name: user.name || identity.name || identity.email,
      role: user.role || "Viewer",
      storeAccess: user.storeAccess || "All Stores"
    });
    template.dataJson = safeJson_(data);

    return template.evaluate()
      .setTitle("OM Universal Operations Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return accessDenied_("The secure report could not be prepared. Please try again or contact the administrator.");
  }
}

function setGoogleClientId(clientId) {
  clientId = String(clientId || "").trim();
  if (!/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw new Error("Enter the complete Google OAuth web client ID.");
  }
  PropertiesService.getScriptProperties().setProperty("GOOGLE_CLIENT_ID", clientId);
}

function verifyGoogleCredential_(credential) {
  var clientId = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID has not been configured in Script Properties.");

  var response = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential), {
    method: "get",
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error("Google rejected the identity token.");

  var claims = JSON.parse(response.getContentText());
  var issuer = String(claims.iss || "");
  var verified = claims.email_verified === true || String(claims.email_verified).toLowerCase() === "true";
  if (String(claims.aud) !== clientId) throw new Error("The identity token belongs to a different website.");
  if (issuer !== "https://accounts.google.com" && issuer !== "accounts.google.com") throw new Error("Unexpected identity provider.");
  if (!verified || !claims.email) throw new Error("The Google email is not verified.");
  if (Number(claims.exp || 0) * 1000 < Date.now()) throw new Error("The identity token has expired.");

  return { email: String(claims.email).trim().toLowerCase(), name: String(claims.name || "") };
}

function findApprovedUser_(email) {
  var rows = sheetObjects_(CONFIG.USERS_SHEET, 1);
  for (var i = 0; i < rows.length; i += 1) {
    var rowEmail = String(rows[i]["Email / User ID"] || "").trim().toLowerCase();
    if (rowEmail === email) {
      return {
        email: rowEmail,
        name: String(rows[i]["Name"] || ""),
        role: String(rows[i]["Role"] || "Viewer"),
        storeAccess: String(rows[i]["Store Access"] || "All Stores"),
        active: String(rows[i]["Active"] || "No")
      };
    }
  }
  return null;
}

function getDashboardData_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("dashboard-v3");
  if (cached) return JSON.parse(cached);

  SpreadsheetApp.flush();
  var data = buildDashboardData_();
  var encoded = JSON.stringify(data);
  if (encoded.length < 95000) cache.put("dashboard-v3", encoded, 60);
  return data;
}

function buildDashboardData_() {
  var salesRows = sheetObjects_(CONFIG.SALES_SHEET, 1).filter(function(row) {
    return String(row["Record Role"] || "").toLowerCase() === "current" && row["Date"];
  });

  var dailyRecords = salesRows.map(function(row) {
    var customers = number_(row["Customer Count"]);
    var sales = number_(row["Inside Sales"]);
    return {
      date: dateString_(row["Date"]),
      store: String(row["Store"] || "Unassigned"),
      day: String(row["Day"] || ""),
      insideSales: sales,
      customers: customers,
      itemCount: number_(row["Item Count"]),
      averageTicket: numberOr_(row["Average $ Spent (Calculated)"], customers ? sales / customers : 0),
      fuelGallons: number_(row["Fuel Sales (Gallons)"]),
      fuelSales: number_(row["Fuel Sales (Amount)"]),
      lotterySales: number_(row["Running Lottery Current"]),
      voidLines: number_(row["Void Lines"]),
      voidTickets: number_(row["Void Tickets"]),
      errorCorrects: number_(row["Error Corrects"]),
      currentMargin: nullableNumber_(row["Current Running Margin %"]),
      buySell: nullableNumber_(row["Current Buying and Selling %"]),
      reasoning: String(row["Reasoning"] || ""),
      dataStatus: String(row["Data Issue"] || "Source review")
    };
  }).sort(function(a, b) { return a.date.localeCompare(b.date) || a.store.localeCompare(b.store); });

  var mercuryRows = sheetObjects_(CONFIG.MERCURY_SHEET, 1).filter(function(row) {
    return row["Sl No"] !== "" && row["Sl No"] !== null && String(row["Task / Request"] || "").trim();
  });
  var completed = countWhere_(mercuryRows, function(row) { return status_(row["Current Status"]) === "completed"; });
  var inProgress = countWhere_(mercuryRows, function(row) { return status_(row["Current Status"]) === "in progress"; });
  var waiting = countWhere_(mercuryRows, function(row) { return status_(row["Current Status"]) === "waiting for response"; });
  var statusConflicts = countWhere_(mercuryRows, function(row) { return String(row["Status Check"] || "").toLowerCase().indexOf("conflict") >= 0; });
  var missingCompletionDate = countWhere_(mercuryRows, function(row) { return status_(row["Current Status"]) === "completed" && !row["Completion Date"]; });
  var missingTicketIds = countWhere_(mercuryRows, function(row) { return !String(row["Ticket ID"] || "").trim(); });

  var quickRows = sheetObjects_(CONFIG.QUICKC_SHEET, 4).filter(function(row) {
    return row["Date"] && String(row["Date"]).toUpperCase().indexOf("TOTAL") < 0;
  });
  var quickDaily = quickRows.map(function(row) {
    return {
      date: dateString_(row["Date"]),
      sales: number_(row["Sales"]),
      scannedCost: number_(row["Scanned Cost"]),
      modifierCost: number_(row["Modifier Cost"]),
      groceryPurchase: number_(row["Grocery Purchase"])
    };
  }).filter(function(row) { return row.date; });
  var quickSales = sum_(quickDaily, "sales");
  var scanned = sum_(quickDaily, "scannedCost");
  var modifier = sum_(quickDaily, "modifierCost");
  var grocery = sum_(quickDaily, "groceryPurchase");
  var cogs = scanned + modifier;

  var expenseRows = sheetObjects_(CONFIG.EXPENSES_SHEET, 4).filter(function(row) {
    return String(row["Category"] || "").trim() && number_(row["Amount"]);
  });
  var expenseGroups = {};
  expenseRows.forEach(function(row) {
    var category = String(row["Category"] || "Uncategorized");
    expenseGroups[category] = (expenseGroups[category] || 0) + number_(row["Amount"]);
  });
  var moneyMovements = Object.keys(expenseGroups).sort().map(function(category) {
    return { date: "", store: "Plant City", type: "Expense", category: category, amount: expenseGroups[category] };
  });

  var exportMap = keyValueMap_(CONFIG.WEBSITE_EXPORT_SHEET, 4);
  var dataIssues = unique_(salesRows.map(function(row) { return String(row["Data Issue"] || "").trim(); }).filter(Boolean)).slice(0, 3);
  var alerts = dataIssues.concat([
    statusConflicts + " Mercury tasks have a status/completion-date conflict.",
    missingCompletionDate + " completed Mercury tasks are missing Completion Date.",
    missingTicketIds + " Mercury tasks have no Ticket ID."
  ]);

  return {
    source: "private-google-sheet",
    asOf: dateString_(exportMap.as_of || new Date()),
    modelStatus: String(exportMap.model_status || "REVIEW REQUIRED"),
    dailyRecords: dailyRecords,
    stores: buildStoreSummaries_(dailyRecords),
    quickC: {
      period: periodLabel_(quickDaily.map(function(row) { return row.date; })),
      sales: quickSales,
      cogs: cogs,
      salesMargin: quickSales ? (quickSales - cogs) / quickSales : 0,
      groceryPurchase: grocery,
      differenceMargin: quickSales ? (quickSales - grocery) / quickSales : 0,
      daily: quickDaily
    },
    fuelPrices: buildFuelPrices_(),
    moneyMovements: moneyMovements,
    mercury: {
      total: mercuryRows.length,
      completed: completed,
      inProgress: inProgress,
      waiting: waiting,
      statusConflicts: statusConflicts,
      missingCompletionDate: missingCompletionDate,
      missingTicketIds: missingTicketIds
    },
    alerts: alerts
  };
}

function buildStoreSummaries_(rows) {
  var grouped = {};
  rows.forEach(function(row) {
    if (!grouped[row.store]) grouped[row.store] = [];
    grouped[row.store].push(row);
  });
  return Object.keys(grouped).sort().map(function(store) {
    var storeRows = grouped[store].slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
    var first = storeRows[0];
    var latest = storeRows[storeRows.length - 1];
    var periodSales = sum_(storeRows, "insideSales");
    var latestDate = new Date(latest.date + "T00:00:00Z");
    var daysInMonth = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth() + 1, 0)).getUTCDate();
    return {
      store: store,
      period: first.date + " to " + latest.date,
      latestDate: latest.date,
      latestSales: latest.insideSales,
      periodSales: periodSales,
      customers: sum_(storeRows, "customers"),
      predicted: storeRows.length ? periodSales / storeRows.length * daysInMonth : 0,
      dataStatus: unique_(storeRows.map(function(row) { return row.dataStatus; }).filter(Boolean)).join("; ") || "Source review"
    };
  });
}

function buildFuelPrices_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Fuel_Prices");
  if (!sheet) return [];
  return sheetObjects_("Fuel_Prices", 1).map(function(row) {
    return {
      date: dateString_(row["Date"]), store: String(row["Store"] || "Plant City"), grade: String(row["Grade"] || ""),
      cost: number_(row["Cost"]), nearbyLow: number_(row["Nearby Low"]), nearbyHigh: number_(row["Nearby High"]),
      cashPrice: number_(row["Cash Price"]), cardPrice: number_(row["Card Price"]),
      cashMargin: number_(row["Cash Margin"]), cardMargin: number_(row["Card Margin"])
    };
  }).filter(function(row) { return row.grade; });
}

function filterForStoreAccess_(data, storeAccess) {
  var access = String(storeAccess || "All Stores").trim();
  if (!access || access.toLowerCase() === "all stores") return data;
  var allowed = access.toLowerCase() === "quick c stores" ? ["Plant City", "Inverness"] : access.split(/[,;|]/).map(function(value) { return value.trim(); });
  var allowedMap = {};
  allowed.forEach(function(store) { allowedMap[store.toLowerCase()] = true; });
  data.dailyRecords = data.dailyRecords.filter(function(row) { return allowedMap[row.store.toLowerCase()]; });
  data.stores = data.stores.filter(function(row) { return allowedMap[row.store.toLowerCase()]; });
  return data;
}

function sheetObjects_(sheetName, headerRow) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Required sheet not found: " + sheetName);
  var values = sheet.getDataRange().getValues();
  var headerIndex = Math.max(Number(headerRow || 1) - 1, 0);
  var headers = values[headerIndex] || [];
  return values.slice(headerIndex + 1).map(function(row) {
    var object = {};
    headers.forEach(function(header, index) {
      if (String(header || "").trim()) object[String(header).trim()] = row[index];
    });
    return object;
  });
}

function keyValueMap_(sheetName, headerRow) {
  var rows = sheetObjects_(sheetName, headerRow);
  var map = {};
  rows.forEach(function(row) {
    var key = String(row.Key || "").trim();
    if (key) map[key] = row.Value;
  });
  return map;
}

function accessDenied_(message) {
  var safeMessage = escapeHtml_(String(message || "Access denied."));
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:Arial,sans-serif;background:#f3f6f4;color:#14231f;display:grid;place-items:center;min-height:100vh;margin:0">' +
    '<main style="max-width:540px;background:#fff;border:1px solid #dce5e1;border-radius:20px;padding:34px;box-shadow:0 20px 60px rgba(20,35,31,.12)">' +
    '<div style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#8b5a12">Access not approved</div>' +
    '<h1 style="margin:10px 0 12px">This account cannot open the dashboard.</h1><p style="line-height:1.6;color:#66766f">' + safeMessage + '</p>' +
    '<a style="display:inline-block;margin-top:14px;background:#0b6958;color:#fff;padding:11px 14px;border-radius:9px;text-decoration:none;font-weight:700" href="' + CONFIG.PUBLIC_LOGIN_URL + '">Return to secure login</a>' +
    '</main></body></html>'
  ).setTitle("OM Universal Operations — Access Denied");
}

function number_(value) { var number = Number(value); return isFinite(number) ? number : 0; }
function numberOr_(value, fallback) { var number = Number(value); return value !== "" && value !== null && isFinite(number) ? number : fallback; }
function nullableNumber_(value) { return value === "" || value === null || typeof value === "undefined" ? null : number_(value); }
function sum_(rows, key) { return rows.reduce(function(total, row) { return total + number_(row[key]); }, 0); }
function countWhere_(rows, predicate) { return rows.reduce(function(total, row) { return total + (predicate(row) ? 1 : 0); }, 0); }
function status_(value) { return String(value || "").trim().toLowerCase(); }
function unique_(values) { var seen = {}; return values.filter(function(value) { var key = String(value); if (seen[key]) return false; seen[key] = true; return true; }); }
function periodLabel_(dates) { var valid = dates.filter(Boolean).sort(); return valid.length ? valid[0] + " to " + valid[valid.length - 1] : "No supplied period"; }
function dateString_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
  }
  var text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  var parsed = new Date(value);
  return isNaN(parsed.getTime()) ? text : Utilities.formatDate(parsed, "UTC", "yyyy-MM-dd");
}
function safeJson_(value) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026"); }
function escapeHtml_(value) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

