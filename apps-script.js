/**
 * 농산물 매입/매출 관리 시스템 - 구글 스프레드시트 백엔드 (자동 동기화 버전)
 *
 * [사용 방법]
 * 1. 구글 스프레드시트 생성
 * 2. 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 3. 기존 코드를 모두 지우고 이 스크립트를 붙여넣고 저장
 * 4. 우측 상단 [배포] -> [새 배포] -> 유형: [웹 앱]
 *    - 다음 사용자로 실행: 나
 *    - 액세스할 수 있는 사용자: 모든 사용자
 * 5. 생성된 "웹 앱 URL"(…/exec)을 웹 앱 [설정] 탭에 붙여넣기
 *
 * ※ 코드를 수정한 뒤에는 [배포] -> [배포 관리] -> 연필 아이콘 -> 버전: [새 버전] -> [배포]
 *   (이렇게 하면 URL이 바뀌지 않습니다)
 */

var SHEETS = {
  purchases: { name: "매입", partyKey: "supplier", headers: ["id", "날짜", "품목명", "매입처", "수량", "단가", "총금액", "결제상태", "비고"], color: "#e6f4ea" },
  sales:     { name: "매출", partyKey: "customer", headers: ["id", "날짜", "품목명", "매출처", "수량", "단가", "총금액", "수금상태", "비고"], color: "#fce8e6" }
};

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET: 전체 데이터 읽기
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return createJsonResponse({
      success: true,
      purchases: readSheetData(getSheet(ss, "purchases"), "purchases"),
      sales: readSheetData(getSheet(ss, "sales"), "sales"),
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// POST: upsert(1건 저장/수정), delete(1건 삭제), batch(여러 건), sync(전체 덮어쓰기)
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // 휴대폰/PC 동시 저장 시 충돌 방지
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.action === "sync") {
      writeAll(getSheet(ss, "purchases"), "purchases", body.purchases || []);
      writeAll(getSheet(ss, "sales"), "sales", body.sales || []);
      return createJsonResponse({ success: true, message: "구글 시트에 전체 데이터를 저장했습니다." });
    }

    var ops = body.action === "batch" ? (body.ops || []) : [body];
    for (var i = 0; i < ops.length; i++) applyOp(ss, ops[i]);
    return createJsonResponse({ success: true, applied: ops.length });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function applyOp(ss, op) {
  if (!SHEETS[op.type]) throw new Error("알 수 없는 type: " + op.type);
  var sheet = getSheet(ss, op.type);
  if (op.action === "upsert") {
    var row = toRow(op.type, op.record);
    var r = findRowById(sheet, op.record.id);
    if (r > 0) sheet.getRange(r, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
  } else if (op.action === "delete") {
    var d = findRowById(sheet, op.id);
    if (d > 0) sheet.deleteRow(d);
  } else {
    throw new Error("알 수 없는 action: " + op.action);
  }
}

function getSheet(ss, type) {
  var cfg = SHEETS[type];
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
    sheet.appendRow(cfg.headers);
    sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight("bold").setBackground(cfg.color).setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowById(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2 || !id) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function toRow(type, item) {
  var q = Number(item.quantity) || 0, p = Number(item.unitPrice) || 0;
  return [
    String(item.id || ""),
    String(item.date || ""),
    item.product || "",
    item[SHEETS[type].partyKey] || "",
    q, p,
    Number(item.totalPrice) || q * p,
    item.status || "",
    item.notes || ""
  ];
}

function writeAll(sheet, type, list) {
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).clearContent();
  if (!list.length) return;
  var rows = list.map(function (item) { return toRow(type, item); });
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function readSheetData(sheet, type) {
  var rows = sheet.getDataRange().getValues();
  var data = [];
  var tz = Session.getScriptTimeZone();
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0] && !r[2]) continue; // 빈 행 건너뛰기
    var date = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, "yyyy-MM-dd") : String(r[1]);
    var id = String(r[0] || "");
    if (!id) {
      // 시트에 직접 입력한 행은 id가 없으므로 새로 발급해서 기록
      id = (type === "purchases" ? "pur_" : "sal_") + Utilities.getUuid().slice(0, 8);
      sheet.getRange(i + 1, 1).setValue(id);
    }
    var obj = {
      id: id,
      date: date,
      product: String(r[2]),
      quantity: Number(r[4]) || 0,
      unitPrice: Number(r[5]) || 0,
      totalPrice: Number(r[6]) || (Number(r[4]) || 0) * (Number(r[5]) || 0),
      status: String(r[7]),
      notes: String(r[8] || "")
    };
    obj[SHEETS[type].partyKey] = String(r[3]);
    data.push(obj);
  }
  return data;
}
