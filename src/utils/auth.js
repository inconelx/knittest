// utils/auth.js
import axios from 'axios'
import { useRouter } from 'vue-router'

//针织api
export const knit_api = axios.create({
  baseURL: 'http://localhost:5000',
})

// 请求拦截器：自动加上 token
knit_api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = token
    }
    return config
  },
  (error) => Promise.reject(error),
)
// 响应拦截器：处理 token 失效等
knit_api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // console.warn('⛔ 登录状态失效，跳转登录页')
      localStorage.clear()
      stopTokenRefresher()
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

const router = useRouter()
let refreshTimer = null // 全局唯一计时器引用

async function refreshToken() {
  try {
    const res = await knit_api.post('/api/refresh-token')
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('expires_at', res.data.expires_at)
    localStorage.setItem('expires_seconds', res.data.expires_seconds)
    localStorage.setItem('user_name', res.data.user_name)

    // console.log('🔁 Token refreshed successfully.')
  } catch (error) {
    // console.error('❌ Token refresh failed:', error)
    stopTokenRefresher()
    router.push('/login')
  }
}

export function initTokenRefresher() {
  stopTokenRefresher()

  const expiresSeconds = parseInt(localStorage.getItem('expires_seconds'))
  const expiresAt = parseInt(localStorage.getItem('expires_at'))
  const token = localStorage.getItem('token')

  if (!expiresSeconds || !token) {
    // console.warn('⚠️ Cannot start token refresher: missing token or expiration.')
    return
  }

  const refreshInterval = Math.max(expiresSeconds - 60, 60)
  // console.log(Math.floor(Date.now() / 1000))
  // console.log(refreshInterval)
  // console.log(Math.floor(Date.now() / 1000) + refreshInterval + 30)
  // console.log(expiresAt)
  if (Math.floor(Date.now() / 1000) + refreshInterval + 30 > expiresAt) {
    refreshToken()
  }

  // console.log(refreshInterval)
  refreshTimer = setInterval(async () => {
    refreshToken()
  }, refreshInterval * 1000)

  // console.log('✅ Token refresher started.')
}

export function stopTokenRefresher() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
    // console.log('⏹️ Token refresher stopped.')
  }
}
