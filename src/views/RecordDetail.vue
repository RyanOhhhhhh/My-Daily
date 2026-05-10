<template>
  <div class="record-detail">
    <button @click="$router.back()" class="back-btn">← 返回</button>
    <h2>{{ record.title }}</h2>
    <div class="meta">
      <span>{{ record.date }}</span>
      <span v-if="record.location">{{ record.location }}</span>
    </div>
    <div class="content">
      <p>{{ record.content }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const record = ref({
  title: '搭建项目框架',
  date: '2026-05-11',
  location: '家里',
  content: '今天决定了技术栈：Vue 3 + Python FastAPI + SQLite，开始搭建项目脚手架。',
})
</script>

<style scoped>
.back-btn { padding: 6px 16px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; margin-bottom: 16px; }
.meta { color: #999; font-size: 14px; margin-bottom: 20px; display: flex; gap: 16px; }
.content { line-height: 1.8; }
</style>
