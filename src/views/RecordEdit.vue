<template>
  <div class="record-edit">
    <div class="blog-editor">
      <!-- 标题 -->
      <input v-model="title" placeholder="标题" class="title-input" />

      <!-- 纯文本输入区 -->
      <textarea
        v-model="content"
        placeholder="写点什么呢..."
        class="text-input"
      ></textarea>

      <!-- 图片网格 -->
      <div class="image-section">
        <div class="image-grid">
          <div
            v-for="(img, idx) in images"
            :key="idx"
            class="image-cell"
            @click="openPreview(idx)"
          >
            <img :src="img" class="image-thumb" />
            <button
              class="image-del-btn"
              @click.stop="removeImage(idx)"
              title="删除"
            >✕</button>
          </div>
          <div class="image-cell image-add" @click="triggerImageUpload">
            <span class="add-icon">+</span>
          </div>
        </div>
      </div>

      <!-- 地点 + 底部操作栏 -->
      <div class="footer-bar">
        <div class="footer-meta">
          <div class="location-wrapper">
            <input v-model="location" placeholder="添加地点" class="location-input" />
            <button v-if="locating" class="loc-btn" disabled>定位中...</button>
            <button v-else class="loc-btn" @click="getLocation">📍 定位</button>
            <button class="loc-btn" @click="openMapPicker">🗺 地图</button>
          </div>
          <input type="datetime-local" v-model="recordDate" class="date-input" />
        </div>
        <div class="footer-actions">
          <span class="word-count">{{ content.length }} 字 · {{ images.length }} 张</span>
          <div class="actions">
            <button @click="$router.back()" class="btn-cancel">取消</button>
            <button @click="saveRecord" class="btn-save" :disabled="saving">{{ saving ? '发布中...' : '发布' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏：图片选择器（支持多选） -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="onImagesSelected"
    />

    <!-- 图片预览弹窗 -->
    <div v-if="previewImg !== null" class="preview-overlay" @click="closePreview">
      <button class="preview-close" @click.stop="closePreview">✕</button>
      <button v-if="previewImg > 0" class="preview-nav preview-prev" @click.stop="prevImage">‹</button>
      <button v-if="previewImg < images.length - 1" class="preview-nav preview-next" @click.stop="nextImage">›</button>
      <img :src="images[previewImg]" class="preview-image" @click.stop />
      <div class="preview-counter">{{ previewImg + 1 }} / {{ images.length }}</div>
    </div>

    <!-- 地图选点弹窗 -->
    <div v-if="showMapPicker" class="map-picker-overlay">
      <div class="map-picker-header">
        <div class="map-search-wrapper">
          <input
            v-model="mapQuery"
            placeholder="搜索地点..."
            class="map-search-input"
            @keyup.enter="searchLocation"
            @input="onSearchInput"
            @focus="showSearchResults = true"
          />
          <div v-if="showSearchResults && searchResults.length > 0" class="map-search-dropdown">
            <div
              v-for="(r, i) in searchResults"
              :key="i"
              class="map-search-item"
              @click="selectSearchResult(r)"
            >
              <span class="map-search-item-name">{{ r.display_name }}</span>
            </div>
          </div>
        </div>
        <button class="map-my-loc-btn" @click="goToMyLocation" title="我的位置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
        </button>
        <button @click="closeMapPicker" class="map-picker-close-btn">✕</button>
      </div>
      <div class="map-picker-body" @click="closeSearchResults">
        <div ref="pickerMapRef" class="picker-map"></div>
      </div>
      <div class="map-picker-footer">
        <span class="map-picker-addr">{{ mapPickerAddr }}</span>
        <button @click="confirmMapLocation" class="btn-save">确认位置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRoute, useRouter } from 'vue-router'
import { useRecords } from '../stores/records'
import { AMAP_KEY } from '../config'
import { API_BASE } from '../api'
import { wgs84ToGcj02, gcj02ToWgs84 } from '../utils/coord'
import exifr from 'exifr'

const route = useRoute()
const router = useRouter()
const { addRecord, getRecordById, updateRecord } = useRecords()

const isEdit = !!route.params.id

const title = ref('')
const content = ref('')
const images = ref([])
const location = ref('')
const locating = ref(false)
const saving = ref(false)
const fileInputRef = ref(null)
const previewImg = ref(null)

function openPreview(idx) { previewImg.value = idx }
function closePreview() { previewImg.value = null }
function prevImage() { if (previewImg.value > 0) previewImg.value-- }
function nextImage() { if (previewImg.value < images.value.length - 1) previewImg.value++ }

function onPreviewKeydown(e) {
  if (previewImg.value === null) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); nextImage() }
  else if (e.key === 'Escape') { closePreview() }
}

// 日期时间（默认当前时间）
function nowLocalISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const recordDate = ref(nowLocalISO())
const recordLat = ref(null)
const recordLng = ref(null)

// ---- 加载已有记录 ----
if (isEdit) {
  getRecordById(route.params.id).then(record => {
    if (record) {
      title.value = record.title
      content.value = record.content || ''
      images.value = record.images || []
      location.value = record.location || ''
    }
  })
}

// ---- 图片上传 ----
function triggerImageUpload() { fileInputRef.value?.click() }

/** 从缩略图 URL 推导原图 URL */
function getOriginalUrl(img) {
  if (!img || img.startsWith('data:')) return img
  return img.replace('/thumbnail/', '/original/')
}

async function onImagesSelected(e) {
  const files = Array.from(e.target.files || [])
  if (files.length === 0) return
  e.target.value = ''

  let gpsFound = false

  for (const file of files) {
    // 读取 EXIF GPS（只用最先有 GPS 的图片定位）
    if (!gpsFound) {
      try {
        const gps = await exifr.gps(file)
        if (gps && gps.latitude && gps.longitude) {
          gpsFound = true
          recordLat.value = gps.latitude
          recordLng.value = gps.longitude
          const name = await fetchLocationName(gps.latitude, gps.longitude)
          if (name) location.value = name
        }
      } catch (_) { /* 无 GPS 则跳过 */ }
    }

    // 上传到后端（保存原图 + 生成缩略图）
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = sessionStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // 存缩略图 URL（预览时自动切原图）
      images.value.push(API_BASE + data.thumbnail)
    } catch (err) {
      console.warn('[上传] 图片上传失败:', err)
      alert(`图片 ${file.name} 上传失败`)
    }
  }
}

function removeImage(idx) {
  images.value.splice(idx, 1)
}

// ---- 逆地理编码 ----
async function fetchLocationName(lat, lng) {
  // 先用高德（自动处理 WGS-84 → GCJ-02 偏移）
  let name = await amapReverse(lat, lng)
  return name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

async function amapReverse(lat, lng) {
  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&output=JSON&radius=1000&extensions=all&coordsys=gps`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.status !== '1' || !data.regeocode) return null
    const ac = data.regeocode.addressComponent

    // 1) neighborhood.name 可能是空数组 []（truthy），需正确处理
    const nh = ac.neighborhood?.name
    let last = !nh || (Array.isArray(nh) && nh.length === 0) ? '' : (Array.isArray(nh) ? nh[0] : nh)

    // 2) 从附近 POI 中找住宅小区名（需 extensions=all）
    if (!last && data.regeocode.pois) {
      for (const p of data.regeocode.pois) {
        if (p.type && (p.type.includes('住宅小区') || p.type.includes('住宅区'))) {
          last = p.name
          break
        }
      }
    }

    // 3) 还是没有，用街道/乡镇
    if (!last) last = ac.township || ''

    const parts = [
      ac.city || ac.province || '',
      ac.district || '',
      last,
    ].filter(Boolean)

    return parts.join(' · ') || data.regeocode.formatted_address
  } catch (err) {
    console.warn('[定位] 高德逆地理编码失败:', err)
    return null
  }
}

async function nominatimReverse(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&accept-language=zh`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.address) return null
    const a = data.address
    // 城市 · 区 · 小区/街道办/ suburb
    const city = a.city || a.town || a.county || ''
    const district = a.district || a.suburb || ''
    const last = a.neighbourhood || a.suburb || a.village || a.town || a.road || ''
    const p = [city, district, last].filter(Boolean)
    if (p.length >= 2) return p.join(' · ')
    return data.display_name?.split(',').slice(0, 4).join(' · ').trim() || null
  } catch (_) {
    return null
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
async function getLocation(skipIfSet = false) {
  locating.value = true
  if (!skipIfSet) {
    recordLat.value = null
    recordLng.value = null
  }
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
    if (ip && (!skipIfSet || !location.value)) {
      location.value = ip.name
      recordLat.value = ip.lat
      recordLng.value = ip.lon
    }
  } else {
    if (!skipIfSet || !location.value) location.value = name
  }
  locating.value = false
}

// ---- 地图选点 ----
const showMapPicker = ref(false)
const mapQuery = ref('')
const mapPickerAddr = ref('')
const pickerMapRef = ref(null)
const searchResults = ref([])
const showSearchResults = ref(false)
let pickerMap = null
let pickerMarker = null
let pickerLat = null
let pickerLng = null
let searchTimer = null

function openMapPicker() {
  showMapPicker.value = true
  searchResults.value = []
  showSearchResults.value = false
  // 默认中心：EXIF GPS → 已有坐标 → 北京
  const lat = recordLat.value || 39.9042
  const lng = recordLng.value || 116.4074
  pickerLat = lat
  pickerLng = lng
  mapPickerAddr.value = location.value || ''
  nextTick(initPickerMap)
}

function closeMapPicker() {
  showMapPicker.value = false
  if (searchTimer) clearTimeout(searchTimer)
  if (pickerMap) {
    pickerMap.remove()
    pickerMap = null
    pickerMarker = null
  }
}

function initPickerMap() {
  if (!pickerMapRef.value) return
  pickerMap = L.map(pickerMapRef.value, {
    center: [pickerLat, pickerLng],
    zoom: 15,
    zoomControl: true,
    attributionControl: false,
  })
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    maxZoom: 19,
    subdomains: ['1', '2', '3', '4'],
    attribution: '&copy; 高德地图',
  }).addTo(pickerMap)

  // 存储坐标是 WGS-84，显示时需要转为 GCJ-02（高德瓦片使用火星坐标系）
  const [gcjLat, gcjLng] = wgs84ToGcj02(pickerLat, pickerLng)
  pickerLat = gcjLat
  pickerLng = gcjLng

  pickerMarker = L.marker([pickerLat, pickerLng], { draggable: true }).addTo(pickerMap)

  pickerMarker.on('dragend', async () => {
    const pos = pickerMarker.getLatLng()
    // 从地图上获取的是 GCJ-02，转回 WGS-84 存储
    const [wgsLat, wgsLng] = gcj02ToWgs84(pos.lat, pos.lng)
    pickerLat = pos.lat
    pickerLng = pos.lng
    const name = await fetchLocationName(wgsLat, wgsLng)
    if (name) mapPickerAddr.value = name
  })

  pickerMap.on('click', async (e) => {
    const { lat, lng } = e.latlng
    pickerLat = lat
    pickerLng = lng
    pickerMarker.setLatLng([lat, lng])
    // 从地图上获取的是 GCJ-02，转回 WGS-84 查地址
    const [wgsLat, wgsLng] = gcj02ToWgs84(lat, lng)
    const name = await fetchLocationName(wgsLat, wgsLng)
    if (name) mapPickerAddr.value = name
  })

  setTimeout(() => pickerMap.invalidateSize(), 300)
}

function closeSearchResults() {
  showSearchResults.value = false
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = mapQuery.value.trim()
  if (!q) { searchResults.value = []; showSearchResults.value = false; return }
  searchTimer = setTimeout(() => searchLocation(false), 400)
}

async function searchLocation(flyToFirst = true) {
  const q = mapQuery.value.trim()
  if (!q) return
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`
    )
    if (!res.ok) return
    const data = await res.json()
    searchResults.value = data
    showSearchResults.value = true
    if (flyToFirst && data.length > 0) {
      selectSearchResult(data[0])
    }
  } catch (err) {
    console.warn('[地图] 搜索失败:', err)
  }
}

function selectSearchResult(r) {
  // Nominatim 返回 WGS-84，转 GCJ-02 显示在高德瓦片上
  const [gcjLat, gcjLng] = wgs84ToGcj02(parseFloat(r.lat), parseFloat(r.lon))
  pickerLat = gcjLat
  pickerLng = gcjLng
  pickerMap.setView([gcjLat, gcjLng], 16)
  pickerMarker.setLatLng([gcjLat, gcjLng])
  mapPickerAddr.value = r.display_name
  showSearchResults.value = false
}

function goToMyLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords
      // 浏览器 GPS 返回 WGS-84，转 GCJ-02 显示在高德瓦片上
      const [gcjLat, gcjLng] = wgs84ToGcj02(latitude, longitude)
      pickerLat = gcjLat
      pickerLng = gcjLng
      pickerMarker.setLatLng([gcjLat, gcjLng])
      pickerMap.setView([gcjLat, gcjLng], 16)
      fetchLocationName(latitude, longitude).then((name) => {
        if (name) mapPickerAddr.value = name
      })
    },
    () => {},
    { timeout: 8000, enableHighAccuracy: false }
  )
}

async function confirmMapLocation() {
  if (pickerLat && pickerLng) {
    // 地图上操作得到的是 GCJ-02，转回 WGS-84 存储
    const [wgsLat, wgsLng] = gcj02ToWgs84(pickerLat, pickerLng)
    recordLat.value = wgsLat
    recordLng.value = wgsLng
    // 用 WGS-84 坐标查地址（高德 API 支持 coordsys=gps 参数）
    const name = await fetchLocationName(wgsLat, wgsLng)
    location.value = name || mapPickerAddr.value || ''
  }
  closeMapPicker()
}

// ---- 保存 ----
async function saveRecord() {
  if (!title.value) { alert('请输入标题'); return }
  saving.value = true
  try {
    // 30 秒超时保护
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('保存超时，请检查后端是否启动')), 30000)
    )
    if (isEdit) {
      await Promise.race([
        updateRecord(route.params.id, {
          title: title.value,
          content: content.value,
          images: images.value,
          location: location.value,
          lat: recordLat.value,
          lng: recordLng.value,
        }),
        timeout,
      ])
      router.push('/record/' + route.params.id)
    } else {
      await Promise.race([
        addRecord({
          title: title.value,
          content: content.value,
          images: images.value,
          location: location.value,
          date: recordDate.value,
          lat: recordLat.value,
          lng: recordLng.value,
        }),
        timeout,
      ])
      router.push('/timeline')
    }
  } catch (e) {
    console.error('[保存] 失败:', e)
    alert(e.message || '保存失败，请重试')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', onPreviewKeydown)
  if (!isEdit) getLocation(true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onPreviewKeydown)
  closeMapPicker()
})
</script>

<style scoped>
.record-edit {
  max-width: 720px;
  margin: 0 auto;
  padding: 0;
}

.title-input {
  width: 100%;
  padding: 16px 4px;
  border: none;
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  outline: none;
  box-sizing: border-box;
}
.title-input::placeholder { color: #ccc; }

/* ---- 纯文本输入区 ---- */
.text-input {
  width: 100%;
  min-height: 360px;
  padding: 16px 4px;
  border: none;
  border-top: 1px solid var(--border);
  font-size: 16px;
  line-height: 1.8;
  font-family: inherit;
  color: var(--text);
  outline: none;
  resize: vertical;
  box-sizing: border-box;
}
.text-input::placeholder { color: #ccc; }

/* ---- 图片网格 ---- */
.image-section {
  border-top: 1px solid var(--border);
  padding: 8px 4px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 480px;
}

.image-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
}

.image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-del-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.image-cell:hover .image-del-btn {
  opacity: 1;
}
.image-del-btn:hover { background: rgba(220, 50, 50, 0.85); }

.image-add {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed #ddd;
  border-radius: 8px;
  color: #bbb;
  transition: all 0.2s;
}
.image-add:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-bg);
}

.add-icon { font-size: 28px; line-height: 1; font-weight: 300; }

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

/* ---- 底部栏 ---- */
.footer-bar {
  padding: 16px 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  margin-top: 8px;
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
  padding: 9px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--text-secondary);
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color var(--transition);
}
.date-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(66,185,131,0.1); }
.location-input {
  flex: 1;
  padding: 9px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--text-secondary);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition);
}
.location-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(66,185,131,0.1); }
.loc-btn { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: var(--radius); background: var(--card); cursor: pointer; font-size: 14px; white-space: nowrap; transition: all var(--transition); }
.loc-btn:hover { border-color: var(--primary); }
.loc-btn:disabled { color: var(--text-muted); background: #f5f5f5; cursor: not-allowed; }
.footer-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.word-count { font-size: 13px; color: var(--text-muted); }
.actions { display: flex; gap: 10px; }
.btn-save { padding: 10px 28px; background: var(--primary); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: 15px; font-weight: 600; transition: all var(--transition); }
.btn-save:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(66,185,131,0.3); }
.btn-cancel { padding: 10px 20px; background: var(--card); border: 1.5px solid var(--border); border-radius: var(--radius); cursor: pointer; font-size: 14px; color: var(--text-secondary); transition: all var(--transition); }
.btn-cancel:hover { border-color: #ccc; background: #fafafa; }

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

/* ---- 地图选点弹窗 ---- */
.map-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  z-index: 300;
}
.map-picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--card);
}
.map-search-wrapper {
  position: relative;
  flex: 1;
}
.map-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.map-search-input:focus { border-color: var(--primary); }
.map-search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  box-shadow: var(--shadow-md);
  max-height: 260px;
  overflow-y: auto;
  z-index: 999;
}
.map-search-item {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid #f0f0f0;
  line-height: 1.4;
}
.map-search-item:last-child { border-bottom: none; }
.map-search-item:hover { background: var(--primary-bg); color: var(--text); }
.map-my-loc-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.map-my-loc-btn:hover { border-color: var(--primary); }
.map-my-loc-btn svg { stroke: var(--text-secondary); }
.map-my-loc-btn:hover svg { stroke: var(--primary); }
.map-picker-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.map-picker-close-btn:hover { background: #e0e0e0; }
.map-picker-body {
  flex: 1;
  position: relative;
}
.picker-map {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
.map-picker-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card);
}
.map-picker-addr {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
