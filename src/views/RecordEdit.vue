<template>
  <div class="record-edit">
    <h2>{{ isEdit ? '编辑记录' : '写记录' }}</h2>
    <div class="form">
      <input v-model="title" placeholder="标题" class="title-input" />
      <input v-model="location" placeholder="地点（选填）" class="location-input" />
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
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id

const title = ref('')
const content = ref('')
const location = ref('')

function addPhoto() {
  alert('图片上传功能待对接')
}

function saveRecord() {
  if (!title.value || !content.value) {
    alert('标题和正文不能为空')
    return
  }
  alert('保存成功！（演示版，后续对接后端）')
  router.push('/timeline')
}
</script>

<style scoped>
.form { max-width: 700px; }
.title-input, .location-input { width: 100%; padding: 10px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
.content-input { width: 100%; height: 300px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-family: inherit; resize: vertical; }
.photos { margin-bottom: 12px; }
.actions { display: flex; gap: 10px; }
.btn-save { padding: 10px 24px; background: #42b983; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-cancel { padding: 10px 24px; background: #fff; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
</style>
