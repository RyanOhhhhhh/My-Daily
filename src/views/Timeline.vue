<template>
  <div class="timeline">
    <h2>时间线</h2>
    <div class="year-nav">
      <button v-for="y in years" :key="y" @click="currentYear = y" :class="{ active: currentYear === y }">
        {{ y }}
      </button>
    </div>
    <div v-if="currentYear" class="month-grid">
      <div
        v-for="m in 12"
        :key="m"
        class="month-card"
        @click="currentMonth = m"
        :class="{ active: currentMonth === m, hasRecord: hasRecord(currentYear, m) }"
      >
        <strong>{{ m }}月</strong>
        <span v-if="hasRecord(currentYear, m)" class="dot">●</span>
      </div>
    </div>
    <div v-if="currentMonth" class="record-list">
      <h3>{{ currentYear }}年{{ currentMonth }}月</h3>
      <div v-for="r in mockRecords" :key="r.id" class="record-item" @click="$router.push('/record/' + r.id)">
        <span class="day">{{ r.day }}日</span>
        <span class="title">{{ r.title }}</span>
      </div>
      <p v-if="mockRecords.length === 0" class="empty">暂无记录</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const years = [2025, 2026]
const currentYear = ref(2026)
const currentMonth = ref(5)

const records = {
  '2026-5': [
    { id: 1, day: 11, title: '搭建项目框架' },
  ],
}

function hasRecord(year, month) {
  const key = `${year}-${month}`
  return records[key] && records[key].length > 0
}

const mockRecords = records['2026-5'] || []
</script>

<style scoped>
.year-nav { margin-bottom: 16px; }
.year-nav button { margin-right: 8px; padding: 6px 16px; cursor: pointer; border: 1px solid #ddd; background: #fff; border-radius: 4px; }
.year-nav button.active { background: #42b983; color: #fff; border-color: #42b983; }
.month-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 20px; }
.month-card { padding: 12px; border: 1px solid #eee; border-radius: 6px; text-align: center; cursor: pointer; }
.month-card.active { background: #42b983; color: #fff; }
.month-card.hasRecord { border-color: #42b983; }
.dot { font-size: 10px; color: #42b983; display: block; margin-top: 4px; }
.record-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; }
.record-item:hover { background: #f9f9f9; }
.day { font-weight: bold; margin-right: 16px; min-width: 40px; }
.title { color: #333; }
.empty { color: #999; }
</style>
