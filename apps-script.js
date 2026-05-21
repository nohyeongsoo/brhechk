/**
 * 농산물 매입/매출 관리 시스템 - 구글 스프레드시트 백엔드 스크립트
 * 
 * [사용 방법]
 * 1. 구글 스프레드시트 생성
 * 2. 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 3. 기존 코드를 모두 지우고 이 스크립트를 붙여넣기
 * 4. 우측 상단 [배포] -> [새 배포] 클릭
 * 5. 유형 선택: [웹 앱]
 * 6. 설정:
 *    - 설명: 농산물 매입매출 API
 *    - 다음 사용자로 실행: [나 (본인 이메일)]
 *    - 액세스할 수 있는 사용자: [모든 사용자] (CORS 호출 허용을 위해 필수)
 * 7. [배포] 버튼 클릭 후 액세스 승인 (보안 경고 시 '고급' -> '이동' 클릭하여 허용)
 * 8. 생성된 "웹 앱 URL"을 복사하여 웹 앱의 설정 탭에 붙여넣습니다.
 */

// CORS 헤더 추가를 위한 응답 유틸리티 함수
function createJsonResponse(data) {
  var JSONString = JSON.stringify(data);
  return ContentService.createTextOutput(JSONString)
    .setMimeType(ContentService.MimeType.JSON);
}

// GET 요청 처리: 시트의 데이터를 읽어 JSON으로 반환
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);
    
    var purchaseSheet = ss.getSheetByName("매입");
    var salesSheet = ss.getSheetByName("매출");
    
    var purchases = readSheetData(purchaseSheet);
    var sales = readSheetData(salesSheet);
    
    return createJsonResponse({
      success: true,
      purchases: purchases,
      sales: sales
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// POST 요청 처리: 웹 앱의 데이터를 받아 시트에 덮어쓰거나 동기화
function doPost(e) {
  try {
    var postData;
    if (e.postData.type === "application/json") {
      postData = JSON.parse(e.postData.contents);
    } else {
      postData = JSON.parse(e.postData.getDataAsString());
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);
    
    var action = postData.action;
    
    if (action === "sync") {
      var purchaseSheet = ss.getSheetByName("매입");
      var salesSheet = ss.getSheetByName("매출");
      
      // 데이터 덮어쓰기 실행
      writeSheetData(purchaseSheet, postData.purchases, [
        "id", "date", "product", "supplier", "quantity", "unitPrice", "totalPrice", "status", "notes"
      ]);
      
      writeSheetData(salesSheet, postData.sales, [
        "id", "date", "product", "customer", "quantity", "unitPrice", "totalPrice", "status", "notes"
      ]);
      
      return createJsonResponse({
        success: true,
        message: "구글 시트 동기화가 성공적으로 완료되었습니다."
      });
    }
    
    return createJsonResponse({
      success: false,
      error: "알 수 없는 액션(Action)입니다."
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// 시트가 없으면 생성하고 헤더를 초기화하는 함수
function checkAndInitSheets(ss) {
  var purchaseSheet = ss.getSheetByName("매입");
  if (!purchaseSheet) {
    purchaseSheet = ss.insertSheet("매입");
    purchaseSheet.appendRow(["id", "날짜", "품목명", "매입처", "수량", "단가", "총금액", "결제상태", "비고"]);
    // 헤더 스타일링
    purchaseSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#e6f4ea").setHorizontalAlignment("center");
  }
  
  var salesSheet = ss.getSheetByName("매출");
  if (!salesSheet) {
    salesSheet = ss.insertSheet("매출");
    salesSheet.appendRow(["id", "날짜", "품목명", "매출처", "수량", "단가", "총금액", "수금상태", "비고"]);
    // 헤더 스타일링
    salesSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#fce8e6").setHorizontalAlignment("center");
  }
}

// 시트의 데이터를 읽어 객체 배열로 반환
function readSheetData(sheet) {
  var data = [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return data; // 헤더만 있는 경우
  
  var headers = rows[0];
  // 영문 키 매핑 (웹앱 스키마 기준)
  var keyMapping = {
    "id": "id",
    "날짜": "date",
    "품목명": "product",
    "매입처": "supplier",
    "매출처": "customer",
    "수량": "quantity",
    "단가": "unitPrice",
    "총금액": "totalPrice",
    "결제상태": "status",
    "수금상태": "status",
    "비고": "notes"
  };
  
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    var hasData = false;
    
    for (var j = 0; j < headers.length; j++) {
      var headerVal = headers[j];
      var key = keyMapping[headerVal] || headerVal;
      var cellVal = row[j];
      
      // 날짜 형식 포맷팅
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      
      obj[key] = cellVal;
      if (cellVal !== "") hasData = true;
    }
    
    if (hasData) {
      // 숫자 변환
      if (obj.quantity) obj.quantity = Number(obj.quantity);
      if (obj.unitPrice) obj.unitPrice = Number(obj.unitPrice);
      if (obj.totalPrice) obj.totalPrice = Number(obj.totalPrice);
      data.push(obj);
    }
  }
  
  return data;
}

// 데이터를 시트에 덮어쓰기
function writeSheetData(sheet, dataList, fields) {
  // 기존 데이터 삭제 (헤더 행 제외)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  if (!dataList || dataList.length === 0) return;
  
  var rows = [];
  for (var i = 0; i < dataList.length; i++) {
    var item = dataList[i];
    var row = [];
    
    // 데이터 필드를 순서대로 시트 포맷에 맞춤
    row.push(item.id || "");
    row.push(item.date || "");
    row.push(item.product || "");
    row.push(item.supplier || item.customer || ""); // 매입처 또는 매출처
    row.push(item.quantity || 0);
    row.push(item.unitPrice || 0);
    row.push(item.totalPrice || (item.quantity * item.unitPrice) || 0);
    row.push(item.status || "");
    row.push(item.notes || "");
    
    rows.push(row);
  }
  
  // 한 번에 시트에 추가 (속도 최적화)
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}
