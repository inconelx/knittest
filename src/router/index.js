// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import UserList from '@/views/UserList.vue'
import Login from '@/views/Login.vue'
import SourceMain from '@/views/SourceMain.vue'
import CompanyList from '@/views/CompanyList.vue'
import MachineList from '@/views/MachineList.vue'
import OrderList from '@/views/OrderList.vue'
import ClothList from '@/views/ClothList.vue'
import EmployeeClothList from '@/views/EmployeeClothList.vue'
import DeliveryList from '@/views/DeliveryList.vue'
import { initTokenRefresher, knit_api, stopTokenRefresher } from '@/utils/auth.js'
import axios from 'axios'
import Home from '@/views/Home.vue'

const routes = [
  { path: '/login', component: Login },
  {
    path: '/',
    component: SourceMain,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/home' }, // 默认显示
      // { path: '/users', component: UserList },
      {
        path: '/home',
        component: Home,
        meta: {
          title: '主页',
          admin_only: false,
        },
      },
      {
        path: '/companies',
        component: CompanyList,
        meta: {
          title: '公司管理',
          admin_only: true,
        },
      },
      {
        path: '/machines',
        component: MachineList,
        meta: {
          title: '机台管理',
          admin_only: true,
        },
      },
      {
        path: '/orders',
        component: OrderList,
        meta: {
          title: '计划单管理',
          admin_only: true,
        },
      },
      {
        path: '/clothes',
        component: ClothList,
        meta: {
          title: '布匹管理',
          admin_only: true,
        },
      },
      {
        path: '/emloyeeclothes',
        component: EmployeeClothList,
        meta: {
          title: '员工布匹录入',
          admin_only: false,
        },
      },
      {
        path: '/deliveries',
        component: DeliveryList,
        meta: {
          title: '出货单管理',
          admin_only: true,
        },
      },
      {
        path: '/users',
        component: UserList,
        meta: {
          title: '用户管理',
          admin_only: true,
        },
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
    try {
      const res = await knit_api.get('/api/check-login')
      if (res.data.logged_in) {
        initTokenRefresher()
        next()
      } else {
        stopTokenRefresher()
        next('/login')
      }
    } catch {
      stopTokenRefresher()
      next('/login')
    }
  } else {
    next()
  }
})

export default router
