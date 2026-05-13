<template>
  <div class="main-layout">
    <nav class="sidebar">
      <div class="sidebar-header">
        <div class="logo">M</div>
        <h3>My Daily</h3>
      </div>

      <div class="sidebar-user" v-if="username">
        <div class="avatar">{{ username[0].toUpperCase() }}</div>
        <span>{{ username }}</span>
      </div>

      <ul class="nav-list">
        <li>
          <router-link to="/record/new" class="nav-link" active-class="nav-active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            <span>写记录</span>
          </router-link>
        </li>
        <li>
          <router-link to="/timeline" class="nav-link" active-class="nav-active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"/></svg>
            <span>时间线</span>
          </router-link>
        </li>
        <li>
          <router-link to="/map" class="nav-link" active-class="nav-active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>地图</span>
          </router-link>
        </li>
      </ul>

      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>退出登录</span>
        </button>
      </div>
    </nav>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRecords } from '../stores/records'

const router = useRouter()
const username = ref(sessionStorage.getItem('username') || '')
const { fetchRecords } = useRecords()

// 进入应用后从后端加载记录
onMounted(() => { fetchRecords() })

function handleLogout() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: var(--bg);
}

/* ---- 侧边栏 ---- */
.sidebar {
  width: 220px;
  background: var(--card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 0;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--border);
}

.logo {
  width: 34px;
  height: 34px;
  background: var(--primary);
  color: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.sidebar-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

/* ---- 用户信息 ---- */
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-secondary);
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

/* ---- 导航列表 ---- */
.nav-list {
  list-style: none;
  padding: 12px 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--transition);
  text-decoration: none;
}

.nav-link:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.nav-active {
  background: var(--primary-bg);
  color: var(--primary);
  font-weight: 600;
}

.nav-active svg {
  stroke: var(--primary);
}

/* ---- 底部退出按钮 ---- */
.sidebar-footer {
  padding: 12px 10px;
  border-top: 1px solid var(--border);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius);
  background: transparent;
  font-size: 13px;
  color: var(--text-muted);
  transition: all var(--transition);
}

.logout-btn:hover {
  background: #fef2f2;
  color: #e74c3c;
}

/* ---- 内容区 ---- */
.content {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
}
</style>
