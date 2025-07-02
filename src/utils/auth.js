// utils/auth.js
import axios from 'axios'
import router from '@/router/index.js'

let refreshTimer = null // 全局唯一计时器引用
let isRefreshing = false
let refreshPromise = null

//针织api
export const knit_api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
})

// 请求拦截器：token刷新时等待
knit_api.interceptors.request.use(
  async (config) => {
    if (config.url === '/api/refresh-token') {
      return config
    }
    if (refreshPromise) {
      // 如果正在刷新，等待刷新完成再继续
      await refreshPromise
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

async function refreshToken() {
  if (isRefreshing) return refreshPromise // 避免重复刷新

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await knit_api.post('/api/refresh-token')
      localStorage.setItem('expires_at', res.data.expires_at)
      localStorage.setItem('expires_seconds', res.data.expires_seconds)
      localStorage.setItem('user_name', res.data.user_name)
      // console.log('🔁 Token refreshed successfully.')
    } catch (error) {
      // console.error('❌ Token refresh failed:', error)
      stopTokenRefresher()
      throw error
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export function initTokenRefresher() {
  stopTokenRefresher()

  const expiresSeconds = parseInt(localStorage.getItem('expires_seconds'))
  const expiresAt = parseInt(localStorage.getItem('expires_at'))

  if (!expiresSeconds || !expiresAt) {
    // console.warn('⚠️ Cannot start token refresher: missing expiration.')
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
