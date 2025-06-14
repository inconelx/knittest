<template>
  <div class="container">
    <h1>用户列表</h1>
    <el-button type="primary" @click="addEmptyRow"> 新增一行 </el-button>
    <el-button
      type="danger"
      @click="deleteSelected"
      :disabled="!selectedRows.length && !selectedRows.length"
    >
      删除选中行
    </el-button>
    <!-- <el-button type="primary" @click="$router.push('/users/add')"> 新增用户 </el-button> -->
    <el-table :data="users" border style="width: 100%" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="60" />
      <el-table-column prop="id" label="ID" width="300" />

      <el-table-column label="用户名" width="300">
        <template #default="{ row }">
          <el-input
            v-model="row.name"
            @blur="onNameBlur(row)"
            placeholder="请输入用户名"
            size="small"
          />
        </template>
      </el-table-column>

      <el-table-column prop="add_time" label="录入时间" width="200">
        <template #default="{ row }">
          {{ formatDate(row.add_time) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'

const API_BASE = 'http://localhost:5000/api/users'
const DELETE_API = `${API_BASE}/delete`

const users = ref([])
const selectedRows = ref([])

const fetchUsers = async () => {
  const res = await axios.get(API_BASE)
  users.value = res.data.map((user) => ({
    ...user,
    originalName: user.name, // 用于判断是否变更
  }))
}

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

// 添加空行用于新增
const addEmptyRow = () => {
  users.value.push({
    id: null,
    name: '',
    originalName: '',
    add_time: '',
  })
}

// 失焦时处理：新增或更新
const onNameBlur = async (row) => {
  const trimmedName = row.name.trim()

  if (!trimmedName || trimmedName === row.originalName) return

  try {
    if (row.id === null) {
      // 新增
      await axios.post(API_BASE, { name: trimmedName })
      console.log('新增')
    } else {
      // 更新
      await axios.put(API_BASE, { id: row.id, name: trimmedName })
      console.log('更新')
    }

    await fetchUsers() // 刷新列表
  } catch (err) {
    console.error('保存失败:', err)
  }
}

// 格式化时间
const formatDate = (str) => {
  return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss') : ''
}

//删除勾选
const deleteSelected = async () => {
  const ids = selectedRows.value.map((row) => row.id).filter((id) => id != null)
  if (!ids.length) return

  try {
    await axios.post(DELETE_API, { ids })
    console.log('删除')
    selectedRows.value = []
    await fetchUsers()
  } catch (e) {
    console.error('删除失败:', e)
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style>
.container {
  width: 100%;
  height: 100%;
  margin: 0;
}
</style>
