<template>
  <div class="map-view">
    <h2>地图</h2>
    <div class="map-placeholder">
      <p>🗺️ 地图区域（后续集成 Leaflet + OpenStreetMap）</p>
      <div v-for="m in mockMarkers" :key="m.id" class="marker-card" @click="$router.push('/record/' + m.recordId)">
        <strong>{{ m.title }}</strong>
        <p>{{ m.location }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const mockMarkers = [
  { id: 1, recordId: 1, title: '搭建项目框架', location: '家里' },
]
</script>

<style scoped>
.map-placeholder { border: 2px dashed #ddd; border-radius: 8px; padding: 20px; min-height: 400px; }
.marker-card { padding: 12px; border: 1px solid #eee; border-radius: 6px; margin-top: 10px; cursor: pointer; }
.marker-card:hover { background: #f9f9f9; }
</style>
