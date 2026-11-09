/**
 * 구글 스프레드시트 자동 동기화 모듈 (sheets.js)
 *
 * - 저장/수정/삭제할 때마다 해당 1건만 구글 시트에 즉시 반영 (upsert/delete)
 * - 앱을 열 때, 다시 화면에 돌아올 때, 1분마다 시트에서 최신 데이터를 가져옴
 * - 인터넷이 끊겨도 "전송 대기열"에 보관했다가 연결되면 자동 전송
 */

const SheetsService = {
  // ★ 여기에 Apps Script 웹 앱 URL을 넣어두면 휴대폰·PC 어디서 열어도 자동 연동됩니다.
  //   예) "https://script.google.com/macros/s/AKfycb..../exec"
  DEFAULT_API_URL: "",

  URL_STORAGE_KEY: "agri_sheets_api_url",
  QUEUE_KEY: "agri_sync_queue",

  getApiUrl() {
    return localStorage.getItem(this.URL_STORAGE_KEY) || this.DEFAULT_API_URL || "";
  },

  setApiUrl(url) {
    if (url) localStorage.setItem(this.URL_STORAGE_KEY, url.trim());
    else localStorage.removeItem(this.URL_STORAGE_KEY);
  },

  isConnected() {
    return this.getApiUrl().startsWith("https://script.google.com/macros/s/");
  },

  // 주소창에 ?api=웹앱URL 을 붙여 열면 해당 기기에 자동 저장 (휴대폰 설정용)
  applyUrlFromQuery() {
    const params = new URLSearchParams(location.search);
    const api = params.get("api");
    if (api && api.startsWith("https://script.google.com/macros/s/")) {
      this.setApiUrl(api);
      params.delete("api");
      const qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
      return true;
    }
    return false;
  },

  // ---------- 서버 통신 ----------
  async fetchData() {
    if (!this.isConnected()) throw new Error("구글 시트 웹 앱 URL이 설정되지 않았습니다.");
    const res = await fetch(this.getApiUrl() + "?t=" + Date.now(), { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || "구글 시트 읽기 실패");
    return { purchases: result.purchases || [], sales: result.sales || [] };
  },

  async post(payload) {
    if (!this.isConnected()) throw new Error("구글 시트 웹 앱 URL이 설정되지 않았습니다.");
    const res = await fetch(this.getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // CORS 사전요청 회피
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || "구글 시트 저장 실패");
    return result;
  },

  // 전체 덮어쓰기 (설정 탭의 "내보내기" 버튼용)
  async syncData(purchases, sales) {
    const r = await this.post({ action: "sync", purchases, sales });
    this.clearQueue();
    return r.message || "동기화 완료";
  },

  // ---------- 전송 대기열 ----------
  getQueue() {
    try { return JSON.parse(localStorage.getItem(this.QUEUE_KEY)) || []; } catch { return []; }
  },
  setQueue(q) {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(q));
  },
  clearQueue() {
    localStorage.removeItem(this.QUEUE_KEY);
  },
  pendingCount() {
    return this.getQueue().length;
  },

  // type: "purchases" | "sales"
  queueUpsert(type, record) {
    // 같은 레코드에 대한 이전 대기 작업은 제거 (최신 것만 전송)
    const q = this.getQueue().filter(op => !(op.type === type && (op.record?.id || op.id) === record.id));
    q.push({ action: "upsert", type, record });
    this.setQueue(q);
  },
  queueDelete(type, id) {
    const q = this.getQueue().filter(op => !(op.type === type && (op.record?.id || op.id) === id));
    q.push({ action: "delete", type, id });
    this.setQueue(q);
  },

  _flushing: null,
  // 대기열 전송. 성공 시 true
  async flush() {
    if (!this.isConnected()) return false;
    if (this._flushing) return this._flushing;
    this._flushing = (async () => {
      const q = this.getQueue();
      if (!q.length) return true;
      try {
        await this.post({ action: "batch", ops: q });
        // 전송 중에 새로 쌓인 작업은 남겨둠
        const sent = new Set(q.map(op => JSON.stringify(op)));
        this.setQueue(this.getQueue().filter(op => !sent.has(JSON.stringify(op))));
        return true;
      } catch (e) {
        console.warn("대기열 전송 실패 (나중에 재시도):", e);
        return false;
      }
    })();
    try { return await this._flushing; } finally { this._flushing = null; }
  },

  // 대기열에 아직 남은 변경을 시트 데이터 위에 덮어씌움 (전송 전 데이터가 사라지지 않도록)
  mergePending(data) {
    const result = { purchases: [...data.purchases], sales: [...data.sales] };
    for (const op of this.getQueue()) {
      const list = result[op.type];
      if (!list) continue;
      if (op.action === "upsert") {
        const i = list.findIndex(r => String(r.id) === String(op.record.id));
        if (i >= 0) list[i] = op.record; else list.unshift(op.record);
      } else if (op.action === "delete") {
        result[op.type] = list.filter(r => String(r.id) !== String(op.id));
      }
    }
    return result;
  }
};

window.SheetsService = SheetsService;
