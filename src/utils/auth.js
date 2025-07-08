// utils/auth.js
import axios from 'axios'
import router from '@/router/index.js'
import { ElMessageBox } from 'element-plus'

let refreshTimer = null // 全局唯一计时器引用
let isRefreshing = false
let refreshPromise = null

//针织api
export const knit_api = axios.create({
  // baseURL: 'https://192.168.0.104:5000',
  baseURL: 'http://localhost:5000',
  timeout: 5000,
})

// 请求拦截器：token刷新时等待
knit_api.interceptors.request.use(
  async (config) => {
    if (config.url !== '/api/refresh-token') {
      if (refreshPromise) {
        // 如果正在刷新，等待刷新完成再继续
        await refreshPromise
      }
    }
    const token = sessionStorage.getItem('token')
    if (token) {
      // 添加到请求头部的 Authorization 字段
      config.headers['Authorization'] = token
    }
    return config
  },
  (error) => Promise.reject(error),
)
// 响应拦截器：处理 token 失效等
knit_api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // console.warn('⛔ 登录状态失效，跳转登录页')
      const currentPath = router.currentRoute.value.path
      if (currentPath !== '/login' && currentPath !== '/') {
        try {
          // 等待用户关闭弹窗后再跳转
          await ElMessageBox.alert(
            '登录状态无效，可能有如下原因：1、您尚未登录；2、登录签名过期；3、有其它用户在别处使用同一账号登录，且超出账号登录数限制。请重新登录。',
            '提示',
            {
              confirmButtonText: '确定',
              type: 'warning',
              showClose: false,
              closeOnClickModal: false,
              closeOnPressEscape: false,
            },
          )
        } catch (_) {
          // 用户按 ESC 或点叉号也会触发 reject，可以忽略
        }
      }
      sessionStorage.clear()
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
      sessionStorage.setItem('token', res.data.token)
      sessionStorage.setItem('refresh_at', Math.floor(Date.now() / 1000))
      sessionStorage.setItem('expires_seconds', res.data.expires_seconds)
      sessionStorage.setItem('user_name', res.data.user_name)
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
  const expiresSeconds = parseInt(sessionStorage.getItem('expires_seconds'))
  const refreshAt = parseInt(sessionStorage.getItem('refresh_at'))

  if (!expiresSeconds || !refreshAt) {
    // console.warn('⚠️ Cannot start token refresher: missing expiration.')
    return
  }

  if (
    Math.floor(Date.now() / 1000) + Math.floor(expiresSeconds / 2) >=
    refreshAt + expiresSeconds
  ) {
    refreshToken()
    stopTokenRefresher()
  }

  if (refreshTimer === null) {
    refreshTimer = setInterval(
      async () => {
        refreshToken()
      },
      Math.max(Math.floor(expiresSeconds / 2), 60) * 1000,
    )
  }
}

export function stopTokenRefresher() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
    // console.log('⏹️ Token refresher stopped.')
  }
}
