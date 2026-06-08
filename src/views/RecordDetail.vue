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
          <div class="header-actions">
            <button @click="$router.push('/record/' + route.params.id + '/edit')" class="edit-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              编辑
            </button>
            <button @click="showDeleteModal = true" class="delete-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              删除
            </button>
          </div>
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

        <!-- 新记录：纯文本 + 图片画廊 -->
        <template v-if="isNewStyle">
          <div class="content plain-text">{{ record.content }}</div>
          <div v-if="record.images && record.images.length > 0" class="image-gallery">
            <div
              v-for="(img, idx) in record.images"
              :key="idx"
              class="gallery-item"
              @click="openPreview(idx)"
            >
              <img :src="img" class="gallery-img" />
            </div>
          </div>
        </template>
        <!-- 旧记录：Markdown 渲染 -->
        <div v-else class="content" v-html="renderedContent" @click="onContentClick"></div>
      </article>
    </template>

    <div v-else class="not-found">
      <div class="not-found-card">
        <h3>未找到记录</h3>
        <p>这条记录可能已被删除</p>
        <button @click="$router.push('/timeline')" class="back-btn home-btn">回时间线</button>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div v-if="previewImg !== null" class="preview-overlay" @click="closePreview">
      <button class="preview-close" @click.stop="closePreview">✕</button>
      <button v-if="previewImg > 0" class="preview-nav preview-prev" @click.stop="prevImage">‹</button>
      <button v-if="previewImg >= 0 && previewImg < imagesForPreview.length - 1" class="preview-nav preview-next" @click.stop="nextImage">›</button>
      <img :src="previewImg === -1 ? previewSrc : imagesForPreview[previewImg]" class="preview-image" @click.stop />
      <div class="preview-counter" v-if="previewImg >= 0">{{ previewImg + 1 }} / {{ imagesForPreview.length }}</div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteModal" class="delete-overlay" @click="showDeleteModal = false">
      <div class="delete-modal" @click.stop>
        <h3>确认删除</h3>
        <p>此操作不可撤销，请输入密码确认</p>
        <input
          v-model="deletePassword"
          type="password"
          placeholder="输入登录密码"
          class="delete-password-input"
          @keyup.enter="confirmDelete"
        />
        <p v-if="deleteError" class="delete-error">{{ deleteError }}</p>
        <div class="delete-modal-actions">
          <button @click="showDeleteModal = false" class="btn-cancel-modal">取消</button>
          <button @click="confirmDelete" class="btn-delete-confirm" :disabled="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecords } from '../stores/records'
import { api } from '../api'
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
const { getRecordById, deleteRecord } = useRecords()

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

const isNewStyle = computed(() => {
  return record.value?.images && record.value.images.length > 0
})

// ---- 图片预览 ----
const previewImg = ref(null)
const previewSrc = ref('')

const imagesForPreview = computed(() => {
  if (!record.value) return []
  return record.value.images || []
})

function openPreview(idx) {
  previewImg.value = idx
}

function closePreview() {
  previewImg.value = null
  previewSrc.value = ''
}

function prevImage() {
  if (previewImg.value === -1) return
  if (previewImg.value > 0) previewImg.value--
}

function nextImage() {
  if (previewImg.value === -1) return
  if (previewImg.value < imagesForPreview.value.length - 1) previewImg.value++
}

function onPreviewKeydown(e) {
  if (previewImg.value === null) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); nextImage() }
  else if (e.key === 'Escape') { closePreview() }
}

/** 旧 Markdown 内容中的图片点击：提取 src 并预览 */
function onContentClick(e) {
  const img = e.target.closest('img')
  if (!img) return
  const src = img.getAttribute('src')
  if (!src) return
  // 临时将单张图片加入预览
  const existing = imagesForPreview.value.findIndex((s) => s === src)
  if (existing !== -1) {
    previewImg.value = existing
  } else {
    // 不在 images 数组中的图（如 Markdown 内嵌），单独预览
    previewImg.value = -1
    previewSrc.value = src
  }
}

onMounted(() => {
  document.addEventListener('keydown', onPreviewKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onPreviewKeydown)
})

const renderedContent = computed(() => {
  if (!record.value?.content) return '<p style="color:#ccc; text-align:center; padding:40px 0;">暂无内容</p>'
  return marked(record.value.content)
})

// ---- 删除 ----
const showDeleteModal = ref(false)
const deletePassword = ref('')
const deleteError = ref('')
const deleting = ref(false)

async function confirmDelete() {
  if (!deletePassword.value) { deleteError.value = '请输入密码'; return }
  deleteError.value = ''
  deleting.value = true
  try {
    await api.post('/api/auth/verify-password', { password: deletePassword.value })
    await deleteRecord(route.params.id)
    router.push('/timeline')
  } catch (e) {
    if (e.status === 403) {
      deleteError.value = '密码错误'
    } else {
      deleteError.value = '删除失败，请重试'
    }
    deleting.value = false
  }
}
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

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
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

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #fff;
  color: #e74c3c;
  border: 1.5px solid #e74c3c;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--transition);
}
.delete-btn:hover {
  background: #e74c3c;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231,76,60,0.3);
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

/* ---- 纯文本 ---- */
.plain-text {
  white-space: pre-wrap;
  line-height: 1.9;
  font-size: 15px;
  color: var(--text-secondary);
}

/* ---- 图片画廊 ---- */
.image-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 20px;
}

.gallery-item {
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1;
  background: #f5f5f5;
  transition: transform 0.2s;
}
.gallery-item:hover {
  transform: scale(1.02);
}

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

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

/* ---- 删除弹窗 ---- */
.delete-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.delete-modal {
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 360px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  animation: fadeIn 0.2s ease;
}
.delete-modal h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--text);
}
.delete-modal p {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-muted);
}
.delete-password-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition);
}
.delete-password-input:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231,76,60,0.1);
}
.delete-error {
  color: #e74c3c !important;
  font-size: 13px !important;
  margin-top: 8px !important;
}
.delete-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-cancel-modal {
  padding: 9px 18px;
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all var(--transition);
}
.btn-cancel-modal:hover {
  border-color: #ccc;
  background: #fafafa;
}
.btn-delete-confirm {
  padding: 9px 18px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition);
}
.btn-delete-confirm:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231,76,60,0.3);
}
.btn-delete-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ---- 图片预览弹窗 ---- */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  cursor: pointer;
}
.preview-image {
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
  object-fit: contain;
  cursor: default;
}
.preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.preview-close:hover { background: rgba(255,255,255,0.3); }

/* ---- 预览导航 ---- */
.preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 210;
}
.preview-nav:hover { background: rgba(255,255,255,0.3); }
.preview-prev { left: 16px; }
.preview-next { right: 16px; }
.preview-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 14px;
  background: rgba(0,0,0,0.4);
  padding: 4px 14px;
  border-radius: 20px;
  pointer-events: none;
}
</style>
