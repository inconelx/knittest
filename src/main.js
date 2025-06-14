import './assets/main.css'
import './assets/el_global.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import axios from 'axios'
import { initTokenRefresher } from '@/utils/auth.js'
import { createApp } from 'vue'
import App from './App.vue'

localStorage.removeItem('token')

createApp(App).use(router).use(ElementPlus).mount('#app')
