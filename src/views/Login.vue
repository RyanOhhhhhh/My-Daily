<template>
  <div class="login-page">
    <div class="login-card">
      <div class="card-header">
        <div class="logo-large">M</div>
        <h1>My Daily</h1>
        <p>记录生活的点滴</p>
      </div>

      <!-- 登录 / 注册 切换 -->
      <div class="tab-bar">
        <button :class="{ active: isLogin }" @click="isLogin = true">登录</button>
        <button :class="{ active: !isLogin }" @click="isLogin = false">注册</button>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" required />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" required />
        </div>
        <button type="submit" class="btn-login" :disabled="submitting">
          {{ submitting ? '处理中...' : (isLogin ? '登 录' : '注 册') }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
const isLogin = ref(true)

async function handleSubmit() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  submitting.value = true
  error.value = ''

  try {
    const endpoint = isLogin.value ? '/auth/login' : '/auth/register'
    const data = await api.post(endpoint, {
      username: username.value,
      password: password.value,
    })
    sessionStorage.setItem('token', data.access_token)
    sessionStorage.setItem('username', data.user.username)
    router.push('/record/new')
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5ee 0%, #f0f9f4 50%, #f8f9fa 100%);
}

.login-card {
  width: 380px;
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 40px 36px 36px;
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-large {
  width: 52px;
  height: 52px;
  background: var(--primary);
  color: #fff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
  margin: 0 auto 14px;
  box-shadow: 0 4px 12px rgba(66,185,131,0.3);
}

.card-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px;
}

.card-header p {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  background: #f5f5f5;
  border-radius: var(--radius);
  padding: 3px;
}

.tab-bar button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}

.tab-bar button.active {
  background: var(--card);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: 15px;
  color: var(--text);
  outline: none;
  transition: border-color var(--transition);
  background: #fafafa;
}

.field input:focus {
  border-color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(66,185,131,0.12);
}

.field input::placeholder { color: #ccc; }

.btn-login {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  margin-top: 4px;
}

.btn-login:hover:not(:disabled) {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(66,185,131,0.35);
  transform: translateY(-1px);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  font-size: 13px;
  text-align: center;
  margin: 0;
}
</style>
