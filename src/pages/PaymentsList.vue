<template>
  <div class="layout-container">
    <!-- 1. 날짜 탐색 영역 -->
    <div class="date-nav">
      <span>&lt;</span>
      <h3>2025년 7월</h3>
      <span>&gt;</span>
    </div>

    <!-- 2. 요약 카드 -->
    <div class="summary-card">
      <div class="summary-text">
        <p>7월 총 결제</p>
        <h2>130,550원</h2>
      </div>
      <div class="summary-benefit">
        <p>받은 혜택</p>
        <h2>9,220원</h2>
      </div>
    </div>

    <!-- 3. 결제 리스트 -->
    <div class="history-group">
      <h4>7월 20일 (일)</h4>
      <div class="history-item">
        <div class="item-icon">☕</div>
        <div class="item-info">
          <p class="name">오늘의 커피 로스터스</p>
          <p class="desc">09:12 · 모두 톡톡 카드</p>
        </div>
        <div class="item-price">
          <p class="price">-12,500원</p>
          <p class="benefit">할인 1,250원</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.date-nav { 
  display: flex; 
  justify-content: space-between; 
  padding: 20px 0; 
  font-weight: var(--font-weight-medium);
  color: var(--foreground);
}

.summary-card { 
  background: var(--primary); /* 테마 강조 색상 적용 */
  color: var(--primary-foreground); 
  padding: 25px; 
  border-radius: var(--radius-lg); /* 테마 둥글기 적용 */
  display: flex; 
  justify-content: space-between;
  margin-bottom: 30px;
}

.history-group h4 { 
  color: var(--muted-foreground); /* 보조 텍스트 색상 */
  font-size: 0.9rem; 
  margin-bottom: 15px; 
}

.history-item { 
  display: flex; 
  align-items: center; 
  padding: 15px 0; 
  border-bottom: 1px solid var(--border); /* 테마 테두리 색상 */
}

.item-icon { font-size: 1.5rem; margin-right: 15px; }

.item-info { flex: 1; }

.name { 
  font-weight: var(--font-weight-medium); 
  margin-bottom: 4px; 
  color: var(--foreground);
}

.desc { 
  font-size: 0.85rem; 
  color: var(--muted-foreground); 
}

.item-price { text-align: right; }

.price { 
  font-weight: var(--font-weight-medium); 
  color: var(--foreground);
}

.benefit { 
  font-size: 0.85rem; 
  color: var(--primary); /* 혜택 강조 색상을 테마의 primary로 통일 */
}
</style>