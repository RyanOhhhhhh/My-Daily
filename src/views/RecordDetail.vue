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
      <div class="content" v-html="renderedContent"></div>
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
const { getRecordById, recordsMap } = useRecords()

const record = computed(() => {
  const id = Number(route.params.id)
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

const renderedContent = computed(() => {
  if (!record.value?.content) return '<p style="color:#ccc">暂无内容</p>'
  return marked(record.value.content)
})
</script>

<style scoped>
.back-btn { padding: 6px 16px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; margin-bottom: 16px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.detail-header h2 { margin: 0; }
.edit-btn { padding: 6px 16px; background: #42b983; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.meta { color: #999; font-size: 14px; margin-bottom: 20px; display: flex; gap: 16px; }
.content { line-height: 1.8; font-size: 15px; }
.content :deep(h1), .content :deep(h2), .content :deep(h3), .content :deep(h4) { margin: 16px 0 8px; }
.content :deep(p) { margin: 8px 0; }
.content :deep(img) { max-width: 100%; border-radius: 6px; margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.content :deep(blockquote) { border-left: 4px solid #42b983; padding-left: 12px; color: #666; margin: 8px 0; }
.content :deep(code) { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
.content :deep(pre) { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
.content :deep(ul), .content :deep(ol) { padding-left: 24px; }
</style>
