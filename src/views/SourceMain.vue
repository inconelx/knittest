<template>
  <el-container style="height: 100%">
    <el-aside style="width: 160px">
      <el-menu default-active="$route.path" router>
        <el-menu-item index="/companies">公司管理</el-menu-item>
        <el-menu-item index="/machines">机台管理</el-menu-item>
        <el-menu-item index="/orders">计划单管理</el-menu-item>
        <el-menu-item index="/clothes">布匹管理</el-menu-item>
        <el-menu-item index="/deliveries">出货单管理</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container style="height: 100%">
      <el-header class="top-header">
        <div class="top-bar-content">
          <span>当前用户：{{ userName }}</span>
          <el-button type="danger" size="small" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main style="height: 100%">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { stopTokenRefresher } from '@/utils/auth.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const userName = ref('')
const router = useRouter()

// 页面加载时获取本地用户信息
onMounted(() => {
  const local_user_name = localStorage.getItem('user_name')
  if (local_user_name) {
    userName.value = local_user_name
  }
})

// 退出登录逻辑
const logout = async () => {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    type: 'warning',
  })
  localStorage.removeItem('token')
  router.push('/login')
  stopTokenRefresher()
}
</script>
<style scoped>
.top-header {
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-bottom: 1px solid #dcdfe6;
}
.el-menu-item {
  margin: 4px;
  border: 1px solid #dcdfe6;
}
.top-bar-content {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
}
</style>
