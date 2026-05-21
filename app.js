/**
 * 농산물 매입/매출 관리 시스템 - 메인 애플리케이션 로직 (app.js)
 */

// 애플리케이션 전역 상태 객체
const AppState = {
    purchases: [],
    sales: [],
    products: ["매실", "양상추", "배", "수출배", "밤", "대봉감", "배추", "무"],
    
    // 테이블 페이징 상태
    purchasePage: 1,
    salesPage: 1,
    itemsPerPage: 10,
    
    // 검색 및 필터 상태
    filters: {
        purchaseSearch: "",
        purchaseStatus: "",
        salesSearch: "",
        salesStatus: ""
    }
};

// ==========================================================================
// 1. 초기 더미(Mock) 데이터 정의 (최초 실행 시 탑재)
// ==========================================================================
const MOCK_PURCHASES = [
    { id: "pur_1", date: "2026-03-10", product: "매실", supplier: "광양 매실농가", quantity: 200, unitPrice: 3000, totalPrice: 600000, status: "지불완료", notes: "청매실 상급" },
    { id: "pur_2", date: "2026-03-15", product: "수출배", supplier: "무안 햇살농장", quantity: 300, unitPrice: 1500, totalPrice: 450000, status: "지불완료", notes: "망 포장" },
    { id: "pur_3", date: "2026-04-02", product: "양상추", supplier: "남해 양상추농가", quantity: 150, unitPrice: 1800, totalPrice: 270000, status: "지불완료", notes: "신선도 우수" },
    { id: "pur_4", date: "2026-04-12", product: "배", supplier: "제주 구좌농협", quantity: 100, unitPrice: 2500, totalPrice: 250000, status: "미지급", notes: "잔금 이월 예정" },
    { id: "pur_5", date: "2026-04-20", product: "밤", supplier: "의성 마늘작목반", quantity: 80, unitPrice: 8000, totalPrice: 640000, status: "지불완료", notes: "건조 상태 양호" },
    { id: "pur_6", date: "2026-05-02", product: "매실", supplier: "광양 매실농가", quantity: 250, unitPrice: 3200, totalPrice: 800000, status: "지불완료", notes: "추가 발주분" },
    { id: "pur_7", date: "2026-05-10", product: "대봉감", supplier: "진도 대파유통", quantity: 150, unitPrice: 1800, totalPrice: 270000, status: "지불완료", notes: "단 묶음 포장" },
    { id: "pur_8", date: "2026-05-15", product: "수출배", supplier: "무안 햇살농장", quantity: 400, unitPrice: 1600, totalPrice: 640000, status: "미지급", notes: "신용 매입" }
];

const MOCK_SALES = [
    { id: "sal_1", date: "2026-03-12", product: "매실", customer: "서울 가락상회", quantity: 120, unitPrice: 4800, totalPrice: 576000, status: "수금완료", notes: "화물 발송" },
    { id: "sal_2", date: "2026-03-18", product: "수출배", customer: "인천 대형식자재", quantity: 200, unitPrice: 2500, totalPrice: 500000, status: "수금완료", notes: "정기 납품" },
    { id: "sal_3", date: "2026-04-05", product: "양상추", customer: "경기 로컬푸드", quantity: 100, unitPrice: 2800, totalPrice: 280000, status: "수금완료", notes: "신선 박스 납품" },
    { id: "sal_4", date: "2026-04-18", product: "배", customer: "서울 가락상회", quantity: 70, unitPrice: 4000, totalPrice: 280000, status: "미수금", notes: "말일 일괄 결제 약속" },
    { id: "sal_5", date: "2026-04-25", product: "밤", customer: "부산 농산물도매", quantity: 50, unitPrice: 12000, totalPrice: 600000, status: "수금완료", notes: "망 마늘" },
    { id: "sal_6", date: "2026-05-05", product: "매실", customer: "인천 대형식자재", quantity: 100, unitPrice: 4900, totalPrice: 490000, status: "수금완료", notes: "단가 인상분 반영" },
    { id: "sal_7", date: "2026-05-12", product: "대봉감", customer: "경기 로컬푸드", quantity: 120, unitPrice: 2800, totalPrice: 336000, status: "수금완료", notes: "대파 벌크 납품" },
    { id: "sal_8", date: "2026-05-18", product: "수출배", customer: "서울 가락상회", quantity: 200, unitPrice: 2600, totalPrice: 520000, status: "미수금", notes: "추가 미결제 잔액" }
];

// ==========================================================================
// 2. 유틸리티 함수
// ==========================================================================

// 금액 포맷 (1,000원 단위 콤마)
function formatCurrency(value) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
}

// 원화 기호 빼고 천단위 콤마만 제공
function formatNumber(value) {
    return new Intl.NumberFormat('ko-KR').format(value);
}

// 날짜 포맷 (년-월)
function formatYearMonth(dateStr) {
    if (!dateStr) return "";
    return dateStr.substring(0, 7);
}

// 고유 ID 생성기
function generateUniqueId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// 토스트 메시지 생성
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let iconSvg = "";
    if (type === "success") {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "error") {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    
    // 강제 리플로우 유발 후 쇼핑 효과
    setTimeout(() => toast.classList.add("show"), 10);

    // 3.5초 후 자동 소멸
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// 전면 스피너 로딩 켜고 끄기
function toggleSpinner(show) {
    const spinner = document.getElementById("spinnerOverlay");
    if (spinner) {
        if (show) spinner.classList.add("active");
        else spinner.classList.remove("active");
    }
}

// ==========================================================================
// 3. 비즈니스 로직 및 재고 계산
// ==========================================================================

// 데이터 로드
function loadData() {
    const savedPurchases = localStorage.getItem("agri_purchases");
    const savedSales = localStorage.getItem("agri_sales");

    if (savedPurchases && savedSales) {
        AppState.purchases = JSON.parse(savedPurchases);
        AppState.sales = JSON.parse(savedSales);
    } else {
        // 저장된 데이터가 없는 경우 더미 데이터를 기본값으로 설정 및 저장
        AppState.purchases = [...MOCK_PURCHASES];
        AppState.sales = [...MOCK_SALES];
        saveDataToLocalStorage();
    }
    
    // 제품 목록 갱신 (품목들 수집)
    updateProductList();
}

// 로컬 스토리지에 데이터 저장
function saveDataToLocalStorage() {
    localStorage.setItem("agri_purchases", JSON.stringify(AppState.purchases));
    localStorage.setItem("agri_sales", JSON.stringify(AppState.sales));
}

// 고유 품목 추출 및 셀렉트 박스 채우기
function updateProductList() {
    const allProducts = new Set([...AppState.products]);
    AppState.purchases.forEach(p => allProducts.add(p.product));
    AppState.sales.forEach(s => allProducts.add(s.product));
    AppState.products = Array.from(allProducts).filter(Boolean);
    
    // 폼 셀렉트 박스들에 옵션 채우기
    const selects = ["purProduct", "salProduct", "filterPurProduct", "filterSalProduct"];
    selects.forEach(id => {
        const selectEl = document.getElementById(id);
        if (!selectEl) return;
        
        // 기존 옵션 지우기 (첫번째 기본 옵션 제외)
        const firstOption = selectEl.options[0];
        selectEl.innerHTML = "";
        if (firstOption) selectEl.appendChild(firstOption);
        
        AppState.products.forEach(prod => {
            const opt = document.createElement("option");
            opt.value = prod;
            opt.textContent = prod;
            selectEl.appendChild(opt);
        });
    });
}

// 재고 현황 계산 함수
function calculateInventory() {
    const inventory = {};

    // 1. 매입 품목 취합 (입고)
    AppState.purchases.forEach(p => {
        const prod = p.product;
        if (!inventory[prod]) {
            inventory[prod] = { product: prod, purchasedQty: 0, purchasedTotal: 0, soldQty: 0, soldTotal: 0 };
        }
        inventory[prod].purchasedQty += p.quantity;
        inventory[prod].purchasedTotal += p.totalPrice;
    });

    // 2. 매출 품목 취합 (출고)
    AppState.sales.forEach(s => {
        const prod = s.product;
        if (!inventory[prod]) {
            inventory[prod] = { product: prod, purchasedQty: 0, purchasedTotal: 0, soldQty: 0, soldTotal: 0 };
        }
        inventory[prod].soldQty += s.quantity;
        inventory[prod].soldTotal += s.totalPrice;
    });

    // 3. 최종 재고 및 평균가 계산
    const stockList = Object.values(inventory).map(item => {
        const currentStock = item.purchasedQty - item.soldQty;
        // 평균 매입 단가 계산
        const avgPurchasePrice = item.purchasedQty > 0 ? Math.round(item.purchasedTotal / item.purchasedQty) : 0;
        // 재고 평가액 (현재재고 * 평균매입단가)
        const inventoryValue = currentStock > 0 ? currentStock * avgPurchasePrice : 0;
        
        return {
            product: item.product,
            purchasedQty: item.purchasedQty,
            soldQty: item.soldQty,
            currentStock: currentStock,
            avgPurchasePrice: avgPurchasePrice,
            inventoryValue: inventoryValue
        };
    });

    return stockList;
}

// ==========================================================================
// 4. UI 렌더링 함수들
// ==========================================================================

// 대시보드 통계 카드 카드 업데이트
function renderDashboardStats() {
    // 1. 총 매입
    const totalPurchases = AppState.purchases.reduce((acc, curr) => acc + curr.totalPrice, 0);
    document.getElementById("statTotalPurchases").textContent = formatCurrency(totalPurchases);

    // 2. 총 매출
    const totalSales = AppState.sales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    document.getElementById("statTotalSales").textContent = formatCurrency(totalSales);

    // 3. 당기 순이익
    const netProfit = totalSales - totalPurchases;
    const profitEl = document.getElementById("statNetProfit");
    profitEl.textContent = formatCurrency(netProfit);
    
    // 순이익 상태별 색상 튜닝
    if (netProfit >= 0) {
        profitEl.style.color = "var(--color-success)";
    } else {
        profitEl.style.color = "var(--color-danger)";
    }

    // 4. 당월 거래 건수
    const currentMonth = new Date().toISOString().slice(0, 7); // yyyy-mm
    const thisMonthPurchases = AppState.purchases.filter(p => p.date.startsWith(currentMonth)).length;
    const thisMonthSales = AppState.sales.filter(s => s.date.startsWith(currentMonth)).length;
    const totalTransactions = thisMonthPurchases + thisMonthSales;
    document.getElementById("statTransactionCount").textContent = `${formatNumber(totalTransactions)} 건`;
    
    // 미결제 건수 및 미수금 현황 요약
    const unpaidPurchases = AppState.purchases.filter(p => p.status === "미지급").reduce((a, c) => a + c.totalPrice, 0);
    const unpaidSales = AppState.sales.filter(s => s.status === "미수금").reduce((a, c) => a + c.totalPrice, 0);
    
    document.getElementById("dashboardTrendPur").innerHTML = `<span style="color:var(--color-danger)">미지급액: ${formatCurrency(unpaidPurchases)}</span>`;
    document.getElementById("dashboardTrendSal").innerHTML = `<span style="color:var(--color-danger)">미수금액: ${formatCurrency(unpaidSales)}</span>`;
    document.getElementById("dashboardTrendProfit").innerHTML = `마진율: ${totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0}%`;
    document.getElementById("dashboardTrendCount").innerHTML = `금월 매입: ${thisMonthPurchases}건 | 매출: ${thisMonthSales}건`;
}

// 최근 거래 내역 표 렌더링
function renderRecentTransactions() {
    const listBody = document.getElementById("recentTransactionsList");
    if (!listBody) return;

    listBody.innerHTML = "";

    // 매입과 매출을 섞어서 날짜 내림차순 정렬 후 최근 5개 추출
    const sortedAll = [
        ...AppState.purchases.map(p => ({ ...p, type: "매입" })),
        ...AppState.sales.map(s => ({ ...s, type: "매출" }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const recent = sortedAll.slice(0, 5);

    if (recent.length === 0) {
        listBody.innerHTML = `<tr><td colspan="6" class="no-data">최근 거래 내역이 없습니다.</td></tr>`;
        return;
    }

    recent.forEach(item => {
        const tr = document.createElement("tr");
        const typeBadge = item.type === "매입" 
            ? `<span class="badge badge-info">매입</span>` 
            : `<span class="badge badge-success">매출</span>`;
            
        const amountColor = item.type === "매입" ? "var(--color-purchase)" : "var(--color-sales)";

        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${typeBadge}</td>
            <td style="font-weight:600;">${item.product}</td>
            <td>${item.supplier || item.customer || "-"}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.quantity)}</td>
            <td style="font-family:var(--font-heading); font-weight:700; color:${amountColor}; text-align:right;">${formatCurrency(item.totalPrice)}</td>
        `;
        listBody.appendChild(tr);
    });
}

// ==========================================================================
// 5. 맞춤형 dynamic SVG 차트 생성기 (프리미엄 UI 핵심)
// ==========================================================================

// 월별 매입/매출 트렌드 차트 (SVG)
function renderTrendChart() {
    const container = document.getElementById("trendChartContainer");
    if (!container) return;
    container.innerHTML = "";

    // 1. 최근 6달 계산
    const months = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
        months.push(d.toISOString().slice(0, 7)); // yyyy-MM
    }

    // 2. 월별 매입, 매출액 합산
    const monthlyData = months.map(m => {
        const purTotal = AppState.purchases
            .filter(p => p.date.startsWith(m))
            .reduce((acc, curr) => acc + curr.totalPrice, 0);
        
        const salTotal = AppState.sales
            .filter(s => s.date.startsWith(s.date.startsWith(m) ? m : m)) // 오타 방지
            .filter(s => s.date.startsWith(m))
            .reduce((acc, curr) => acc + curr.totalPrice, 0);

        return {
            month: m.split("-")[1] + "월", // MM월 포맷
            purchases: purTotal,
            sales: salTotal
        };
    });

    // 3. 최대 스케일 구하기
    const maxVal = Math.max(...monthlyData.map(d => Math.max(d.purchases, d.sales)), 1000000);
    // Y축 격자선 조정을 위한 반올림 단위 세팅
    const yMax = Math.ceil(maxVal / 500000) * 500000;

    // SVG 기본 크기 변수
    const width = 560;
    const height = 240;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // SVG 요소 생성
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "chart-svg");

    // 격자선 (Grid Lines) 및 Y축 라벨 생성 (5단계 분할)
    for (let i = 0; i <= 4; i++) {
        const yVal = (yMax / 4) * i;
        const yPos = chartHeight + paddingTop - (chartHeight * (yVal / yMax));
        
        // 라인
        const line = document.createElementNS(svgNamespace, "line");
        line.setAttribute("x1", paddingLeft);
        line.setAttribute("y1", yPos);
        line.setAttribute("x2", width - paddingRight);
        line.setAttribute("y2", yPos);
        line.setAttribute("class", "chart-grid-line");
        svg.appendChild(line);

        // 텍스트 라벨
        const text = document.createElementNS(svgNamespace, "text");
        text.setAttribute("x", paddingLeft - 10);
        text.setAttribute("y", yPos + 4);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("class", "chart-axis-text");
        text.textContent = yVal >= 10000 ? (yVal / 10000) + "만" : yVal;
        svg.appendChild(text);
    }

    // 데이터 막대 바(Bar) 그리기 (이중 바 차트 형태)
    const numMonths = monthlyData.length;
    const groupWidth = chartWidth / numMonths;
    const barWidth = groupWidth * 0.3;
    const barGap = 4;

    monthlyData.forEach((d, idx) => {
        const groupX = paddingLeft + (idx * groupWidth);
        const centerX = groupX + (groupWidth / 2);

        // 1. 매입 막대 (왼쪽)
        const purBarHeight = chartHeight * (d.purchases / yMax);
        const purBarX = centerX - barWidth - barGap/2;
        const purBarY = chartHeight + paddingTop - purBarHeight;
        
        if (d.purchases > 0) {
            const purRect = document.createElementNS(svgNamespace, "rect");
            purRect.setAttribute("x", purBarX);
            purRect.setAttribute("y", purBarY);
            purRect.setAttribute("width", barWidth);
            purRect.setAttribute("height", purBarHeight);
            purRect.setAttribute("rx", "3"); // 둥근 모서리
            purRect.setAttribute("class", "chart-bar purchase-bar");
            
            // 호버 툴팁용 이벤트
            purRect.addEventListener("mousemove", (e) => showChartTooltip(e, `${d.month} 매입`, formatCurrency(d.purchases)));
            purRect.addEventListener("mouseout", hideChartTooltip);
            svg.appendChild(purRect);
        }

        // 2. 매출 막대 (오른쪽)
        const salBarHeight = chartHeight * (d.sales / yMax);
        const salBarX = centerX + barGap/2;
        const salBarY = chartHeight + paddingTop - salBarHeight;

        if (d.sales > 0) {
            const salRect = document.createElementNS(svgNamespace, "rect");
            salRect.setAttribute("x", salBarX);
            salRect.setAttribute("y", salBarY);
            salRect.setAttribute("width", barWidth);
            salRect.setAttribute("height", salBarHeight);
            salRect.setAttribute("rx", "3");
            salRect.setAttribute("class", "chart-bar sales-bar");
            
            salRect.addEventListener("mousemove", (e) => showChartTooltip(e, `${d.month} 매출`, formatCurrency(d.sales)));
            salRect.addEventListener("mouseout", hideChartTooltip);
            svg.appendChild(salRect);
        }

        // X축 달 이름 라벨
        const xText = document.createElementNS(svgNamespace, "text");
        xText.setAttribute("x", centerX);
        xText.setAttribute("y", height - paddingBottom + 20);
        xText.setAttribute("text-anchor", "middle");
        xText.setAttribute("class", "chart-axis-text");
        xText.setAttribute("style", "font-weight: 600;");
        xText.textContent = d.month;
        svg.appendChild(xText);
    });

    container.appendChild(svg);
}

// 품목별 매출 비중 도넛 차트 (SVG)
function renderDonutChart() {
    const container = document.getElementById("donutChartContainer");
    if (!container) return;
    container.innerHTML = "";

    // 1. 품목별 매출 집계
    const productSales = {};
    AppState.sales.forEach(s => {
        productSales[s.product] = (productSales[s.product] || 0) + s.totalPrice;
    });

    const sortedProdSales = Object.entries(productSales)
        .map(([name, val]) => ({ name, value: val }))
        .sort((a, b) => b.value - a.value);

    if (sortedProdSales.length === 0) {
        container.innerHTML = `<div class="no-data" style="padding:0">매출 데이터가 없습니다.</div>`;
        return;
    }

    // 2. 상위 3가지 품목 외에는 '기타'로 합산
    const chartSegments = [];
    let totalSalesVal = 0;
    
    sortedProdSales.forEach((p, idx) => {
        totalSalesVal += p.value;
        if (idx < 3) {
            chartSegments.push(p);
        } else {
            if (!chartSegments[3]) chartSegments[3] = { name: "기타", value: 0 };
            chartSegments[3].value += p.value;
        }
    });

    // 3. 도넛 차트 계산
    // 색상 셋팅
    const colors = [
        "var(--color-primary)",  // 1순위: 에메랄드
        "var(--color-purchase)", // 2순위: 파랑
        "var(--color-profit)",   // 3순위: 주황
        "var(--color-info)"      // 4순위(기타): 파란하늘색
    ];

    const size = 200;
    const r = 60; // 반경
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r; // 둘레 (약 377)

    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("class", "chart-svg");

    // 기본 가이드 세그먼트 그리기 (중앙 구멍용 텍스트는 맨 뒤에)
    let currentOffset = 0;

    chartSegments.forEach((segment, idx) => {
        const percent = segment.value / totalSalesVal;
        const strokeLength = circumference * percent;
        const strokeOffset = circumference - currentOffset;

        const circle = document.createElementNS(svgNamespace, "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", r);
        circle.setAttribute("class", "donut-segment");
        circle.setAttribute("style", `stroke: ${colors[idx % colors.length]}; stroke-dasharray: ${strokeLength} ${circumference - strokeLength}; stroke-dashoffset: ${strokeOffset}; transform: rotate(-90deg); transform-origin: ${cx}px ${cy}px;`);
        
        // 마우스 상호작용
        circle.addEventListener("mouseover", () => {
            document.getElementById("donutTextVal").textContent = Math.round(percent * 100) + "%";
            document.getElementById("donutTextLbl").textContent = segment.name;
        });

        circle.addEventListener("mouseout", () => {
            // 기본 총 합계로 복구
            document.getElementById("donutTextVal").textContent = formatNumber(sortedProdSales.length) + "종";
            document.getElementById("donutTextLbl").textContent = "총 판매 품목";
        });
        
        circle.addEventListener("mousemove", (e) => {
            showChartTooltip(e, segment.name, `${formatCurrency(segment.value)} (${Math.round(percent*100)}%)`);
        });
        circle.addEventListener("mouseout", hideChartTooltip);

        svg.appendChild(circle);

        currentOffset += strokeLength;
    });

    // 중앙 텍스트 영역
    const textG = document.createElementNS(svgNamespace, "g");
    textG.setAttribute("class", "donut-center-text");

    const textVal = document.createElementNS(svgNamespace, "text");
    textVal.setAttribute("x", cx);
    textVal.setAttribute("y", cy + 4);
    textVal.setAttribute("id", "donutTextVal");
    textVal.setAttribute("class", "donut-label-val");
    textVal.textContent = sortedProdSales.length + "종";
    textG.appendChild(textVal);

    const textLbl = document.createElementNS(svgNamespace, "text");
    textLbl.setAttribute("x", cx);
    textLbl.setAttribute("y", cy + 22);
    textLbl.setAttribute("id", "donutTextLbl");
    textLbl.setAttribute("class", "donut-label-lbl");
    textLbl.textContent = "총 판매 품목";
    textG.appendChild(textLbl);

    svg.appendChild(textG);
    container.appendChild(svg);
}

// 툴팁 노출 유틸
let activeTooltip = null;
function showChartTooltip(e, title, value) {
    if (!activeTooltip) {
        activeTooltip = document.createElement("div");
        activeTooltip.className = "chart-tooltip";
        document.body.appendChild(activeTooltip);
    }
    
    activeTooltip.innerHTML = `<strong>${title}</strong><br>${value}`;
    activeTooltip.style.opacity = "1";
    activeTooltip.style.left = (e.pageX + 15) + "px";
    activeTooltip.style.top = (e.pageY - 15) + "px";
}

function hideChartTooltip() {
    if (activeTooltip) {
        activeTooltip.style.opacity = "0";
    }
}

// ==========================================================================
// 6. 매입(Purchases) 및 매출(Sales) 내역 테이블 렌더링
// ==========================================================================

// 매입 로그 테이블 렌더링
function renderPurchaseTable() {
    const listBody = document.getElementById("purchaseList");
    if (!listBody) return;

    listBody.innerHTML = "";

    // 필터링 적용
    let filtered = AppState.purchases;
    
    const searchVal = AppState.filters.purchaseSearch.toLowerCase().trim();
    if (searchVal) {
        filtered = filtered.filter(p => 
            p.product.toLowerCase().includes(searchVal) || 
            p.supplier.toLowerCase().includes(searchVal) ||
            (p.notes && p.notes.toLowerCase().includes(searchVal))
        );
    }

    const statusVal = AppState.filters.purchaseStatus;
    if (statusVal) {
        filtered = filtered.filter(p => p.status === statusVal);
    }

    // 날짜 역순(최신순) 정렬
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 페이지네이션 슬라이스
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / AppState.itemsPerPage) || 1;
    
    // 페이지 범위 조정
    if (AppState.purchasePage > totalPages) AppState.purchasePage = totalPages;
    const startIdx = (AppState.purchasePage - 1) * AppState.itemsPerPage;
    const endIdx = startIdx + AppState.itemsPerPage;
    const pagedItems = filtered.slice(startIdx, endIdx);

    // 카운트 UI 업데이트
    document.getElementById("purchaseCountText").textContent = `총 ${totalItems}건`;
    document.getElementById("purchasePageInfo").textContent = `${AppState.purchasePage} / ${totalPages} 페이지`;
    
    // 페이지네이션 버튼 상태
    document.getElementById("btnPrevPurchasePage").disabled = AppState.purchasePage === 1;
    document.getElementById("btnNextPurchasePage").disabled = AppState.purchasePage === totalPages;

    if (pagedItems.length === 0) {
        listBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>검색 조건에 맞는 매입 내역이 없습니다.</p>
                </td>
            </tr>
        `;
        return;
    }

    pagedItems.forEach(item => {
        const tr = document.createElement("tr");
        const statusBadgeClass = item.status === "지불완료" ? "badge-success" : "badge-danger";
        
        tr.innerHTML = `
            <td>${item.date}</td>
            <td style="font-weight:600;">${item.product}</td>
            <td>${item.supplier}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.quantity)}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.unitPrice)}</td>
            <td style="font-family:var(--font-heading); font-weight:700; color:var(--color-purchase); text-align:right;">${formatCurrency(item.totalPrice)}</td>
            <td><span class="badge ${statusBadgeClass}">${item.status}</span></td>
            <td style="max-width:150px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.notes || "-"}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="openEditPurchaseModal('${item.id}')" title="수정">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn delete-btn" onclick="deletePurchaseRecord('${item.id}')" title="삭제">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

// 매출 로그 테이블 렌더링
function renderSalesTable() {
    const listBody = document.getElementById("salesList");
    if (!listBody) return;

    listBody.innerHTML = "";

    // 필터링 적용
    let filtered = AppState.sales;

    const searchVal = AppState.filters.salesSearch.toLowerCase().trim();
    if (searchVal) {
        filtered = filtered.filter(s => 
            s.product.toLowerCase().includes(searchVal) || 
            s.customer.toLowerCase().includes(searchVal) ||
            (s.notes && s.notes.toLowerCase().includes(searchVal))
        );
    }

    const statusVal = AppState.filters.salesStatus;
    if (statusVal) {
        filtered = filtered.filter(s => s.status === statusVal);
    }

    // 날짜 역순 정렬
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 페이지네이션 슬라이스
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / AppState.itemsPerPage) || 1;

    if (AppState.salesPage > totalPages) AppState.salesPage = totalPages;
    const startIdx = (AppState.salesPage - 1) * AppState.itemsPerPage;
    const endIdx = startIdx + AppState.itemsPerPage;
    const pagedItems = filtered.slice(startIdx, endIdx);

    // 카운트 UI 업데이트
    document.getElementById("salesCountText").textContent = `총 ${totalItems}건`;
    document.getElementById("salesPageInfo").textContent = `${AppState.salesPage} / ${totalPages} 페이지`;

    // 페이지네이션 버튼 상태
    document.getElementById("btnPrevSalesPage").disabled = AppState.salesPage === 1;
    document.getElementById("btnNextSalesPage").disabled = AppState.salesPage === totalPages;

    if (pagedItems.length === 0) {
        listBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>검색 조건에 맞는 매출 내역이 없습니다.</p>
                </td>
            </tr>
        `;
        return;
    }

    pagedItems.forEach(item => {
        const tr = document.createElement("tr");
        const statusBadgeClass = item.status === "수금완료" ? "badge-success" : "badge-danger";

        tr.innerHTML = `
            <td>${item.date}</td>
            <td style="font-weight:600;">${item.product}</td>
            <td>${item.customer}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.quantity)}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.unitPrice)}</td>
            <td style="font-family:var(--font-heading); font-weight:700; color:var(--color-sales); text-align:right;">${formatCurrency(item.totalPrice)}</td>
            <td><span class="badge ${statusBadgeClass}">${item.status}</span></td>
            <td style="max-width:150px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.notes || "-"}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="openEditSalesModal('${item.id}')" title="수정">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteSalesRecord('${item.id}')" title="삭제">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

// 재고 대시보드 및 테이블 렌더링
function renderInventoryView() {
    const listBody = document.getElementById("inventoryList");
    if (!listBody) return;

    listBody.innerHTML = "";

    const stockList = calculateInventory();

    if (stockList.length === 0) {
        listBody.innerHTML = `<tr><td colspan="7" class="no-data">재고 산출을 위한 매입/매출 거래 건이 없습니다.</td></tr>`;
        return;
    }

    stockList.forEach(item => {
        const tr = document.createElement("tr");
        
        // 재고 상태 뱃지
        let stockBadge = `<span class="badge badge-success">여유</span>`;
        if (item.currentStock <= 0) {
            stockBadge = `<span class="badge badge-danger">품절</span>`;
        } else if (item.currentStock < 30) {
            stockBadge = `<span class="badge badge-warning">재고부족</span>`;
        }

        tr.innerHTML = `
            <td style="font-weight:700;">${item.product}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.purchasedQty)}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.soldQty)}</td>
            <td style="font-family:var(--font-heading); font-weight:700; text-align:right; color:${item.currentStock > 0 ? "var(--text-primary)" : "var(--color-danger)"}">${formatNumber(item.currentStock)}</td>
            <td style="font-family:var(--font-heading); text-align:right;">${formatNumber(item.avgPurchasePrice)} 원</td>
            <td style="font-family:var(--font-heading); font-weight:700; color:var(--color-profit); text-align:right;">${formatCurrency(item.inventoryValue)}</td>
            <td>${stockBadge}</td>
        `;
        listBody.appendChild(tr);
    });

    // 재고 카드 그리드 렌더링 (카드 시각화)
    renderInventoryCards(stockList);
}

// 재고 카드 리스트 렌더링
function renderInventoryCards(stockList) {
    const cardGrid = document.getElementById("inventoryCardGrid");
    if (!cardGrid) return;

    cardGrid.innerHTML = "";

    stockList.forEach(item => {
        const div = document.createElement("div");
        div.className = "stock-card";

        // 재고 바 백분율 계산 (기준값: 200개 초과 시 100%)
        const percentage = Math.min((item.currentStock / 200) * 100, 100);
        let barClass = "";
        let statusText = "안정";
        
        if (item.currentStock <= 0) {
            barClass = "danger";
            statusText = "품절";
        } else if (item.currentStock < 30) {
            barClass = "warning";
            statusText = "부족";
        }

        div.innerHTML = `
            <div class="stock-card-header">
                <span class="stock-product-name">${item.product}</span>
                <span class="badge ${barClass ? "badge-" + barClass : "badge-success"}">${statusText}</span>
            </div>
            
            <div class="stock-stats">
                <div>
                    <div class="stock-stat-label">총 입고량</div>
                    <div class="stock-stat-value">${formatNumber(item.purchasedQty)}</div>
                </div>
                <div>
                    <div class="stock-stat-label">총 출고량</div>
                    <div class="stock-stat-value">${formatNumber(item.soldQty)}</div>
                </div>
                <div>
                    <div class="stock-stat-label">현재 재고</div>
                    <div class="stock-stat-value" style="color: ${item.currentStock > 0 ? "inherit" : "var(--color-danger)"}">${formatNumber(item.currentStock)}</div>
                </div>
                <div>
                    <div class="stock-stat-label">평균 매입단가</div>
                    <div class="stock-stat-value">${formatNumber(item.avgPurchasePrice)}원</div>
                </div>
            </div>

            <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-secondary);">
                    <span>재고 평가액</span>
                    <span style="font-weight:700; color:var(--color-profit);">${formatCurrency(item.inventoryValue)}</span>
                </div>
                <div class="stock-status-bar">
                    <div class="stock-fill ${barClass}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        cardGrid.appendChild(div);
    });
}

// 화면 전체 업데이트
function refreshAllUI() {
    renderDashboardStats();
    renderRecentTransactions();
    renderTrendChart();
    renderDonutChart();
    renderPurchaseTable();
    renderSalesTable();
    renderInventoryView();
    updateConnectionBadge();
}

// ==========================================================================
// 7. 모달창 관리 및 이벤트 핸들링
// ==========================================================================

// 수량, 단가 실시간 합계 자동 계산 리스너
function setupAutocalculate() {
    // 매입 폼
    const purQty = document.getElementById("purQuantity");
    const purPrice = document.getElementById("purUnitPrice");
    const purTotal = document.getElementById("purTotalPrice");
    
    const calculatePurTotal = () => {
        const qty = parseFloat(purQty.value) || 0;
        const price = parseFloat(purPrice.value) || 0;
        purTotal.value = qty * price; // 콤마 포맷 없이 계산용 원본 저장
    };
    purQty.addEventListener("input", calculatePurTotal);
    purPrice.addEventListener("input", calculatePurTotal);

    // 매출 폼
    const salQty = document.getElementById("salQuantity");
    const salPrice = document.getElementById("salUnitPrice");
    const salTotal = document.getElementById("salTotalPrice");
    
    const calculateSalTotal = () => {
        const qty = parseFloat(salQty.value) || 0;
        const price = parseFloat(salPrice.value) || 0;
        salTotal.value = qty * price;
    };
    salQty.addEventListener("input", calculateSalTotal);
    salPrice.addEventListener("input", calculateSalTotal);
}

// 매입 등록 모달 오픈
function openAddPurchaseModal() {
    document.getElementById("purchaseModalTitle").textContent = "매입 등록";
    document.getElementById("purchaseForm").reset();
    document.getElementById("purId").value = "";
    document.getElementById("purDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("purchaseModal").classList.add("active");
}

// 매입 수정 모달 오픈
function openEditPurchaseModal(id) {
    const item = AppState.purchases.find(p => p.id === id);
    if (!item) return;

    document.getElementById("purchaseModalTitle").textContent = "매입 내역 수정";
    document.getElementById("purId").value = item.id;
    document.getElementById("purDate").value = item.date;
    document.getElementById("purProduct").value = item.product;
    document.getElementById("purSupplier").value = item.supplier;
    document.getElementById("purQuantity").value = item.quantity;
    document.getElementById("purUnitPrice").value = item.unitPrice;
    document.getElementById("purTotalPrice").value = item.totalPrice;
    document.getElementById("purStatus").value = item.status;
    document.getElementById("purNotes").value = item.notes || "";

    document.getElementById("purchaseModal").classList.add("active");
}

// 매입 폼 제출 처리
function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById("purId").value;
    const date = document.getElementById("purDate").value;
    const product = document.getElementById("purProduct").value;
    const supplier = document.getElementById("purSupplier").value.trim();
    const quantity = parseInt(document.getElementById("purQuantity").value) || 0;
    const unitPrice = parseInt(document.getElementById("purUnitPrice").value) || 0;
    const status = document.getElementById("purStatus").value;
    const notes = document.getElementById("purNotes").value.trim();

    if (!product || !supplier || quantity <= 0 || unitPrice <= 0) {
        showToast("모든 필수 입력사항을 채워주세요. (수량/단가는 0보다 커야 합니다)", "error");
        return;
    }

    const totalPrice = quantity * unitPrice;

    if (id) {
        // 기존 수정
        const idx = AppState.purchases.findIndex(p => p.id === id);
        if (idx !== -1) {
            AppState.purchases[idx] = { id, date, product, supplier, quantity, unitPrice, totalPrice, status, notes };
            showToast("매입 내역이 수정되었습니다.", "success");
        }
    } else {
        // 신규 추가
        const newRecord = {
            id: generateUniqueId("pur"),
            date, product, supplier, quantity, unitPrice, totalPrice, status, notes
        };
        AppState.purchases.unshift(newRecord);
        showToast("새로운 매입 내역이 등록되었습니다.", "success");
    }

    saveDataToLocalStorage();
    updateProductList();
    closeModals();
    refreshAllUI();
}

// 매입 레코드 삭제
function deletePurchaseRecord(id) {
    if (!confirm("해당 매입 거래 내역을 정말로 삭제하시겠습니까?")) return;

    AppState.purchases = AppState.purchases.filter(p => p.id !== id);
    saveDataToLocalStorage();
    updateProductList();
    refreshAllUI();
    showToast("매입 내역이 삭제되었습니다.", "success");
}

// 매출 등록 모달 오픈
function openAddSalesModal() {
    document.getElementById("salesModalTitle").textContent = "매출 등록";
    document.getElementById("salesForm").reset();
    document.getElementById("salId").value = "";
    document.getElementById("salDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("salesModal").classList.add("active");
}

// 매출 수정 모달 오픈
function openEditSalesModal(id) {
    const item = AppState.sales.find(s => s.id === id);
    if (!item) return;

    document.getElementById("salesModalTitle").textContent = "매출 내역 수정";
    document.getElementById("salId").value = item.id;
    document.getElementById("salDate").value = item.date;
    document.getElementById("salProduct").value = item.product;
    document.getElementById("salCustomer").value = item.customer;
    document.getElementById("salQuantity").value = item.quantity;
    document.getElementById("salUnitPrice").value = item.unitPrice;
    document.getElementById("salTotalPrice").value = item.totalPrice;
    document.getElementById("salStatus").value = item.status;
    document.getElementById("salNotes").value = item.notes || "";

    document.getElementById("salesModal").classList.add("active");
}

// 매출 폼 제출 처리
function handleSalesSubmit(e) {
    e.preventDefault();

    const id = document.getElementById("salId").value;
    const date = document.getElementById("salDate").value;
    const product = document.getElementById("salProduct").value;
    const customer = document.getElementById("salCustomer").value.trim();
    const quantity = parseInt(document.getElementById("salQuantity").value) || 0;
    const unitPrice = parseInt(document.getElementById("salUnitPrice").value) || 0;
    const status = document.getElementById("salStatus").value;
    const notes = document.getElementById("salNotes").value.trim();

    if (!product || !customer || quantity <= 0 || unitPrice <= 0) {
        showToast("모든 필수 입력사항을 채워주세요.", "error");
        return;
    }

    // 재고 검증 로직 (신규 등록 또는 수량 증량 시 재고 부족 알림)
    const stockList = calculateInventory();
    const currentStockObj = stockList.find(s => s.product === product);
    let originalQty = 0;
    
    if (id) {
        const originalSales = AppState.sales.find(s => s.id === id);
        if (originalSales) originalQty = originalSales.quantity;
    }

    const availableStock = (currentStockObj ? currentStockObj.currentStock : 0) + originalQty;
    if (quantity > availableStock) {
        if (!confirm(`현재 출고 가능 재고(${availableStock}개)보다 판매 수량(${quantity}개)이 많아 마이너스 재고가 발생합니다. 진행하시겠습니까?`)) {
            return;
        }
    }

    const totalPrice = quantity * unitPrice;

    if (id) {
        const idx = AppState.sales.findIndex(s => s.id === id);
        if (idx !== -1) {
            AppState.sales[idx] = { id, date, product, customer, quantity, unitPrice, totalPrice, status, notes };
            showToast("매출 내역이 수정되었습니다.", "success");
        }
    } else {
        const newRecord = {
            id: generateUniqueId("sal"),
            date, product, customer, quantity, unitPrice, totalPrice, status, notes
        };
        AppState.sales.unshift(newRecord);
        showToast("새로운 매출 내역이 등록되었습니다.", "success");
    }

    saveDataToLocalStorage();
    updateProductList();
    closeModals();
    refreshAllUI();
}

// 매출 레코드 삭제
function deleteSalesRecord(id) {
    if (!confirm("해당 매출 거래 내역을 정말로 삭제하시겠습니까?")) return;

    AppState.sales = AppState.sales.filter(s => s.id !== id);
    saveDataToLocalStorage();
    updateProductList();
    refreshAllUI();
    showToast("매출 내역이 삭제되었습니다.", "success");
}

// 모든 모달창 닫기
function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(el => el.classList.remove("active"));
}

// ==========================================================================
// 8. 구글 시트 연동 로직
// ==========================================================================

// 연결 상태 배지 정보 갱신
function updateConnectionBadge() {
    const badges = document.querySelectorAll(".connection-badge");
    const isConnected = SheetsService.isConnected();
    
    badges.forEach(badge => {
        if (isConnected) {
            badge.className = "connection-badge connected";
            badge.innerHTML = `<span class="dot"></span><span>구글 시트 연동됨</span>`;
        } else {
            badge.className = "connection-badge disconnected";
            badge.innerHTML = `<span class="dot"></span><span>구글 시트 미연동</span>`;
        }
    });

    const configUrlInput = document.getElementById("sheetsUrlInput");
    if (configUrlInput) {
        configUrlInput.value = SheetsService.getApiUrl();
    }
}

// 구글 시트 URL 저장
function saveSheetsUrlSetting() {
    const input = document.getElementById("sheetsUrlInput");
    const url = input.value.trim();
    
    if (url === "") {
        SheetsService.setApiUrl("");
        updateConnectionBadge();
        showToast("구글 시트 연동 설정이 초기화되었습니다.", "info");
        return;
    }

    if (!url.startsWith("https://script.google.com/macros/s/")) {
        showToast("올바른 Google Apps Script 웹 앱 URL이 아닙니다. ('https://script.google.com/macros/s/...' 시작 확인)", "error");
        return;
    }

    SheetsService.setApiUrl(url);
    updateConnectionBadge();
    showToast("구글 스프레드시트 웹 앱 URL이 저장되었습니다.", "success");
}

// 구글 시트로부터 데이터 불러오기 (가져오기)
async function importFromGoogleSheets() {
    if (!SheetsService.isConnected()) {
        showToast("구글 스프레드시트 연동 설정이 되어 있지 않습니다.", "error");
        return;
    }

    if (!confirm("구글 시트의 데이터를 가져와 현재 브라우저의 로컬 데이터를 완전히 덮어씁니다. 진행하시겠습니까?")) return;

    toggleSpinner(true);
    try {
        const data = await SheetsService.fetchData();
        
        AppState.purchases = data.purchases;
        AppState.sales = data.sales;
        
        saveDataToLocalStorage();
        updateProductList();
        refreshAllUI();
        
        showToast(`불러오기 완료! 매입 ${data.purchases.length}건, 매출 ${data.sales.length}건을 성공적으로 동기화했습니다.`, "success");
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        toggleSpinner(false);
    }
}

// 구글 시트로 데이터 내보내기 (저장하기)
async function exportToGoogleSheets() {
    if (!SheetsService.isConnected()) {
        showToast("구글 스프레드시트 연동 설정이 되어 있지 않습니다.", "error");
        return;
    }

    if (!confirm("현재 브라우저의 모든 매입/매출 데이터를 구글 스프레드시트로 전송하여 덮어씁니다. 진행하시겠습니까?")) return;

    toggleSpinner(true);
    try {
        const msg = await SheetsService.syncData(AppState.purchases, AppState.sales);
        showToast(msg, "success");
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        toggleSpinner(false);
    }
}

// ==========================================================================
// 9. 초기화 및 이벤트 바인딩
// ==========================================================================

// 다크모드/라이트모드 설정
function initTheme() {
    const savedTheme = localStorage.getItem("agri_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeButtonText(savedTheme);

    document.getElementById("btnToggleTheme").addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("agri_theme", nextTheme);
        updateThemeButtonText(nextTheme);
        
        // 차트 색상 갱신을 위해 재렌더링
        renderTrendChart();
        renderDonutChart();
    });
}

function updateThemeButtonText(theme) {
    const btn = document.getElementById("btnToggleTheme");
    if (theme === "dark") {
        btn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><span>라이트 모드</span>`;
    } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><span>다크 모드</span>`;
    }
}

// 탭 전환 관리
function initTabs() {
    const tabs = document.querySelectorAll(".nav-item button");
    const sections = document.querySelectorAll(".content-section");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetTab = tab.getAttribute("data-tab");
            
            // 탭 버튼 활성화
            tabs.forEach(t => t.parentElement.classList.remove("active"));
            tab.parentElement.classList.add("active");
            
            // 콘텐츠 섹션 활성화
            sections.forEach(sec => {
                if (sec.id === targetTab + "Section") {
                    sec.style.display = "block";
                } else {
                    sec.style.display = "none";
                }
            });

            // 차트 크기 동적 대응을 위해 탭 이동 시 차트 다시 그리기
            if (targetTab === "dashboard") {
                renderTrendChart();
                renderDonutChart();
            }
        });
    });
}

// 필터 및 이벤트 리스너 마운트
function setupEventListeners() {
    // 1. 매입 검색 & 필터
    const purchaseSearchInput = document.getElementById("purchaseSearch");
    const purchaseStatusFilter = document.getElementById("filterPurchaseStatus");
    
    purchaseSearchInput.addEventListener("input", (e) => {
        AppState.filters.purchaseSearch = e.target.value;
        AppState.purchasePage = 1; // 검색 시 1페이지로 리셋
        renderPurchaseTable();
    });
    
    purchaseStatusFilter.addEventListener("change", (e) => {
        AppState.filters.purchaseStatus = e.target.value;
        AppState.purchasePage = 1;
        renderPurchaseTable();
    });

    // 2. 매출 검색 & 필터
    const salesSearchInput = document.getElementById("salesSearch");
    const salesStatusFilter = document.getElementById("filterSalesStatus");

    salesSearchInput.addEventListener("input", (e) => {
        AppState.filters.salesSearch = e.target.value;
        AppState.salesPage = 1;
        renderSalesTable();
    });

    salesStatusFilter.addEventListener("change", (e) => {
        AppState.filters.salesStatus = e.target.value;
        AppState.salesPage = 1;
        renderSalesTable();
    });

    // 3. 페이징 버튼 이벤트
    document.getElementById("btnPrevPurchasePage").addEventListener("click", () => {
        if (AppState.purchasePage > 1) {
            AppState.purchasePage--;
            renderPurchaseTable();
        }
    });

    document.getElementById("btnNextPurchasePage").addEventListener("click", () => {
        AppState.purchasePage++;
        renderPurchaseTable();
    });

    document.getElementById("btnPrevSalesPage").addEventListener("click", () => {
        if (AppState.salesPage > 1) {
            AppState.salesPage--;
            renderSalesTable();
        }
    });

    document.getElementById("btnNextSalesPage").addEventListener("click", () => {
        AppState.salesPage++;
        renderSalesTable();
    });

    // 4. 모달 여닫기 및 전송
    document.getElementById("btnOpenAddPurchase").addEventListener("click", openAddPurchaseModal);
    document.getElementById("btnOpenAddSales").addEventListener("click", openAddSalesModal);
    document.getElementById("btnClosePurchaseModal").addEventListener("click", closeModals);
    document.getElementById("btnCloseSalesModal").addEventListener("click", closeModals);
    
    document.getElementById("purchaseForm").addEventListener("submit", handlePurchaseSubmit);
    document.getElementById("salesForm").addEventListener("submit", handleSalesSubmit);

    // 5. 구글 시트 연동 버튼들
    document.getElementById("btnSaveSheetsUrl").addEventListener("click", saveSheetsUrlSetting);
    document.getElementById("btnImportSheets").addEventListener("click", importFromGoogleSheets);
    document.getElementById("btnExportSheets").addEventListener("click", exportToGoogleSheets);

    // 6. 모달 바깥 백드롭 클릭 시 닫기
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            closeModals();
        }
    });

    // 7. 실시간 자동 계산 셋업
    setupAutocalculate();

    // 8. 코 복사 기능 바인딩
    const copyBtn = document.getElementById("btnCopyScriptCode");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const codeEl = document.getElementById("appsScriptCode");
            navigator.clipboard.writeText(codeEl.textContent)
                .then(() => showToast("Apps Script 코드가 클립보드에 복사되었습니다.", "success"))
                .catch(() => showToast("코드 복사에 실패했습니다. 직접 드래그 복사해 주세요.", "error"));
        });
    }
}

// 앱 실행 진입점
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initTabs();
    loadData();
    setupEventListeners();
    refreshAllUI();
});

// 전역 유틸리티/핸들러 윈도우 노출 (인라인 버튼 이벤트 연결 목적)
window.openEditPurchaseModal = openEditPurchaseModal;
window.deletePurchaseRecord = deletePurchaseRecord;
window.openEditSalesModal = openEditSalesModal;
window.deleteSalesRecord = deleteSalesRecord;
