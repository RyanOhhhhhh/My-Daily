<template>
  <div class="map-view">
    <h2>地图记录</h2>
    <p class="map-hint" v-if="mapRecords.length === 0 && !locating">暂无带照片的记录</p>
    <p class="map-hint locating-hint" v-if="locating">正在定位当前手机位置…</p>
    <div class="map-wrap" v-if="mapRecords.length > 0">
      <div class="map-container">
        <div ref="mapRef" class="leaflet-map"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRecords } from '../stores/records'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

const router = useRouter()
const { mapRecords, mapViewState } = useRecords()

const mapRef = ref(null)
let mapInstance = null
const mcg = L.markerClusterGroup({
  iconCreateFunction: function (cluster) {
    const markers = cluster.getAllChildMarkers()
    const photoUrl = markers[0]?.options?.photoUrl || ''
    const count = markers.length
    return L.divIcon({
      html: `<div class="cluster-photo"><img src="${photoUrl}" /><span class="cluster-badge">${count}</span></div>`,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
      className: 'photo-marker-icon',
    })
  },
  maxClusterRadius: 60,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
})
const locating = ref(false)

// 默认中心（北京）
const defaultCenter = [39.9042, 116.4074]

/** 获取浏览器定位，添加蓝色标记 */
function addCurrentLocation() {
  if (!navigator.geolocation) return
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false
      nextTick(() => {
        if (!mapInstance) return
        const myIcon = L.divIcon({
          html: '<div class="my-location-pin"><div class="pulse-ring"></div></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          className: 'my-location-icon',
        })
        L.marker([pos.coords.latitude, pos.coords.longitude], { icon: myIcon }).addTo(mapInstance)
      })
    },
    () => { locating.value = false },
    { timeout: 8000, enableHighAccuracy: false }
  )
}

function initMap() {
  if (!mapRef.value || mapRecords.value.length === 0) return

  mapInstance = L.map(mapRef.value, {
    center: defaultCenter,
    zoom: 12,
    zoomControl: true,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(mapInstance)

  mcg.addTo(mapInstance)

  // 返回地图时恢复之前的视野（点击标记时已预先保存）
  if (mapViewState.center && mapViewState.zoom) {
    mapInstance.setView([mapViewState.center.lat, mapViewState.center.lng], mapViewState.zoom, { animate: false })
  }

  mapRecords.value.forEach((r) => {
    // 照片缩略图标记（圆形裁剪，如手机相册地图）
    const photoIcon = L.divIcon({
      html: `<div class="photo-marker"><img src="${r.firstPhoto}" alt="${r.title}" /></div>`,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
      className: 'photo-marker-icon',
    })

    const marker = L.marker([r.lat, r.lng], {
      icon: photoIcon,
      photoUrl: r.firstPhoto,
    })
    mcg.addLayer(marker)

    // 点击照片标记 → 先保存视野再跳转
    marker.on('click', () => {
      if (mapInstance) {
        const c = mapInstance.getCenter()
        mapViewState.center = { lat: c.lat, lng: c.lng }
        mapViewState.zoom = mapInstance.getZoom()
      }
      router.push('/record/' + r.id)
    })
  })

  // 未缓存视野时才自适应边界
  if (!savedView) {
    if (mapRecords.value.length === 1) {
      mapInstance.setView([mapRecords.value[0].lat, mapRecords.value[0].lng], 14)
    } else {
      const bounds = mcg.getBounds()
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
      }
    }
  }

  setTimeout(() => mapInstance?.invalidateSize(), 200)
}

onMounted(() => {
  nextTick(() => {
    initMap()
    addCurrentLocation()
  })
})

onBeforeUnmount(() => {
  if (mapInstance) {
    // 兜底：如果点击标记时已保存则跳过
    if (!mapViewState.center) {
      const c = mapInstance.getCenter()
      mapViewState.center = { lat: c.lat, lng: c.lng }
      mapViewState.zoom = mapInstance.getZoom()
    }
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
h2 { margin: 0 0 12px; font-size: 24px; font-weight: 700; color: var(--text); }
.map-hint { color: var(--text-muted); padding: 60px 40px; text-align: center; font-size: 15px; }

.map-wrap {
  flex: 1;
  min-height: 520px;
}

.map-container {
  width: 100%;
  height: 100%;
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

/* ---- 照片缩略图标记（圆形裁剪） ---- */
:global(.photo-marker-icon) { background: none !important; border: none !important; }
:global(.photo-marker) {
  width: 56px; height: 56px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
:global(.photo-marker:hover) {
  transform: scale(1.12);
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
}
:global(.photo-marker img) {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}

/* ---- 照片集群标记（自动合并） ---- */
:global(.cluster-photo) {
  width: 56px; height: 56px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  position: relative;
  cursor: pointer;
}
:global(.cluster-photo img) {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
:global(.cluster-badge) {
  position: absolute;
  bottom: -4px; right: -4px;
  background: #ff3b30;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px; height: 20px;
  line-height: 20px;
  text-align: center;
  border-radius: 10px;
  padding: 0 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  border: 2px solid #fff;
}

/* ---- 弹窗样式 ---- */
:global(.map-popup) { cursor: pointer; font-size: 14px; min-width: 180px; }
:global(.map-popup .popup-photo) {
  width: 100%; height: 120px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
}
:global(.map-popup strong) { display: block; margin-bottom: 4px; color: #333; }
:global(.map-popup p) { margin: 0; color: #888; font-size: 12px; }
:global(.leaflet-popup-content) { margin: 10px 14px; }

/* ---- 当前定位蓝点 ---- */
:global(.my-location-icon) { background: none !important; border: none !important; }
:global(.my-location-pin) {
  width: 18px; height: 18px;
  background: #4285f4;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(66,133,244,0.5);
  position: relative;
}
:global(.pulse-ring) {
  position: absolute;
  top: -8px; left: -8px;
  width: 30px; height: 30px;
  border-radius: 50%;
  border: 2px solid #4285f4;
  animation: pulse 1.8s ease-out infinite;
  pointer-events: none;
}
@keyframes pulse {
  0%   { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

.locating-hint { color: #4285f4 !important; }
</style>
