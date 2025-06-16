<template>
  <div class="p-4">
    <div class="mb-4 flex justify-between items-center">
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增机台</el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>

    <div class="mt-4 flex justify-end" style="margin: 8px 16px 8px 0">
      <el-pagination
        background
        layout="prev, pager, next, total"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        @current-change="handlePageChange"
      />
    </div>

    <el-table
      v-loading="loading"
      :data="gridData"
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column prop="machine_id" label="ID" width="160" />
      <el-table-column prop="machine_name" label="机台号" />
      <el-table-column prop="machine_order" label="生产计划单号" width="160" />
      <el-table-column prop="add_time" label="录入时间">
        <template #default="{ row }">
          {{ formatDate(row.add_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="edit_time" label="最后修改时间">
        <template #default="{ row }">
          {{ formatDate(row.edit_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row.company_id)">编辑</el-button>
          <el-button size="small" @click="openDialog('copy', scope.row.company_id)">复制</el-button>
        </template>
      </el-table-column>
    </el-table>
    <MachineDialog ref="dialogRef" @success="fetchGrid" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import MachineDialog from './MachineDialog.vue'


dayjs.extend(utc)

const router = useRouter()
const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

const fetchGrid = async () => {
  loading.value = true
  try {
    const res = await knit_api.post('/api/machine/query', {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      filters: {}, // 可扩展
    })
    gridData.value = res.data.records
    pagination.value.total = res.data.total
  } catch (err) {
    ElMessage.error('加载失败')
    // console.error(err)
  } finally {
    loading.value = false
  }
}

const openDialog = (action, id = null) => {
  dialogRef.value.open(action, id)
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const handlePageChange = (newPage) => {
  pagination.value.page = newPage
  fetchGrid()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.machine_id)
}

const editMachine = (id) => {
  // router.push(`/companies/edit/${id}`)
}

const copyMachine = (id) => {
  // router.push(`/companies/copy/${id}`)
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的机台吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/delete', {
      table_name: 'knit_machine',
      pk_name: 'machine_id',
      pk_values: selectedIds.value,
    })
    ElMessage.success(res.data.message || '删除成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}

onMounted(() => {
  fetchGrid()
})
</script>

<style scoped>
.el-table {
  border: 1px solid #dcdfe6;
}
</style>
