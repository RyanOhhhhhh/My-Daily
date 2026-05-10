<template>
  <div class="record-edit">
    <h2>{{ isEdit ? '编辑记录' : '写记录' }}</h2>
    <div class="form">
      <input v-model="title" placeholder="标题" class="title-input" />
      <div class="location-wrapper">
        <input v-model="location" placeholder="地点（自动获取中...）" class="location-input" />
        <button v-if="locating" class="loc-btn" disabled>定位中...</button>
        <button v-else class="loc-btn" @click="getLocation" title="重新获取当前位置">📍</button>
      </div>
      <textarea v-model="content" placeholder="正文，支持 Markdown 格式..." class="content-input"></textarea>
      <div class="photos">
        <button @click="addPhoto">+ 添加照片</button>
      </div>
      <div class="actions">
        <button @click="saveRecord" class="btn-save">保存</button>
        <button @click="$router.back()" class="btn-cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecords } from '../stores/records'

const route = useRoute()
const router = useRouter()
const { addRecord, getRecordById, updateRecord } = useRecords()

const isEdit = !!route.params.id

const title = ref('')
const content = ref('')
const location = ref('')
const locating = ref(false)

// ---- 加载已有记录（编辑模式） ----
if (isEdit) {
  const record = getRecordById(route.params.id)
  if (record) {
    title.value = record.title
    content.value = record.content || ''
    location.value = record.location || ''
  }
}

// ---- 逆地理编码：坐标 → 地名 ----
async function fetchLocationName(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&lang=zh`,
      { headers: { 'User-Agent': 'MyDiary/1.0' } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    console.log('[定位] Nominatim 响应:', data)
    if (data.display_name) {
      const addr = data.address
      const parts = [
        addr.city || addr.town || addr.village || addr.county,
        addr.road || addr.suburb || addr.quarter,
      ].filter(Boolean)
      return parts.join(' · ') || data.display_name
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch (err) {
    console.warn('[定位] 逆地理编码失败:', err)
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

// ---- IP 定位（GPS 失败时的备选） ----
async function locateByIP() {
  try {
    const res = await fetch('http://ip-api.com/json/?lang=zh-CN')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    console.log('[定位] IP定位结果:', data)
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
  locError.value = ''

  // 优先用浏览器 GPS
  if (navigator.geolocation) {
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          const name = await fetchLocationName(latitude, longitude)
          location.value = name
          console.log('[定位] GPS定位成功:', name)
          resolve()
        },
        async (err) => {
          console.warn('[定位] GPS失败:', err.message)
          const ipResult = await locateByIP()
          if (ipResult) {
            location.value = ipResult.name
            console.log('[定位] IP定位成功:', ipResult.name)
          }
          resolve()
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    })
  } else {
    const ipResult = await locateByIP()
    if (ipResult) {
      location.value = ipResult.name
    }
  }

  locating.value = false
}

// ---- 保存记录 ----
function saveRecord() {
  if (!title.value) {
    alert('请输入标题')
    return
  }
  if (!content.value) {
    alert('请输入正文内容')
    return
  }

  if (isEdit) {
    updateRecord(route.params.id, {
      title: title.value,
      content: content.value,
      location: location.value,
    })
    alert('修改已保存！')
    router.push('/record/' + route.params.id)
  } else {
    addRecord({
      title: title.value,
      content: content.value,
      location: location.value,
    })
    alert('保存成功！')
    router.push('/timeline')
  }
}

onMounted(() => {
  if (!isEdit) {
    getLocation()
  }
})
</script>

<style scoped>
.form { max-width: 700px; }
.title-input, .location-input { width: 100%; padding: 10px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
.location-wrapper { display: flex; gap: 8px; align-items: center; }
.location-wrapper .location-input { flex: 1; margin-bottom: 0; }
.loc-btn { padding: 10px 14px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px; white-space: nowrap; }
.loc-btn:disabled { color: #999; background: #f5f5f5; cursor: not-allowed; }
.content-input { width: 100%; height: 300px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-family: inherit; resize: vertical; }
.photos { margin-bottom: 12px; }
.actions { display: flex; gap: 10px; }
.btn-save { padding: 10px 24px; background: #42b983; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-cancel { padding: 10px 24px; background: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
</style>
