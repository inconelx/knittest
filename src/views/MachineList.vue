<template>
  <div class="p-4">
    <div class="mb-4 flex justify-between items-center">
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增机台</el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>
    <div class="mt-4 flex justify-between items-center">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="机台号">
          <el-input v-model="searchForm.filters.machine_name" />
        </el-form-item>

        <el-form-item label="录入时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
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
          <el-button size="small" @click="openDialog('edit', scope.row.machine_id)">编辑</el-button>
          <el-button size="small" @click="openDialog('copy', scope.row.machine_id)">复制</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import MachineDialog from './MachineDialog.vue'


dayjs.extend(utc)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

const searchForm = ref({
  filters: {
    machine_name: null,
  },
  dateRange: [], // ['2025-06-01', '2025-06-18']
})

const fuzzyFields = new Set(['machine_name'])

const fetchGrid = async () => {
  loading.value = true
  const rawFilters = {}
  const rawDateRange = {}

  for (const key in searchForm.value.filters) {
    const value = searchForm.value.filters[key]
    if (value !== null && value !== undefined && value !== '') {
      rawFilters[key] = fuzzyFields.has(key) ? `%${value}%` : value
    }
  }

  const [begDate, endDate] = searchForm.value.dateRange || []
  if (begDate) rawDateRange['beg_date'] = begDate
  if (endDate) rawDateRange['end_date'] = endDate

  try {
    const res = await knit_api.post('/api/machine/query', {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      filters: rawFilters,
      date_range: rawDateRange,
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

const resetSearch = () => {
  for (const key in searchForm.value.filters) {
    searchForm.value.filters[key] = ''
  }
  searchForm.value.dateRange = []
}

onMounted(() => {
  fetchGrid()
})
</script>

<style scoped>
.el-table {
  border: 1px solid #dcdfe6;
}
.el-form-item {
  margin-bottom: 0px;
}
</style>
