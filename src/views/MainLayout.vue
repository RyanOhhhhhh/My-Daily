<template>
  <div class="main-layout">
    <nav class="sidebar">
      <h3>My Diary</h3>
      <p class="user-info" v-if="username">👤 {{ username }}</p>
      <ul>
        <li><router-link to="/timeline">📅 时间线</router-link></li>
        <li><router-link to="/map">🗺️ 地图</router-link></li>
        <li><router-link to="/record/new">✏️ 写记录</router-link></li>
      </ul>
      <button class="logout" @click="handleLogout">退出登录</button>
    </nav>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref(sessionStorage.getItem('username') || '')

function handleLogout() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
.main-layout { display: flex; height: 100vh; }
.sidebar { width: 200px; background: #f5f5f5; padding: 20px; display: flex; flex-direction: column; }
.sidebar h3 { margin-top: 0; }
.sidebar ul { list-style: none; padding: 0; flex: 1; }
.sidebar li { margin-bottom: 10px; }
.sidebar a { text-decoration: none; color: #333; }
.sidebar a:hover { color: #42b983; }
.content { flex: 1; padding: 20px; overflow-y: auto; }
.user-info { font-size: 14px; color: #666; }
.logout { margin-top: auto; padding: 8px; cursor: pointer; background: #fff; border: 1px solid #ddd; border-radius: 4px; }
</style>
