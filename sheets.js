/**
 * 구글 스프레드시트 연동 서비스 모듈 (sheets.js)
 */

const SheetsService = {
  // 로컬 스토리지 키 정의
  URL_STORAGE_KEY: "agri_sheets_api_url",

  // 저장된 Google Apps Script 웹앱 URL 가져오기
  getApiUrl() {
    return localStorage.getItem(this.URL_STORAGE_KEY) || "";
  },

  // 웹앱 URL 저장하기
  setApiUrl(url) {
    if (url) {
      localStorage.setItem(this.URL_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(this.URL_STORAGE_KEY);
    }
  },

  // 연동 설정이 완료되었는지 확인
  isConnected() {
    const url = this.getApiUrl();
    return url.startsWith("https://script.google.com/macros/s/");
  },

  // 구글 시트에서 데이터 가져오기 (GET)
  async fetchData() {
    const url = this.getApiUrl();
    if (!this.isConnected()) {
      throw new Error("구글 스프레드시트 웹 앱 URL이 올바르게 설정되지 않았습니다.");
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "구글 시트로부터 데이터를 가져오는 중 오류가 발생했습니다.");
      }

      return {
        purchases: result.purchases || [],
        sales: result.sales || []
      };
    } catch (error) {
      console.error("SheetsService.fetchData 오류:", error);
      throw new Error(`구글 시트 연동 실패: ${error.message}. URL이 정확한지 또는 웹앱 권한 설정이 '모든 사용자'로 되어 있는지 확인해주세요.`);
    }
  },

  // 구글 시트로 로컬 데이터 내보내기 (POST)
  async syncData(purchases, sales) {
    const url = this.getApiUrl();
    if (!this.isConnected()) {
      throw new Error("구글 스프레드시트 웹 앱 URL이 올바르게 설정되지 않았습니다.");
    }

    const payload = {
      action: "sync",
      purchases: purchases,
      sales: sales
    };

    try {
      // POST 요청 전송
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // Apps Script POST 처리 시 CORS 문제 완화를 위해 text/plain 권장
        },
        body: JSON.stringify(payload),
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태코드: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "구글 시트에 데이터를 저장하는 중 오류가 발생했습니다.");
      }

      return result.message || "동기화가 성공했습니다.";
    } catch (error) {
      console.error("SheetsService.syncData 오류:", error);
      throw new Error(`구글 시트 전송 실패: ${error.message}. URL 및 배포 권한 설정을 확인하세요.`);
    }
  }
};

window.SheetsService = SheetsService;
