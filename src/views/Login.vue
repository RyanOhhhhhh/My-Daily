<template>
  <div class="login">
    <h2>登录</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label>用户名</label>
        <input v-model="username" type="text" required />
      </div>
      <div>
        <label>密码</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit">登录</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')

function handleLogin() {
  // 暂存登录态，后续对接后端
  if (username.value && password.value) {
    sessionStorage.setItem('token', 'demo-token')
    sessionStorage.setItem('username', username.value)
    router.push('/timeline')
  } else {
    error.value = '请输入用户名和密码'
  }
}
</script>

<style scoped>
.login { max-width: 360px; margin: 100px auto; padding: 20px; }
.login form div { margin-bottom: 12px; }
.login input { width: 100%; padding: 8px; box-sizing: border-box; }
.error { color: red; font-size: 14px; }
</style>
