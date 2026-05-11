<template>
  <div class="record-edit">
    <div class="blog-editor">
      <!-- 标题 -->
      <input v-model="title" placeholder="标题" class="title-input" />

      <!-- 工具栏 -->
      <div class="toolbar">
        <button @click="insertMarkdown('**', '**', '加粗文字')" title="加粗"><b>B</b></button>
        <button @click="insertMarkdown('*', '*', '斜体文字')" title="斜体"><i>I</i></button>
        <button @click="insertMarkdown('~~', '~~', '删除线')" title="删除线"><s>S</s></button>
        <span class="toolbar-divider"></span>
        <button @click="insertMarkdown('# ', '', '标题')" title="大标题">H1</button>
        <button @click="insertMarkdown('## ', '', '标题')" title="中标题">H2</button>
        <button @click="insertMarkdown('### ', '', '标题')" title="小标题">H3</button>
        <span class="toolbar-divider"></span>
        <button @click="insertMarkdown('- ', '', '列表项')" title="列表">列表</button>
        <button @click="insertMarkdown('> ', '', '引用')" title="引用">引用</button>
        <button @click="insertMarkdown('```\n', '\n```', '代码块')" title="代码块">代码</button>
        <span class="toolbar-divider"></span>
        <button @click="triggerImageUpload" title="插入图片">📷 图片</button>
        <button @click="triggerMdImport" title="导入 Markdown 文件">📂 导入</button>
      </div>

      <!-- 左右分栏：编辑 | 实时预览 -->
      <div class="split-pane">
        <div class="pane pane-edit">
          <div class="pane-header">Markdown</div>
          <textarea
            ref="contentRef"
            v-model="content"
            placeholder="开始写作..."
            class="content-input"
            @mouseup="saveCursor" @keyup="saveCursor"
          ></textarea>
        </div>
        <div class="pane pane-preview">
          <div class="pane-header">预览</div>
          <div class="preview-area"><div v-html="renderedContent"></div></div>
        </div>
      </div>

      <!-- 地点 + 底部操作栏 -->
      <div class="footer-bar">
        <div class="footer-meta">
          <div class="location-wrapper">
            <input v-model="location" placeholder="添加地点" class="location-input" />
            <button v-if="locating" class="loc-btn" disabled>定位中...</button>
            <button v-else class="loc-btn" @click="getLocation" title="获取当前位置">📍</button>
          </div>
          <input type="datetime-local" v-model="recordDate" class="date-input" />
        </div>
        <div class="footer-actions">
          <span class="word-count">{{ content.length }} 字</span>
          <div class="actions">
            <button @click="$router.back()" class="btn-cancel">取消</button>
            <button @click="saveRecord" class="btn-save">发布</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏：图片选择器 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onImageSelected"
    />

    <!-- 隐藏：Markdown 导入选择器 -->
    <input
      ref="mdFileInputRef"
      type="file"
      accept=".md,.markdown"
      style="display: none"
      @change="onMdImported"
    />

    <!-- 图片尺寸选择弹窗 -->
    <div v-if="showSizePicker" class="size-overlay" @click.self="showSizePicker = false">
      <div class="size-picker">
        <h4>选择图片尺寸</h4>
        <div class="size-options">
          <button :class="{ active: imgSize === '50%' }" @click="imgSize = '50%'">小</button>
          <button :class="{ active: imgSize === '75%' }" @click="imgSize = '75%'">中</button>
          <button :class="{ active: imgSize === '100%' }" @click="imgSize = '100%'">大</button>
        </div>
        <div class="size-preview">
          <div class="size-block" :style="{ width: imgSize }"></div>
          <span>{{ imgSize }}</span>
        </div>
        <div class="size-actions">
          <button @click="showSizePicker = false">取消</button>
          <button @click="confirmImageSize" class="btn-primary">确认插入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecords } from '../stores/records'
import { AMAP_KEY } from '../config'
import { marked, Renderer } from 'marked'

// ---- 全局配置 marked ----
marked.setOptions({ breaks: true, gfm: true })
const imgRenderer = new Renderer()
imgRenderer.image = ({ href, title, text }) => {
  const match = href.match(/^(.*?)\s*=(\d+%?)$/)
  let width = '100%'
  if (match) {
    href = match[1]
    width = match[2]
  }
  const titleAttr = title ? ` title="${title}"` : ''
  return `<img src="${href}" alt="${text}"${titleAttr} style="max-width:${width}">`
}

const route = useRoute()
const router = useRouter()
const { addRecord, getRecordById, updateRecord } = useRecords()

const isEdit = !!route.params.id

const title = ref('')
const content = ref('')
const location = ref('')
const locating = ref(false)
const contentRef = ref(null)
const fileInputRef = ref(null)
const mdFileInputRef = ref(null)

// 日期时间（默认当前时间）
function nowLocalISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const recordDate = ref(nowLocalISO())
const recordLat = ref(null)
const recordLng = ref(null)

// ---- Markdown 实时渲染 ----
const renderedContent = computed(() => {
  if (!content.value) return '<p style="color:#ccc; margin:0">开始写作，右侧实时预览...</p>'
  try {
    return marked.parse(content.value, { renderer: imgRenderer })
  } catch (e) {
    console.error('[渲染错误]', e)
    return '<p style="color:red">渲染出错，请检查 Markdown 语法</p>'
  }
})

// ---- 光标位置跟踪 ----
const savedSelStart = ref(0)
const savedSelEnd = ref(0)
function saveCursor() {
  const ta = contentRef.value
  if (ta) {
    savedSelStart.value = ta.selectionStart
    savedSelEnd.value = ta.selectionEnd
  }
}

// ---- 加载已有记录 ----
if (isEdit) {
  const record = getRecordById(route.params.id)
  if (record) {
    title.value = record.title
    content.value = record.content || ''
    location.value = record.location || ''
  }
}

// ---- 插入 Markdown 语法 ----
function insertMarkdown(before, after, placeholder) {
  const ta = contentRef.value
  if (!ta) return
  const start = savedSelStart.value
  const end = savedSelEnd.value
  const selected = content.value.substring(start, end) || placeholder
  content.value =
    content.value.substring(0, start) +
    before + selected + after +
    content.value.substring(end)
  const cursor = start + before.length + selected.length + after.length
  nextTick(() => { ta.focus(); ta.setSelectionRange(cursor, cursor) })
}

// ---- 图片上传 + 尺寸选择 ----
let pendingFile = null
const showSizePicker = ref(false)
const imgSize = ref('100%')

function triggerImageUpload() { fileInputRef.value?.click() }

function onImageSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  pendingFile = file
  imgSize.value = '100%'
  showSizePicker.value = true
  e.target.value = ''
}

function confirmImageSize() {
  showSizePicker.value = false
  if (!pendingFile) return
  const file = pendingFile
  const desc = file.name.replace(/\.[^.]+$/, '')
  pendingFile = null

  const reader = new FileReader()
  reader.onload = (ev) => {
    const md = `![${desc}](${ev.target.result})`
    const ta = contentRef.value
    if (ta) {
      const start = savedSelStart.value
      const end = savedSelEnd.value
      content.value = content.value.substring(0, start) + md + content.value.substring(end)
      nextTick(() => { ta.focus(); const cursor = start + md.length; ta.setSelectionRange(cursor, cursor) })
    }
  }
  reader.readAsDataURL(file)
}

// ---- Markdown 文件导入 ----
function triggerMdImport() { mdFileInputRef.value?.click() }

function onMdImported(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const md = ev.target.result
    const localImages = md.match(/!\[.*?\]\((?!http|data:).*?\)/g)
    if (localImages) console.warn('[导入] 发现本地图片引用，导入后可能无法显示:', localImages.length)
    const ta = contentRef.value
    if (ta) {
      const start = savedSelStart.value
      const end = savedSelEnd.value
      content.value = content.value.substring(0, start) + md + content.value.substring(end)
      nextTick(() => { ta.focus(); const cursor = start + md.length; ta.setSelectionRange(cursor, cursor) })
    } else { content.value += '\n' + md }
  }
  reader.readAsText(file)
  e.target.value = ''
}

// ---- 逆地理编码 ----
async function fetchLocationName(lat, lng) {
  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&output=JSON&radius=1000&extensions=base&coordsys=gps`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.status === '1' && data.regeocode) {
      const ac = data.regeocode.addressComponent
      const parts = [
        ac.neighborhood?.name || '',
        ac.streetNumber?.street || '',
        ac.township || '',
        ac.district || '',
        ac.city || ac.province || '',
      ].filter(Boolean)
      return parts.join(' · ') || data.regeocode.formatted_address
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch (err) {
    console.warn('[定位] 高德逆地理编码失败:', err)
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

// ---- IP 定位 ----
async function locateByIP() {
  try {
    const res = await fetch('https://ip-api.com/json/?lang=zh-CN')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.status === 'success') {
      const parts = [data.city, data.regionName].filter(Boolean)
      return { name: parts.join(' · '), lat: data.lat, lon: data.lon }
    }
    return null
  } catch (err) {
    console.warn('[定位] IP定位失败:', err)
    return null
  }
}

// ---- 获取位置 ----
async function getLocation() {
  locating.value = true
  recordLat.value = null
  recordLng.value = null
  const gpsPromise = new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        recordLat.value = latitude
        recordLng.value = longitude
        const name = await fetchLocationName(latitude, longitude)
        resolve(name)
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 }
    )
  })
  const name = await Promise.race([
    gpsPromise,
    new Promise(r => setTimeout(() => r(null), 10000)),
  ])
  if (!name) {
    const ip = await locateByIP()
    if (ip) {
      location.value = ip.name
      recordLat.value = ip.lat
      recordLng.value = ip.lon
    }
  } else {
    location.value = name
  }
  locating.value = false
}

// ---- 保存 ----
function saveRecord() {
  if (!title.value) { alert('请输入标题'); return }
  if (isEdit) {
    updateRecord(route.params.id, {
      title: title.value,
      content: content.value,
      location: location.value,
      lat: recordLat.value,
      lng: recordLng.value,
    })
    router.push('/record/' + route.params.id)
  } else {
    addRecord({
      title: title.value,
      content: content.value,
      location: location.value,
      date: recordDate.value,
      lat: recordLat.value,
      lng: recordLng.value,
    })
    router.push('/timeline')
  }
}

onMounted(() => { if (!isEdit) getLocation() })
</script>

<style scoped>
.record-edit {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 0 0;
}

/* ---- 标题 ---- */
.title-input {
  width: 100%;
  padding: 16px 4px;
  border: none;
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  outline: none;
  box-sizing: border-box;
}
.title-input::placeholder { color: #ccc; }

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
}
.toolbar button {
  padding: 4px 10px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #555;
}
.toolbar button:hover { background: #e8f5ee; color: #42b983; }
.toolbar-divider { width: 1px; height: 18px; background: #e0e0e0; margin: 0 4px; }

/* ---- 左右分栏 ---- */
.split-pane {
  display: flex;
  min-height: 520px;
  border: 1px solid #eee;
  border-top: none;
}
.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 50%;
}
.pane-edit { border-right: 1px solid #eee; }
.pane-header {
  font-size: 12px;
  color: #aaa;
  padding: 6px 12px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  user-select: none;
}

/* ---- 编辑区 ---- */
.content-input {
  flex: 1;
  width: 100%;
  padding: 20px;
  border: none;
  font-size: 15px;
  line-height: 1.8;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  color: #333;
  outline: none;
  resize: none;
  box-sizing: border-box;
  min-height: 480px;
}
.content-input::placeholder { color: #ccc; }

/* ---- 预览区 ---- */
.preview-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.8;
  background: #fff;
  box-sizing: border-box;
  min-height: 480px;
}
.preview-area :deep(img) { max-width: 100%; border-radius: 8px; margin: 12px 0; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.preview-area :deep(h1), .preview-area :deep(h2), .preview-area :deep(h3), .preview-area :deep(h4) { margin: 20px 0 10px; font-weight: 600; color: #1a1a1a; }
.preview-area :deep(h1) { font-size: 26px; }
.preview-area :deep(h2) { font-size: 22px; }
.preview-area :deep(h3) { font-size: 18px; }
.preview-area :deep(p) { margin: 10px 0; }
.preview-area :deep(blockquote) { border-left: 4px solid #42b983; padding: 4px 16px; color: #666; margin: 12px 0; background: #f9fdfb; }
.preview-area :deep(code) { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 14px; font-family: 'SF Mono', 'Menlo', monospace; }
.preview-area :deep(pre) { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
.preview-area :deep(pre code) { background: none; padding: 0; }
.preview-area :deep(table) { border-collapse: collapse; width: 100%; margin: 12px 0; }
.preview-area :deep(th), .preview-area :deep(td) { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
.preview-area :deep(th) { background: #f5f5f5; font-weight: 600; }
.preview-area :deep(ul), .preview-area :deep(ol) { padding-left: 24px; margin: 8px 0; }
.preview-area :deep(a) { color: #42b983; text-decoration: none; }

/* ---- 底部栏（地点 + 操作按钮）---- */
.footer-bar {
  padding: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 500px;
}
.location-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}
.date-input {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #555;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}
.date-input:focus { border-color: #42b983; }
.location-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #555;
  outline: none;
  box-sizing: border-box;
}
.location-input:focus { border-color: #42b983; }
.loc-btn { padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; white-space: nowrap; }
.loc-btn:disabled { color: #999; background: #f5f5f5; cursor: not-allowed; }
.footer-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.word-count { font-size: 13px; color: #aaa; }
.actions { display: flex; gap: 10px; }
.btn-save { padding: 10px 28px; background: #42b983; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; font-weight: 500; }
.btn-save:hover { background: #38a073; }
.btn-cancel { padding: 10px 20px; background: #fff; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; color: #666; }
.btn-cancel:hover { background: #f5f5f5; }

/* ---- 图片尺寸选择弹窗 ---- */
.size-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.size-picker { background: #fff; border-radius: 12px; padding: 28px; width: 320px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
.size-picker h4 { margin: 0 0 16px; font-size: 16px; }
.size-options { display: flex; gap: 10px; margin-bottom: 16px; }
.size-options button { flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 15px; color: #555; }
.size-options button.active { border-color: #42b983; color: #42b983; background: #f0f9f4; }
.size-preview { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 6px; }
.size-block { height: 12px; background: #42b983; border-radius: 3px; }
.size-preview span { font-size: 13px; color: #999; }
.size-actions { display: flex; gap: 10px; justify-content: flex-end; }
.size-actions button { padding: 8px 20px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
.size-actions .btn-primary { background: #42b983; color: #fff; border: none; }
</style>
