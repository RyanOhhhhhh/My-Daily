<template>
  <div class="timeline">
    <div class="tl-header">
      <h2>时间线</h2>
      <span class="tl-subtitle">回顾每一天</span>
    </div>

    <div v-for="year in yearTree" :key="year.year" class="tl-year">
      <!-- 年份节点 -->
      <div class="tl-year-node" @click="toggleYear(year.year)">
        <div class="tl-dot tl-dot-year" :class="{ collapsed: !year.open }">
          <div class="tl-dot-inner"></div>
        </div>
        <span class="tl-year-label">{{ year.year }} 年</span>
        <span class="tl-count">{{ year.months.length }} 个月</span>
        <span class="tl-arrow" :class="{ open: year.open }">▾</span>
      </div>

      <!-- 该年的月份列表 -->
      <div v-show="year.open" class="tl-months">
        <div v-for="month in year.months" :key="month.m" class="tl-month">
          <!-- 月份节点 -->
          <div class="tl-month-node" @click="toggleMonth(year.year, month.m)">
            <div class="tl-dot tl-dot-month" :class="{ collapsed: !month.open }"></div>
            <span class="tl-month-label">{{ month.m }} 月</span>
            <span class="tl-count">{{ month.records.length }} 篇</span>
            <span class="tl-arrow" :class="{ open: month.open }">▾</span>
          </div>

          <!-- 该月的记录列表 -->
          <div v-show="month.open" class="tl-records">
            <div
              v-for="r in month.records"
              :key="r.id"
              class="tl-record"
              @click="$router.push('/record/' + r.id)"
            >
              <div class="tl-record-dot"></div>
              <div class="tl-record-card">
                <div class="tl-record-top">
                  <span class="tl-record-day">{{ r.day }} 日</span>
                  <span v-if="r.location" class="tl-record-location">{{ r.location }}</span>
                </div>
                <span class="tl-record-title">{{ r.title }}</span>
              </div>
            </div>
            <div v-if="month.records.length === 0" class="tl-empty">
              暂无记录
            </div>
          </div>
        </div>

        <div v-if="year.months.length === 0" class="tl-empty">
          暂无记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRecords } from '../stores/records'

const { yearTree, toggleYear, toggleMonth } = useRecords()
</script>

<style scoped>
.timeline {
  max-width: 680px;
  margin: 0 auto;
}

/* ---- 头部 ---- */
.tl-header {
  margin-bottom: 32px;
}
.tl-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}
.tl-subtitle {
  font-size: 14px;
  color: var(--text-muted);
}

/* ---- 左侧竖线 ---- */
.tl-year,
.tl-month {
  position: relative;
}
.tl-year::before,
.tl-month::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: #e8e8e8;
}
.tl-year:last-child::before,
.tl-month:last-child::before {
  display: none;
}

/* ---- 年份节点 ---- */
.tl-year-node {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0 12px 0;
  cursor: pointer;
  user-select: none;
  position: relative;
  z-index: 1;
}
.tl-year-node:hover {
  background: var(--primary-bg);
  border-radius: 10px;
  margin: 0 -12px;
  padding: 12px 12px;
}

.tl-year-label {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.tl-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
}

.tl-arrow {
  font-size: 12px;
  color: #bbb;
  transition: transform 0.25s ease;
  margin-left: 4px;
}
.tl-arrow.open {
  transform: rotate(180deg);
}

/* ---- 月份节点 ---- */
.tl-months {
  padding-left: 0;
  position: relative;
}
.tl-month {
  padding-left: 0;
}
.tl-month-node {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0 10px 0;
  cursor: pointer;
  user-select: none;
  position: relative;
  z-index: 1;
  margin-left: 0;
}
.tl-month-node:hover {
  background: var(--primary-bg);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 -12px;
}

.tl-month-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ---- 圆点 ---- */
.tl-dot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  z-index: 2;
}

.tl-dot-year {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid var(--primary);
  transition: all 0.25s ease;
}
.tl-dot-year.collapsed {
  background: transparent;
}
.tl-dot-inner {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.8;
}
.tl-dot-year.collapsed .tl-dot-inner {
  background: var(--primary);
}

.tl-dot-month {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #7ec9a6;
  border: 2px solid #7ec9a6;
  margin-left: 8px;
}
.tl-dot-month.collapsed {
  background: transparent;
}

/* ---- 记录列表 ---- */
.tl-records {
  padding-left: 44px;
  position: relative;
}

.tl-record {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: var(--radius);
  transition: all var(--transition);
  position: relative;
  margin-bottom: 4px;
}
.tl-record:hover {
  background: var(--card);
  box-shadow: var(--shadow-sm);
}

.tl-record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d0d0d0;
  flex-shrink: 0;
  margin-top: 6px;
  transition: all var(--transition);
}
.tl-record:hover .tl-record-dot {
  background: var(--primary);
  transform: scale(1.3);
}

.tl-record-card {
  flex: 1;
  min-width: 0;
}

.tl-record-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
}

.tl-record-day {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.tl-record-location {
  font-size: 11px;
  color: #bbb;
}

.tl-record-title {
  font-size: 15px;
  color: var(--text);
  font-weight: 500;
  line-height: 1.4;
}
.tl-record:hover .tl-record-title {
  color: var(--primary);
}

.tl-empty {
  padding: 12px 0 12px 24px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
