<template>
  <el-container style="height: 100%">
    <!-- <el-aside style="width: 160px">
      <el-menu default-active="$route.path" router>
        <el-menu-item index="/companies">公司管理</el-menu-item>
        <el-menu-item index="/machines">机台管理</el-menu-item>
        <el-menu-item index="/orders">计划单管理</el-menu-item>
        <el-menu-item index="/clothes">布匹管理</el-menu-item>
        <el-menu-item index="/deliveries">出货单管理</el-menu-item>
      </el-menu>
    </el-aside> -->

    <el-container style="height: 100%">
      <el-header class="top-header">
        <div class="left-content">
          <el-dropdown @command="handleMenuClick">
            <span class="el-dropdown-link">
              页面选择<el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="item in routeOptions"
                  :key="item.path"
                  :command="item.path"
                >
                  {{ item.meta.title || '' }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span>{{ currentPageTitle }}</span>
        </div>

        <div class="right-content">
          <span>当前用户：{{ userName }}</span>
          <el-button type="danger" size="small" @click="logout">退出登录</el-button>
          <el-button @click="testPrint">测试打印</el-button>
        </div>
      </el-header>
      <el-main style="height: 100%">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { stopTokenRefresher, knit_api } from '@/utils/auth.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'

const userName = ref('')
const router = useRouter()
const route = useRoute()
const routeOptions = computed(() => router.getRoutes().filter((r) => r.meta?.title))
const currentPageTitle = computed(() => route.meta.title || '未命名页面')

// 页面加载时获取本地用户信息
onMounted(() => {
  const local_user_name = localStorage.getItem('user_name')
  if (local_user_name) {
    userName.value = local_user_name
  }
})

const handleMenuClick = (command) => {
  router.push(`${command}`)
}

// 退出登录逻辑
const logout = async () => {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    type: 'warning',
  })
  await knit_api.post('/api/logout')
  stopTokenRefresher()
  router.push('/login')
}

const testPrint = async () => {
  await knit_api.post('/api/send-print', {
    print_label: 'knit_cloth_print',
    print_param: 'CLTH-250706-0001',
  })
}
</script>
<style scoped>
.top-header {
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid #dcdfe6;
}
.el-menu-item {
  margin: 4px;
  border: 1px solid #dcdfe6;
}
.left-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-right: 20px;
}
.right-content {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
}
</style>
