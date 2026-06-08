<template>
  <div class="timeline-page">
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

    <div v-if="hasRecords" class="tl-timeline">
      <div class="tl-scroll-wrap">
        <div class="tl-scroll" ref="tlScrollRef" @mousedown="onTlMouseDown" @mousemove="onTlMouseMove" @mouseleave="onTlMouseLeave">
          <div class="tl-nodes" :style="{ width: tl.totalWidth + 'px' }">
            <!-- 年份标记 -->
            <div
              v-for="(node, ni) in tl.years"
              :key="'y'+ni"
              class="tl-year-marker"
              :style="{ left: node.left + 'px' }"
            >
              <span class="tl-year-label">{{ node.year }}年</span>
              <span class="tl-year-count">{{ node.total }}篇</span>
            </div>

            <!-- 月份标记 -->
            <div
              v-for="(node, ni) in tl.months"
              :key="'m'+ni"
              class="tl-month-marker"
              :style="{ left: node.left + 'px' }"
            >
              <span class="tl-month-label">{{ node.month }}月</span>
            </div>

            <!-- 横线 -->
            <div class="tl-line"></div>

            <!-- 日期圆点 -->
            <div
              v-for="(node, ni) in tl.dates"
              :key="'d'+ni"
              class="tl-date-item"
              :class="{ active: selectedDate === node.dateKey }"
              :style="{ left: node.left + 'px' }"
              @click="onDateClick(node.dateKey)"
            >
              <div class="tl-date-dot">
                <span class="tl-dot-day">{{ node.day }}</span>
              </div>
              <div class="tl-date-info">
                <span>{{ node.day }}日</span>
                <span class="tl-date-badge">{{ node.records.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tl-content-section" v-if="currentRecords.length > 0">
        <div class="tl-content-heading">
          <span class="tl-content-date">{{ displayDate }}</span>
          <span class="tl-content-weekday">{{ weekday }}</span>
          <span class="tl-content-count">{{ currentRecords.length }} 篇</span>
        </div>
        <div class="tl-content-cards">
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
            <div v-if="r.images && r.images.length > 0" class="tl-entry-images">
              <div v-for="(img, idx) in r.images.slice(0, 6)" :key="idx" class="tl-entry-img-wrap" @click.stop="$router.push('/record/' + r.id)">
                <img :src="img" class="tl-entry-img" />
              </div>
              <div v-if="r.images.length > 6" class="tl-entry-img-more">+{{ r.images.length - 6 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="tl-empty">
        <div class="tl-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"/></svg>
        </div>
        <p>暂无记录，写一篇吧！</p>
        <button @click="$router.push('/record/new')" class="btn-write btn-write-empty">写记录</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRecords } from '../stores/records'
import { marked, Renderer } from 'marked'

const { recordsMap } = useRecords()

const renderer = new Renderer()
renderer.image = ({ href, title, text }) => {
  const match = href.match(/^(.*?)\s*=(\d+%?)$/)
  if (match) { href = match[1]; const w = match[2]; const t = title ? ` title="${title}"` : ''; return `<img src="${href}" alt="${text}"${t} style="max-width:${w}">` }
  const t = title ? ` title="${title}"` : ''; return `<img src="${href}" alt="${text}"${t} style="max-width:100%">`
}
marked.use({ renderer })
function renderContent(c) { return c ? marked(c) : '' }

const datesMap = computed(() => {
  const map = {}
  for (const [key, records] of Object.entries(recordsMap)) {
    const [y, m] = key.split('-').map(Number)
    if (!records || records.length === 0) continue
    for (const r of records) {
      const dk = `${y}-${String(m).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`
      if (!map[dk]) map[dk] = []
      map[dk].push(r)
    }
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
})

const timelineTree = computed(() => {
  const ym = {}
  for (const [dk, records] of datesMap.value) {
    const [y, m, d] = dk.split('-').map(Number)
    if (!ym[y]) ym[y] = {}
    if (!ym[y][m]) ym[y][m] = []
    ym[y][m].push({ day: d, dateKey: dk, records: records.sort((a, b) => a.id - b.id) })
  }
  return Object.entries(ym).sort(([a], [b]) => a - b).map(([year, months]) => ({
    year: Number(year),
    total: Object.values(months).reduce((s, ds) => s + ds.reduce((s2, d) => s2 + d.records.length, 0), 0),
    months: Object.entries(months).sort(([a], [b]) => a - b).map(([month, dates]) => ({
      month: Number(month),
      dates: dates.sort((a, b) => a.day - b.day),
    })),
  }))
})

const DISPLAY_COUNT = 10 // 最多显示 10 个时间点

const selectedDate = ref('')
const tlScrollRef = ref(null)
const isDragging = ref(false)
const containerWidth = ref(800)
const windowStartIdx = ref(0)

const hasRecords = computed(() => {
  for (const list of Object.values(recordsMap)) {
    if (list && list.length > 0) return true
  }
  return false
})

// 平铺所有日期节点（按时间排序）
const sortedDates = computed(() => {
  const nodes = []
  for (const year of timelineTree.value) {
    for (const month of year.months) {
      for (const date of month.dates) {
        nodes.push(date)
      }
    }
  }
  return nodes.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
})

const tl = computed(() => {
  const all = sortedDates.value
  if (all.length === 0) return { years: [], months: [], dates: [], totalWidth: containerWidth.value }

  const cw = containerWidth.value

  const end = Math.min(windowStartIdx.value + DISPLAY_COUNT, all.length)
  const visible = all.slice(windowStartIdx.value, end)

  // 等间距排列
  const spacing = visible.length > 1 ? cw / (visible.length - 1) : cw / 2
  const dateNodes = visible.map((node, i) => ({
    ...node,
    left: Math.round(i * spacing)
  }))

  // 年份标记：只在窗口内的第一个日期出现
  const yearNodes = []
  let lastYear = null
  for (const d of dateNodes) {
    const y = d.dateKey.split('-')[0]
    if (y !== lastYear) {
      lastYear = y
      const yearData = timelineTree.value.find(yr => yr.year === Number(y))
      yearNodes.push({ year: Number(y), total: yearData ? yearData.total : 0, left: Math.max(d.left - 20, 4) })
    }
  }

  // 月份标记
  const monthNodes = []
  let lastMonthKey = null
  for (const d of dateNodes) {
    const mk = d.dateKey.slice(0, 7)
    if (mk !== lastMonthKey) {
      lastMonthKey = mk
      monthNodes.push({ month: Number(mk.split('-')[1]), left: Math.max(d.left - 10, 4) })
    }
  }

  return { years: yearNodes, months: monthNodes, dates: dateNodes, totalWidth: cw }
})

let dragStartX = 0
let dragStartIdx = 0
let wasDragged = false

function onTlMouseDown(e) {
  if (!tlScrollRef.value) return
  isDragging.value = true
  wasDragged = false
  dragStartX = e.clientX
  dragStartIdx = windowStartIdx.value
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  e.preventDefault()
}

function onDragMove(e) {
  if (!isDragging.value) {
    window.removeEventListener('mousemove', onDragMove)
    return
  }
  const dx = e.clientX - dragStartX
  const itemWidth = containerWidth.value / DISPLAY_COUNT
  const idxDelta = Math.round(dx / itemWidth)
  const maxStart = Math.max(0, sortedDates.value.length - DISPLAY_COUNT)
  windowStartIdx.value = Math.max(0, Math.min(dragStartIdx + idxDelta, maxStart))
  if (Math.abs(dx) > 5) wasDragged = true
}

function onDragEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

function onTlMouseLeave() {
  // 仅还原 Dock 效果，不停止拖拽（拖拽由 window 监听器处理）
  if (dockRaf) { cancelAnimationFrame(dockRaf); dockRaf = null }
  if (!tlScrollRef.value) return
  for (const dot of tlScrollRef.value.querySelectorAll('.tl-date-dot')) {
    dot.style.transform = 'scale(1)'; dot.style.zIndex = '1'
  }
}

function onDateClick(key) {
  if (wasDragged) { wasDragged = false; return }
  selectedDate.value = key
}

let dockRaf = null
function onTlMouseMove(e) {
  if (isDragging.value) return
  // Dock 悬停放大效果
  if (dockRaf) return
  dockRaf = requestAnimationFrame(() => {
    dockRaf = null
    const mx = e.clientX
    for (const dot of e.currentTarget.querySelectorAll('.tl-date-dot')) {
      const r = dot.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const d = Math.abs(mx - cx)
      if (d < 100) {
        const f = Math.cos((d / 100) * (Math.PI / 2))
        const s = 1 + f * 0.65
        dot.style.transform = `scale(${s})`
        dot.style.zIndex = Math.round(s * 10)
      } else { dot.style.transform = 'scale(1)'; dot.style.zIndex = '1' }
    }
  })
}

function updateWidth() {
  if (tlScrollRef.value) {
    containerWidth.value = tlScrollRef.value.offsetWidth
  }
}

onMounted(() => {
  updateWidth()
  window.addEventListener('resize', updateWidth)
})

// 异步数据加载完成后定位到最新记录
watch(sortedDates, (sorted) => {
  if (sorted.length > 0) {
    selectedDate.value = sorted[sorted.length - 1].dateKey
    if (windowStartIdx.value === 0 && sorted.length > DISPLAY_COUNT) {
      windowStartIdx.value = Math.max(0, sorted.length - DISPLAY_COUNT)
    }
  }
})

onBeforeUnmount(() => {
  if (dockRaf) cancelAnimationFrame(dockRaf)
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('resize', updateWidth)
})

const currentRecords = computed(() => {
  const e = datesMap.value.find(([k]) => k === selectedDate.value)
  return e ? e[1] : []
})

const displayDate = computed(() => {
  if (!selectedDate.value) return ''
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return `${y}年${m}月${d}日`
})
const weekday = computed(() => {
  if (!selectedDate.value) return ''
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date(selectedDate.value).getDay()]
})

</script>

<style scoped>
.timeline-page { max-width: 860px; margin: 0 auto; }

.tl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.tl-header-left h2 { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 2px; }
.tl-subtitle { font-size: 14px; color: var(--text-muted); }
.btn-write {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius);
  font-size: 14px; font-weight: 500; cursor: pointer; transition: all var(--transition); white-space: nowrap;
}
.btn-write:hover { background: var(--primary-dark); box-shadow: 0 4px 12px rgba(66,185,131,0.35); transform: translateY(-1px); }

.tl-timeline { position: relative; background: var(--card); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; animation: tlIn 0.5s ease; }
@keyframes tlIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ---- 滚动容器 ---- */
.tl-scroll-wrap { position: relative; }
.tl-scroll {
  position: relative;
  padding: 0;
  min-height: 120px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

/* ---- 节点容器 ---- */
.tl-nodes {
  position: relative;
  height: 120px;
}

/* ---- 年份标记（顶部） ---- */
.tl-year-marker {
  position: absolute;
  top: 6px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
  z-index: 3;
  pointer-events: none;
}
.tl-year-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 1px;
}
.tl-year-count {
  font-size: 10px;
  color: var(--text-muted);
  background: #f0f0f0;
  padding: 0 6px;
  border-radius: 8px;
  line-height: 17px;
}

/* ---- 月份标记（中部） ---- */
.tl-month-marker {
  position: absolute;
  top: 32px;
  white-space: nowrap;
  z-index: 3;
  pointer-events: none;
}
.tl-month-label {
  font-size: 12px;
  font-weight: 500;
  color: #999;
  letter-spacing: 0.5px;
}

/* ---- 横线 ---- */
.tl-line {
  position: absolute;
  left: 0; right: 0;
  top: 68px;
  height: 2px;
  background: var(--primary); opacity: 0.4;
  border-radius: 2px;
  pointer-events: none;
  z-index: 1;
}

/* ---- 日期圆点 ---- */
.tl-date-item {
  position: absolute;
  top: 48px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 2;
}
.tl-date-item.active .tl-date-dot {
  background: var(--primary);
  box-shadow: 0 0 0 4px rgba(66,185,131,0.2), 0 2px 12px rgba(66,185,131,0.35);
}
.tl-date-item.active .tl-date-info { opacity: 1; color: var(--primary); font-weight: 600; }

.tl-date-dot {
  width: 36px; height: 36px; border-radius: 50%; background: #e8e8e8;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s ease-out, background 0.25s, box-shadow 0.25s;
  will-change: transform; cursor: pointer;
}
.tl-date-dot:hover { background: #ddd; }

.tl-dot-day { font-size: 12px; font-weight: 600; color: var(--text-secondary); pointer-events: none; }
.tl-date-item.active .tl-dot-day { color: #fff; }

.tl-date-info {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.tl-date-item:hover .tl-date-info { opacity: 1; }
.tl-date-badge { background: #f0f0f0; padding: 0 5px; border-radius: 6px; font-size: 10px; line-height: 16px; }
.tl-date-item.active .tl-date-badge { background: rgba(66,185,131,0.15); }

/* ========== 内容区域 ========== */
.tl-content-section { border-top: 1px solid var(--border); padding: 20px 28px 24px; animation: slideIn 0.35s ease; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

.tl-content-heading { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.tl-content-date { font-size: 17px; font-weight: 600; color: var(--text); }
.tl-content-weekday { font-size: 13px; color: var(--text-muted); }
.tl-content-count { font-size: 12px; color: var(--text-muted); margin-left: auto; }

.tl-content-cards { display: flex; flex-direction: column; gap: 14px; }

.tl-entry { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; transition: box-shadow var(--transition); }
.tl-entry:hover { box-shadow: var(--shadow-md); }
.tl-entry-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 0; cursor: pointer; }
.tl-entry-header:hover h3 { color: var(--primary); }
.tl-entry-header:hover .tl-entry-arrow { stroke: var(--primary); transform: translateX(3px); }
.tl-entry-header h3 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
.tl-entry-arrow { flex-shrink: 0; transition: all var(--transition); stroke: #ccc; }
.tl-entry-meta { display: flex; align-items: center; gap: 4px; padding: 4px 20px 0; font-size: 12px; color: var(--text-muted); }
.tl-entry-meta svg { stroke: #ccc; flex-shrink: 0; }
.tl-entry-body { padding: 10px 20px 14px; line-height: 1.7; font-size: 14px; color: var(--text-secondary); overflow-x: hidden; }
.tl-entry-body :deep(h1), .tl-entry-body :deep(h2), .tl-entry-body :deep(h3), .tl-entry-body :deep(h4) { margin: 14px 0 6px; color: var(--text); font-weight: 600; }
.tl-entry-body :deep(h1) { font-size: 20px; } .tl-entry-body :deep(h2) { font-size: 17px; } .tl-entry-body :deep(h3) { font-size: 15px; }
.tl-entry-body :deep(p) { margin: 8px 0; }
.tl-entry-body :deep(img) { max-width: 100%; border-radius: var(--radius); margin: 8px 0; box-shadow: var(--shadow-sm); }
.tl-entry-body :deep(blockquote) { border-left: 4px solid var(--primary); padding: 4px 12px; margin: 8px 0; color: var(--text-secondary); background: var(--primary-bg); border-radius: 0 var(--radius) var(--radius) 0; font-size: 13px; }
.tl-entry-body :deep(code) { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.tl-entry-body :deep(pre) { background: #f5f5f5; padding: 14px; border-radius: var(--radius); overflow-x: auto; margin: 8px 0; }
.tl-entry-body :deep(pre code) { background: none; padding: 0; }
.tl-entry-body :deep(ul), .tl-entry-body :deep(ol) { padding-left: 20px; margin: 6px 0; }
.tl-entry-body :deep(li) { margin: 3px 0; }

.tl-entry-images { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 20px 14px; }
.tl-entry-img-wrap { width: 80px; height: 80px; border-radius: 6px; overflow: hidden; cursor: pointer; background: #f5f5f5; flex-shrink: 0; transition: transform 0.15s; }
.tl-entry-img-wrap:hover { transform: scale(1.05); }
.tl-entry-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tl-entry-img-more { width: 80px; height: 80px; border-radius: 6px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: var(--text-muted); flex-shrink: 0; }

.tl-empty { text-align: center; padding: 80px 0; color: var(--text-muted); }
.tl-empty-icon { margin-bottom: 16px; }
.tl-empty p { margin: 0 0 20px; }
.btn-write-empty { display: inline-flex; }

</style>
