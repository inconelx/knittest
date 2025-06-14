// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import UserList from '@/views/UserList.vue'
import Login from '@/views/Login.vue'
import SourceMain from '@/views/SourceMain.vue'
import CompanyList from '@/views/CompanyList.vue'
import EditCompany from '@/views/EditCompany.vue'

const routes = [
  { path: '/login', component: Login },
  {
    path: '/',
    component: SourceMain,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/companies' }, // 默认显示
      { path: '/users', component: UserList },

      { path: '/companies', component: CompanyList },
      {
        path: '/companies/copy/:id',
        name: 'CopyCompany',
        component: EditCompany,
        props: true,
      },
      {
        path: '/companies/add',
        name: 'AddCompany',
        component: EditCompany,
        props: true,
      },
      {
        path: '/companies/edit/:id',
        name: 'EditCompany',
        component: EditCompany,
        props: true,
      },
      // 其他子页面...
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫（保持和之前一样）
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) return next('/login')
    try {
      const res = await fetch('http://localhost:5000/api/check-login', {
        headers: { Authorization: token },
      })
      const data = await res.json()
      if (data.logged_in) next()
      else next('/login')
    } catch {
      next('/login')
    }
  } else {
    next()
  }
})

export default router
