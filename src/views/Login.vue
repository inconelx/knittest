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
            <el-button type="primary" @click="startLogin" :disabled="loading">登录</el-button>
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

const router = useRouter()
const form = ref({
  user_name: '',
  user_password: '',
})
const message = ref('')
const loading = ref(false)

const startLogin = async () => {
  try {
    if (form.value.user_password === '' || form.value.user_name === '') {
      message.value = '请输入账户名和密码'
      return
    }

    const before_res = await knit_api.post('/api/login-before')
    const public_key = before_res.data.public_key
    const token = before_res.data.token
    const publicKey = forge.pki.publicKeyFromPem(public_key)
    // 用 OAEP + SHA-256 加密
    const encryptedBytes = publicKey.encrypt(form.value.user_password, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    })
    const encryoted_password = forge.util.encode64(encryptedBytes)

    const res = await knit_api.post('/api/login', {
      user_name: form.value.user_name,
      user_password: encryoted_password,
      auth_token: token,
    })

    sessionStorage.setItem('token', res.data.token)
    sessionStorage.setItem('refresh_at', Math.floor(Date.now() / 1000))
    sessionStorage.setItem('expires_seconds', res.data.expires_seconds)
    sessionStorage.setItem('user_name', res.data.user_name)
    initTokenRefresher()
    router.push('/')
  } catch (err) {
    console.error(err)
    message.value = '登录失败：' + (err.response?.data?.error || err.message)
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
