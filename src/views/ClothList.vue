<template>
  <div class="p-4">
    <div class="mb-4 flex justify-between items-center">
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增布匹</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button type="primary" :disabled="selectedIds.length === 0" @click="openOrderSelect">
        设置计划单
      </el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>
    <div class="mt-4 flex justify-between items-center">
      <el-form :inline="true" :model="searchForm" label-width="auto">
        <el-form-item label="机台号">
          <el-input v-model="searchForm.filters.machine_name" style="width: 160px" />
        </el-form-item>

        <el-form-item label="计划单号">
          <el-input v-model="searchForm.filters.order_no" style="width: 160px" />
        </el-form-item>

        <el-form-item label="产品名称">
          <el-input v-model="searchForm.filters.order_cloth_name" style="width: 160px" />
        </el-form-item>

        <el-form-item label="产品颜色">
          <el-input v-model="searchForm.filters.order_cloth_color" style="width: 160px" />
        </el-form-item>

        <el-form-item label="录入时间">
          <el-date-picker
            v-model="searchForm.date_ranges.add_time"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="出货状态">
          <el-select
            v-model="searchForm.filters.delivery_status"
            placeholder="请选择出货状态"
            style="width: 160px"
            clearable
          >
            <el-option
              v-for="item in deliveryStatusOptions"
              :key="item.statusValue"
              :label="item.statusLabel"
              :value="item.statusValue"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="出货单号">
          <el-input v-model="searchForm.filters.delivery_no" style="width: 160px" />
        </el-form-item>

        <el-form-item label="出货时间">
          <el-date-picker
            v-model="searchForm.date_ranges.delivery_time"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY/MM/DD"
            value-format="YYYY-MM-DD"
          />
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
      scrollbar-always
    >
      <el-table-column type="selection" width="40" />
      <el-table-column prop="cloth_id" label="ID" width="160" />
      <el-table-column label="操作" width="160">
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row.cloth_id)">编辑</el-button>
          <el-button size="small" @click="openDialog('copy', scope.row.cloth_id)">复制</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="machine_name" label="机台号" width="160" />
      <el-table-column prop="cloth_calculate_weight" label="计算重量" width="160" />
      <el-table-column
        prop="delivery_status"
        label="出货状态"
        :formatter="formatdeliveryStatus"
        width="160"
      />
      <el-table-column prop="delivery_no" label="出货单号" width="160" />
      <el-table-column prop="delivery_time" label="出货时间" width="160" />
      <el-table-column prop="add_user_name" label="录入账户" width="160" />
      <el-table-column prop="add_time" label="录入时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.add_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="order_no" label="产品计划单号" width="160" />
      <el-table-column prop="order_cloth_name" label="产品名称" width="160" />
      <el-table-column prop="order_cloth_color" label="产品颜色" width="160" />
      <el-table-column prop="cloth_origin_weight" label="原始重量" width="160" />
      <el-table-column prop="cloth_weight_correct" label="重量修正" width="160" />
      <el-table-column prop="order_cloth_add" label="空加" width="160" />

      <el-table-column prop="edit_time" label="最后修改时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.edit_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" width="320" />
    </el-table>
    <MachineDialog ref="dialogRef" @success="fetchGrid" />
    <OrderSelect ref="orderSelectRef" @success="handleDialogSetOrder" />
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
import OrderSelect from './OrderSelect.vue'

dayjs.extend(utc)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()
const orderSelectRef = ref()

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

const searchForm = ref({
  filters: {
    machine_name: null,
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    delivery_status: null,
    delivery_no: null,
  },
  date_ranges: {
    add_time: [],
    delivery_time: []
  },
})
const fuzzyFields = new Set(['machine_name', 'order_no', 'order_cloth_name', 'order_cloth_color', 'delivery_no'])

const deliveryStatusMap = ref({ 0: '未出货', 1: '已出货' })
const deliveryStatusOptions = ref([
  { statusValue: 0, statusLabel: '未出货' },
  { statusValue: 1, statusLabel: '已出货' },
])

const handleDialogSetOrder = async (submitId) => {
  try {
    const res = await knit_api.post('/api/generic/update_batch', {
      table_name: 'knit_machine',
      pk_name: 'machine_id',
      pk_values: selectedIds.value,
      json_data: {
        machine_order_id: submitId,
      },
    })
    ElMessage.success(res.data.message || '设置成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.error || '设置公司失败')
    }
  }
}

const fetchGrid = async () => {
  loading.value = true
  const rawFilters = {}

  for (const key in searchForm.value.filters) {
    const value = searchForm.value.filters[key]
    if (value !== null && value !== undefined && value !== '') {
      rawFilters[key] = fuzzyFields.has(key) ? `%${value}%` : value
    }
  }

  try {
    const res = await knit_api.post('/api/cloth/query', {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      filters: rawFilters,
      date_range: searchForm.value.date_ranges,
    })
    gridData.value = res.data.records
    pagination.value.total = res.data.total
  } catch (err) {
    // ElMessage.error('加载失败')
    ElMessage.error('保存失败：' + (err.response?.data?.error || err.message))
    // console.error(err)
  } finally {
    loading.value = false
  }
}

const openDialog = (action, id = null) => {
  dialogRef.value.open(action, id)
}

const openOrderSelect = () => {
  orderSelectRef.value.open()
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const formatdeliveryStatus = (row) => {
  return deliveryStatusMap.value[row.delivery_status] || row.delivery_status || '-'
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
    searchForm.value.filters[key] = null
  }
  for (const key in searchForm.value.date_ranges) {
    searchForm.value.date_ranges[key] = []
  }
  fetchGrid()
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
