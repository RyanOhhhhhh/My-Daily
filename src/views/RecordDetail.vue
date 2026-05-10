<template>
  <div class="record-detail">
    <button @click="$router.back()" class="back-btn">← 返回</button>
    <template v-if="record">
      <div class="detail-header">
        <h2>{{ record.title }}</h2>
        <button @click="$router.push('/record/' + route.params.id + '/edit')" class="edit-btn">编辑</button>
      </div>
      <div class="meta">
        <span>{{ record.date }}</span>
        <span v-if="record.location" class="location">{{ record.location }}</span>
      </div>
      <div class="content">
        <p>{{ record.content }}</p>
      </div>
    </template>
    <div v-else class="not-found">
      <p>记录不存在</p>
      <button @click="$router.push('/timeline')" class="back-btn">返回时间线</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRecords } from '../stores/records'

const route = useRoute()
const router = useRouter()
const { getRecordById, recordsMap } = useRecords()

const record = computed(() => {
  const id = Number(route.params.id)
  // 查找记录所属的月份键
  for (const [key, records] of Object.entries(recordsMap)) {
    const found = records.find(r => r.id === id)
    if (found) {
      const [y, m] = key.split('-')
      return {
        ...found,
        date: `${y}-${String(m).padStart(2, '0')}-${String(found.day).padStart(2, '0')}`,
      }
    }
  }
  return null
})
</script>

<style scoped>
.back-btn { padding: 6px 16px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; margin-bottom: 16px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.detail-header h2 { margin: 0; }
.edit-btn { padding: 6px 16px; background: #42b983; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.meta { color: #999; font-size: 14px; margin-bottom: 20px; display: flex; gap: 16px; }
.content { line-height: 1.8; }
</style>
