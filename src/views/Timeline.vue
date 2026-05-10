<template>
  <div class="timeline">
    <h2>时间线</h2>

    <div v-for="year in yearTree" :key="year.year" class="tl-year">
      <!-- 年份节点 -->
      <div class="tl-year-node" @click="toggleYear(year.year)">
        <div class="tl-dot tl-dot-year" :class="{ collapsed: !year.open }"></div>
        <span class="tl-year-label">{{ year.year }} 年</span>
        <span class="tl-arrow">{{ year.open ? '▾' : '▸' }}</span>
      </div>

      <!-- 该年的月份列表 -->
      <div v-show="year.open" class="tl-months">
        <div
          v-for="month in year.months"
          :key="month.m"
          class="tl-month"
        >
          <!-- 月份节点 -->
          <div class="tl-month-node" @click="toggleMonth(year.year, month.m)">
            <div class="tl-dot tl-dot-month" :class="{ collapsed: !month.open }"></div>
            <span class="tl-month-label">{{ month.m }} 月</span>
            <span class="tl-arrow">{{ month.open ? '▾' : '▸' }}</span>
          </div>

          <!-- 该月的记录列表 -->
          <div v-show="month.open" class="tl-records">
            <div
              v-for="r in month.records"
              :key="r.id"
              class="tl-record"
              @click="$router.push('/record/' + r.id)"
            >
              <div class="tl-dot tl-dot-record"></div>
              <div class="tl-record-card">
                <span class="tl-record-day">{{ r.day }} 日</span>
                <span class="tl-record-title">{{ r.title }}</span>
                <span v-if="r.location" class="tl-record-location">{{ r.location }}</span>
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
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 0;
}

h2 {
  margin-bottom: 32px;
  font-size: 22px;
  color: #333;
}

/* ---- 整条竖线（通过递归容器实现） ---- */
.tl-year,
.tl-months,
.tl-month {
  position: relative;
}

/* 左侧竖线 */
.tl-year::before,
.tl-month > .tl-month-node::before,
.tl-month > .tl-months::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e0e0e0;
}

.tl-year:last-child::before,
.tl-month:last-child > .tl-month-node::before,
.tl-month:last-child > .tl-months::before {
  display: none;
}

/* ---- 节点行 ---- */
.tl-year-node,
.tl-month-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0 10px 0;
  cursor: pointer;
  user-select: none;
  position: relative;
  z-index: 1;
}

.tl-year-node:hover,
.tl-month-node:hover {
  background: #f9f9f9;
  border-radius: 8px;
}

/* ---- 圆点 ---- */
.tl-dot {
  flex-shrink: 0;
  border-radius: 50%;
  background: #fff;
  border: 2px solid;
  z-index: 2;
  transition: all 0.2s;
}

.tl-dot-year {
  width: 28px;
  height: 28px;
  border-color: #42b983;
  background: #42b983;
  position: relative;
}

.tl-dot-year.collapsed {
  background: #fff;
}

.tl-dot-month {
  width: 16px;
  height: 16px;
  border-color: #7ec9a6;
  background: #7ec9a6;
  margin-left: 6px;
}

.tl-dot-month.collapsed {
  background: #fff;
}

.tl-dot-record {
  width: 10px;
  height: 10px;
  border-color: #ccc;
  background: #ddd;
  margin-left: 9px;
  flex-shrink: 0;
}

.tl-record:hover .tl-dot-record {
  background: #42b983;
  border-color: #42b983;
}

/* ---- 标签文字 ---- */
.tl-year-label {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.tl-month-label {
  font-size: 16px;
  font-weight: 500;
  color: #555;
}

.tl-arrow {
  font-size: 12px;
  color: #999;
  transition: transform 0.2s;
}

/* ---- 月份列表 ---- */
.tl-months {
  padding-left: 0;
  position: relative;
}

.tl-month {
  padding-left: 0;
}

/* ---- 记录行 ---- */
.tl-records {
  padding-left: 40px;
  position: relative;
}

.tl-record {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  position: relative;
}

.tl-record:hover {
  background: #f0f9f4;
}

.tl-record-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.tl-record-day {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.tl-record-title {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.tl-record-location {
  font-size: 12px;
  color: #aaa;
}

.tl-empty {
  padding: 12px 0 12px 52px;
  color: #ccc;
  font-size: 14px;
}
</style>
