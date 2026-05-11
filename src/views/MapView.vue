<template>
  <div class="map-view">
    <h2>地图记录</h2>
    <p class="map-hint" v-if="mapRecords.length === 0">暂无带位置的记录</p>
    <div class="map-wrap" v-if="mapRecords.length > 0">
      <div class="map-container">
        <div ref="mapRef" class="leaflet-map"></div>
      </div>
      <div class="record-sidebar">
        <h4>有位置的记录 ({{ mapRecords.length }})</h4>
        <div
          v-for="r in mapRecords"
          :key="r.id"
          class="sidebar-item"
          @click="flyTo(r)"
          :class="{ active: activeId === r.id }"
        >
          <span class="sidebar-date">{{ r.date }}</span>
          <span class="sidebar-title">{{ r.title }}</span>
          <span class="sidebar-location">{{ r.location }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRecords } from '../stores/records'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const router = useRouter()
const { mapRecords } = useRecords()

const mapRef = ref(null)
let mapInstance = null
let markersLayer = null
const activeId = ref(null)

// 默认中心（北京）
const defaultCenter = [39.9042, 116.4074]

function initMap() {
  if (!mapRef.value || mapRecords.value.length === 0) return

  mapInstance = L.map(mapRef.value, {
    center: defaultCenter,
    zoom: 12,
    zoomControl: true,
    attributionControl: false,
  })

  // OpenStreetMap 瓦片
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(mapInstance)

  // 自定义图标（绿色标记）
  const icon = L.divIcon({
    html: '<div class="map-marker-pin"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -30],
    className: 'map-marker-icon',
  })

  markersLayer = L.layerGroup().addTo(mapInstance)

  mapRecords.value.forEach((r) => {
    const marker = L.marker([r.lat, r.lng], { icon }).addTo(markersLayer)
    marker.bindPopup(`
      <div class="map-popup" data-id="${r.id}">
        <strong>${r.title}</strong>
        <p>${r.location} · ${r.date}</p>
      </div>
    `)
    marker.on('click', () => {
      activeId.value = r.id
    })
    marker.on('popupopen', () => {
      activeId.value = r.id
    })
  })

  // 点击弹窗跳转详情
  mapInstance.on('popupopen', () => {
    const popupEl = document.querySelector('.map-popup')
    if (popupEl) {
      popupEl.addEventListener('click', () => {
        const id = popupEl.dataset.id
        if (id) router.push('/record/' + id)
      })
    }
  })

  // 自适应边界
  if (mapRecords.value.length === 1) {
    mapInstance.setView([mapRecords.value[0].lat, mapRecords.value[0].lng], 14)
  } else {
    const bounds = L.latLngBounds(mapRecords.value.map(r => [r.lat, r.lng]))
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
  }

  // 延迟修正尺寸
  setTimeout(() => mapInstance?.invalidateSize(), 200)
}

function flyTo(r) {
  activeId.value = r.id
  if (mapInstance) {
    mapInstance.setView([r.lat, r.lng], 15, { animate: true })
    // 打开对应弹窗
    markersLayer.eachLayer((marker) => {
      const latLng = marker.getLatLng()
      if (Math.abs(latLng.lat - r.lat) < 0.001 && Math.abs(latLng.lng - r.lng) < 0.001) {
        marker.openPopup()
      }
    })
  }
}

onMounted(() => {
  nextTick(initMap)
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style scoped>
.map-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}
h2 { margin: 0 0 8px; font-size: 22px; }
.map-hint { color: #999; padding: 40px; text-align: center; }

.map-wrap {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 520px;
}

.map-container {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  min-height: 520px;
  z-index: 0;
}

/* ---- 侧边栏 ---- */
.record-sidebar {
  width: 260px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
  max-height: 560px;
}

.record-sidebar h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #666;
}

.sidebar-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.15s;
}

.sidebar-item:hover { background: #f0f9f4; }
.sidebar-item.active { background: #e0f5e8; border-left: 3px solid #42b983; }

.sidebar-date { font-size: 11px; color: #aaa; }
.sidebar-title { font-size: 14px; color: #333; font-weight: 500; }
.sidebar-location { font-size: 12px; color: #888; }

/* ---- 自定义标记 ---- */
:global(.map-marker-icon) { background: none !important; border: none !important; }
:global(.map-marker-pin) {
  width: 20px;
  height: 20px;
  background: #42b983;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

/* ---- 弹窗样式 ---- */
:global(.map-popup) { cursor: pointer; font-size: 14px; }
:global(.map-popup strong) { display: block; margin-bottom: 4px; color: #333; }
:global(.map-popup p) { margin: 0; color: #888; font-size: 12px; }
:global(.leaflet-popup-content) { margin: 10px 14px; }
</style>
