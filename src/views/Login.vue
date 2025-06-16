<template>
  <div class="login-container">
    <el-card class="login-card">
      <h3 style="text-align: center">用户登录</h3>
      <br />
      <el-form :model="form" @submit.prevent="handleLogin" label-width="auto">
        <el-form-item label="用户名" style="width: 100%">
          <el-input v-model="form.user_name" maxlength="30" />
        </el-form-item>
        <el-form-item label="密码" style="width: 100%">
          <el-input v-model="form.user_password" show-password maxlength="20" />
        </el-form-item>
        <el-form-item style="width: 100%">
          <div style="width: 100%; display: flex; justify-content: flex-end">
            <el-button type="primary" @click="handleLogin">登录</el-button>
          </div>
        </el-form-item>
      </el-form>
      <el-alert v-if="error" :title="error" type="error" show-icon />
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { initTokenRefresher, knit_api } from '@/utils/auth.js'

const router = useRouter()
const form = ref({
  user_name: '',
  user_password: '',
})
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  try {
    const res = await knit_api.post('/api/login', form.value)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('expires_at', res.data.expires_at)
    localStorage.setItem('expires_seconds', res.data.expires_seconds)
    // initTokenRefresher()
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || '登录失败'
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.login-card {
  width: 400px;
}
</style>
