<template>
  <div class="timeline-page">
    <!-- 头部 -->
    <div class="tl-header">
      <div class="tl-header-left">
        <h2>时间线</h2>
        <span class="tl-subtitle">回顾每一天</span>
      </div>
      <button class="btn-write" @click="$router.push('/record/new')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        写记录
      </button>
    </div>

    <!-- 水平日期轴 -->
    <div class="tl-axis-wrapper" v-if="dateGroups.length > 0">
      <div class="tl-axis" ref="axisRef">
        <div v-for="group in dateGroups" :key="group.label" class="tl-axis-group">
          <div class="tl-axis-label">{{ group.label }}</div>
          <div class="tl-axis-days">
            <button
              v-for="d in group.days"
              :key="d.key"
              class="tl-day-btn"
              :class="{ active: selectedDate === d.key }"
              @click="selectDate(d.key)"
            >{{ d.day }}</button>
          </div>
        </div>
      </div>
    </div>

    <template v-if="currentRecords.length > 0">
      <!-- 当天日期标题 -->
      <div class="tl-date-heading">
        <span class="tl-date-label">{{ displayDate }}</span>
        <span class="tl-date-weekday">{{ weekday }}</span>
        <span class="tl-date-count">{{ currentRecords.length }} 篇</span>
      </div>

      <!-- 当天记录内容 -->
      <div class="tl-content">
        <div v-for="r in currentRecords" :key="r.id" class="tl-entry">
          <div class="tl-entry-header" @click="$router.push('/record/' + r.id)">
            <h3>{{ r.title }}</h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tl-entry-arrow"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div class="tl-entry-meta" v-if="r.location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>{{ r.location }}</span>
          </div>
          <div class="tl-entry-body" v-html="renderContent(r.content)"></div>
        </div>
      </div>
    </template>

    <template v-else-if="selectedDate">
      <div class="tl-empty">
        <p>这一天还没有记录</p>
      </div>
    </template>

    <template v-else>
      <div class="tl-empty">
        <div class="tl-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"/></svg>
        </div>
        <p>暂无记录，去写一篇吧！</p>
        <button @click="$router.push('/record/new')" class="btn-write btn-write-empty">写记录</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRecords } from '../stores/records'
import { marked, Renderer } from 'marked'

const { recordsMap } = useRecords()
const axisRef = ref(null)

// ---- Markdown 渲染（支持 =WIDTH 图片尺寸） ----
const renderer = new Renderer()
renderer.image = ({ href, title, text }) => {
  const match = href.match(/^(.*?)\s*=(\d+%?)$/)
  if (match) {
    href = match[1]
    const width = match[2]
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}" alt="${text}"${titleAttr} style="max-width:${width}">`
  }
  const titleAttr = title ? ` title="${title}"` : ''
  return `<img src="${href}" alt="${text}"${titleAttr} style="max-width:100%">`
}
marked.use({ renderer })

function renderContent(content) {
  if (!content) return '<p style="text-align:center;padding:40px 0;color:var(--text-muted)">暂无内容</p>'
  return marked(content)
}

// ---- 按完整日期整理所有记录 ----
const datesMap = computed(() => {
  const map = {}
  for (const [key, records] of Object.entries(recordsMap)) {
    const [y, m] = key.split('-').map(Number)
    if (!records || records.length === 0) continue
    for (const r of records) {
      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(r)
    }
  }
  // 日期升序（左旧右新）
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
})

const selectedDate = ref('')

watch(datesMap, (val) => {
  if (val.length > 0) {
    if (!selectedDate.value || !val.some(([key]) => key === selectedDate.value)) {
      selectedDate.value = val[val.length - 1][0] // 默认选最新日期
    }
  } else {
    selectedDate.value = ''
  }
}, { immediate: true })

// ---- 按月份分组（横轴用） ----
const dateGroups = computed(() => {
  const groups = []
  let currentLabel = ''
  let currentGroup = null

  for (const [dateKey] of datesMap.value) {
    const [y, m] = dateKey.split('-').map(Number)
    const label = `${y}年${m}月`
    if (label !== currentLabel) {
      currentLabel = label
      currentGroup = { label, days: [] }
      groups.push(currentGroup)
    }
    currentGroup.days.push({ key: dateKey, day: parseInt(dateKey.split('-')[2]) })
  }
  return groups
})

// ---- 选中日期的记录 ----
const currentRecords = computed(() => {
  const entry = datesMap.value.find(([key]) => key === selectedDate.value)
  if (!entry) return []
  return entry[1].sort((a, b) => b.id - a.id)
})

// ---- 日期格式化 ----
const displayDate = computed(() => {
  if (!selectedDate.value) return ''
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return `${y}年${m}月${d}日`
})

const weekday = computed(() => {
  if (!selectedDate.value) return ''
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[new Date(selectedDate.value).getDay()]
})

// ---- 选择日期 -- 自动滚动到可视区域 ----
function selectDate(key) {
  selectedDate.value = key
  nextTick(() => {
    if (!axisRef.value) return
    const btn = axisRef.value.querySelector('.tl-day-btn.active')
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  })
}
</script>

<style scoped>
.timeline-page {
  max-width: 720px;
  margin: 0 auto;
}

/* ========== 头部 ========== */
.tl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.tl-header-left h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px;
}

.tl-subtitle {
  font-size: 14px;
  color: var(--text-muted);
}

.btn-write {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.btn-write:hover {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(66,185,131,0.35);
  transform: translateY(-1px);
}

/* ========== 水平日期轴 ========== */
.tl-axis-wrapper {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
  margin-bottom: 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tl-axis {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
}
.tl-axis::-webkit-scrollbar { display: none; }

.tl-axis-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.tl-axis-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  margin-right: 4px;
  min-width: fit-content;
}

.tl-axis-days {
  display: flex;
  gap: 4px;
}

.tl-day-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tl-day-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-bg);
}
.tl-day-btn.active {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(66,185,131,0.3);
}

/* ========== 日期标题 ========== */
.tl-date-heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.tl-date-label {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.tl-date-weekday {
  font-size: 13px;
  color: var(--text-muted);
}

.tl-date-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
}

/* ========== 记录卡片 ========== */
.tl-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.tl-entry {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow var(--transition);
}
.tl-entry:hover {
  box-shadow: var(--shadow-md);
}

/* 标题行（可点击跳转详情） */
.tl-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 0;
  cursor: pointer;
  transition: all var(--transition);
}
.tl-entry-header:hover h3 {
  color: var(--primary);
}
.tl-entry-header:hover .tl-entry-arrow {
  stroke: var(--primary);
  transform: translateX(3px);
}

.tl-entry-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  transition: color var(--transition);
}

.tl-entry-arrow {
  flex-shrink: 0;
  transition: all var(--transition);
  stroke: #ccc;
}

/* 元信息 */
.tl-entry-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 24px 0;
  font-size: 12px;
  color: var(--text-muted);
}
.tl-entry-meta svg {
  stroke: #ccc;
  flex-shrink: 0;
}

/* 正文 */
.tl-entry-body {
  padding: 14px 24px 20px;
  line-height: 1.8;
  font-size: 14px;
  color: var(--text-secondary);
  overflow-x: hidden;
}

.tl-entry-body :deep(h1),
.tl-entry-body :deep(h2),
.tl-entry-body :deep(h3),
.tl-entry-body :deep(h4) {
  margin: 18px 0 8px;
  color: var(--text);
  font-weight: 600;
}
.tl-entry-body :deep(h1) { font-size: 22px; }
.tl-entry-body :deep(h2) { font-size: 18px; }
.tl-entry-body :deep(h3) { font-size: 16px; }
.tl-entry-body :deep(p) { margin: 10px 0; }
.tl-entry-body :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 12px 0;
  box-shadow: var(--shadow-sm);
}
.tl-entry-body :deep(blockquote) {
  border-left: 4px solid var(--primary);
  padding: 6px 14px;
  margin: 12px 0;
  color: var(--text-secondary);
  background: var(--primary-bg);
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 13px;
}
.tl-entry-body :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
}
.tl-entry-body :deep(pre) {
  background: #f5f5f5;
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin: 12px 0;
}
.tl-entry-body :deep(pre code) { background: none; padding: 0; }
.tl-entry-body :deep(ul),
.tl-entry-body :deep(ol) { padding-left: 20px; margin: 6px 0; }
.tl-entry-body :deep(li) { margin: 3px 0; }

/* ========== 空状态 ========== */
.tl-empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text-muted);
}
.tl-empty-icon {
  margin-bottom: 16px;
}
.tl-empty p {
  font-size: 15px;
  margin: 0 0 20px;
}
.btn-write-empty {
  display: inline-flex;
}
</style>
