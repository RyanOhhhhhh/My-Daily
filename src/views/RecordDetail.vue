<template>
  <div class="detail-page">
    <button @click="$router.back()" class="back-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      返回
    </button>

    <div v-if="!record && !notFound" class="loading-hint">加载中...</div>

    <template v-if="record">
      <article class="detail-card">
        <div class="detail-header">
          <h1>{{ record.title }}</h1>
          <button @click="$router.push('/record/' + route.params.id + '/edit')" class="edit-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            编辑
          </button>
        </div>

        <div class="meta">
          <span class="meta-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {{ record.date }}
          </span>
          <span v-if="record.location" class="meta-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ record.location }}
          </span>
        </div>

        <div class="divider"></div>

        <div class="content" v-html="renderedContent"></div>
      </article>
    </template>

    <div v-else class="not-found">
      <div class="not-found-card">
        <h3>未找到记录</h3>
        <p>这条记录可能已被删除</p>
        <button @click="$router.push('/timeline')" class="back-btn home-btn">回时间线</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecords } from '../stores/records'
import { marked, Renderer } from 'marked'

// 自定义图片渲染：支持 =WIDTH 后缀
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

const route = useRoute()
const router = useRouter()
const { getRecordById } = useRecords()

const record = ref(null)
const notFound = ref(false)

onMounted(async () => {
  const r = await getRecordById(route.params.id)
  if (r) {
    const dateStr = r._record_date || r._created_at
    const d = dateStr ? new Date(dateStr) : new Date()
    record.value = {
      ...r,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    }
  } else {
    notFound.value = true
  }
})

const renderedContent = computed(() => {
  if (!record.value?.content) return '<p style="color:#ccc; text-align:center; padding:40px 0;">暂无内容</p>'
  return marked(record.value.content)
})
</script>

<style scoped>
.detail-page {
  max-width: 720px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all var(--transition);
  margin-bottom: 20px;
}
.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-bg);
}

/* ---- 文章卡片 ---- */
.detail-card {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 40px 44px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  line-height: 1.3;
}

.edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--transition);
}
.edit-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66,185,131,0.3);
}

/* ---- 元信息 ---- */
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.meta-date,
.meta-location {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-muted);
}

.meta-date svg,
.meta-location svg {
  stroke: #bbb;
}

.divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 24px;
}

/* ---- 正文 ---- */
.content {
  line-height: 1.9;
  font-size: 15px;
  color: var(--text-secondary);
}

.content :deep(h1),
.content :deep(h2),
.content :deep(h3),
.content :deep(h4) {
  margin: 24px 0 10px;
  color: var(--text);
  font-weight: 600;
}
.content :deep(h1) { font-size: 24px; }
.content :deep(h2) { font-size: 20px; }
.content :deep(h3) { font-size: 17px; }
.content :deep(p) { margin: 12px 0; }
.content :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 16px 0;
  box-shadow: var(--shadow-sm);
}
.content :deep(blockquote) {
  border-left: 4px solid var(--primary);
  padding: 8px 16px;
  margin: 16px 0;
  color: var(--text-secondary);
  background: var(--primary-bg);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.content :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
}
.content :deep(pre) {
  background: #f5f5f5;
  padding: 20px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin: 16px 0;
}
.content :deep(pre code) { background: none; padding: 0; }
.content :deep(table) { border-collapse: collapse; width: 100%; margin: 16px 0; }
.content :deep(th),
.content :deep(td) { border: 1px solid var(--border); padding: 10px 14px; text-align: left; }
.content :deep(th) { background: #f8f9fa; font-weight: 600; }
.content :deep(ul),
.content :deep(ol) { padding-left: 24px; margin: 8px 0; }
.content :deep(li) { margin: 4px 0; }
.content :deep(a) { color: var(--primary); }

/* ---- 404 ---- */
.not-found {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}
.not-found-card {
  text-align: center;
  background: var(--card);
  padding: 48px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.not-found-card h3 {
  font-size: 18px;
  color: var(--text);
  margin: 0 0 8px;
}
.not-found-card p {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 24px;
}
.home-btn {
  margin-bottom: 0 !important;
}

.loading-hint {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted);
  font-size: 15px;
}
</style>
