<template>
  <div class="login-container">
    <el-card class="login-card">
      <h3 style="text-align: center">用户登录</h3>
      <br />
      <el-form :model="form" label-width="auto">
        <el-form-item label="用户名" prop="user_name" style="width: 100%">
          <el-input v-model="form.user_name" maxlength="30" />
        </el-form-item>
        <el-form-item label="密码" prop="user_password" style="width: 100%">
          <el-input v-model="form.user_password" show-password maxlength="20" />
        </el-form-item>
        <el-form-item style="width: 100%">
          <div style="width: 100%; display: flex; justify-content: flex-end">
            <el-button type="primary" @click="startLogin" :disabled="loading || connected"
              >登录</el-button
            >
          </div>
        </el-form-item>
      </el-form>
      <el-alert v-if="message" :title="message" type="error" show-icon />
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { initTokenRefresher, knit_api } from '@/utils/auth.js'
import forge from 'node-forge'
import { io } from 'socket.io-client'

const public_key = ref()

const router = useRouter()
const form = ref({
  user_name: '',
  user_password: '',
})
const message = ref('')
const success = ref(false)
const loading = ref(false)
const connected = ref(false)

let socket = null

const startLogin = () => {
  loading.value = true
  message.value = ''
  success.value = false

  // 建立 Socket.IO 连接
  socket = io('https://192.168.0.104:5000', { transports: ['websocket'] })

  socket.on('connect', () => {
    connected.value = true
    console.log('✅ 连接成功，等待公钥...')
  })

  socket.on('disconnect', () => {
    connected.value = false
    loading.value = false
    console.log('❌ 连接断开')
  })

  socket.on('auth_public_key', async (data) => {
    const public_key = data.key
    console.log('收到公钥，开始加密密码...')
    try {
      const publicKey = forge.pki.publicKeyFromPem(public_key)
      // 用 OAEP + SHA-256 加密
      const encryptedBytes = publicKey.encrypt(form.value.user_password, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha256.create(),
        },
      })

      // 发起登录请求
      socket.emit('auth_request', {
        user_name: form.value.user_name,
        user_password: forge.util.encode64(encryptedBytes),
      })
    } catch (e) {
      message.value = '加密失败: ' + e.message
      loading.value = false
    }
  })

  socket.on('auth_success', (data) => {
    success.value = true
    message.value = ''
    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('refresh_at', Math.floor(Date.now() / 1000))
    sessionStorage.setItem('expires_seconds', data.expires_seconds)
    sessionStorage.setItem('user_name', data.user_name)
    initTokenRefresher()
    router.push('/')
    loading.value = false
  })

  socket.on('auth_failed', (data) => {
    success.value = false
    message.value = '登录失败：' + data.message
    loading.value = false
  })
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
