<template>
  <div class="view_main">
    <div>
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增布匹</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button type="primary" :disabled="selectedIds.length === 0" @click="openOrderSelect">
        勾选设置计划单
      </el-button>
      <el-button type="primary" :disabled="selectedIds.length === 0" @click="openCorrectAddInput">
        勾选设置重量修正
      </el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>
    <div>
      <el-form :inline="true" :model="searchForm" label-width="auto">
        <el-form-item label="布匹ID">
          <el-input v-model="searchForm.filters.cloth_id" style="width: 160px" />
        </el-form-item>

        <el-form-item label="机台号">
          <el-input v-model="searchForm.filters.machine_name" style="width: 160px" />
        </el-form-item>

        <el-form-item label="录入账号">
          <el-input v-model="searchForm.filters.add_user_name" style="width: 160px" />
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
    <div>
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
      ref="tableRef"
      v-loading="loading"
      :data="gridData"
      border
      style="width: 100%"
      :max-height="tableHeight"
      @selection-change="handleSelectionChange"
      scrollbar-always
    >
      <el-table-column type="selection" />
      <el-table-column
        type="index"
        :label="`${selectedIds.length}`"
        :index="(index) => (pagination.page - 1) * pagination.pageSize + index + 1"
      />
      <el-table-column prop="cloth_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="80" show-overflow-tooltip>
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row.cloth_id)">编辑</el-button>
          <!-- <el-button size="small" @click="openDialog('copy', scope.row.cloth_id)">复制</el-button> -->
        </template>
      </el-table-column>
      <el-table-column prop="machine_name" label="机台号" width="160" show-overflow-tooltip />
      <el-table-column prop="add_user_name" label="录入账号" width="160" show-overflow-tooltip />
      <el-table-column prop="add_time" label="录入时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatDate(row.add_time) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="cloth_calculate_weight"
        label="计算重量"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="delivery_status"
        label="出货状态"
        :formatter="formatDeliveryStatus"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="order_no" label="产品计划单号" width="160" show-overflow-tooltip />
      <el-table-column prop="order_cloth_name" label="产品名称" width="160" show-overflow-tooltip />
      <el-table-column
        prop="order_cloth_color"
        label="产品颜色"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="delivery_no" label="出货单号" width="160" show-overflow-tooltip />
      <el-table-column prop="delivery_time" label="出货时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatDate(row.delivery_time) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="cloth_origin_weight"
        label="原始重量"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="cloth_weight_correct"
        label="重量修正"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="order_cloth_add" label="空加" width="160" show-overflow-tooltip />

      <el-table-column prop="edit_time" label="最后修改时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatDate(row.edit_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" width="320" show-overflow-tooltip />
    </el-table>
    <ClothDialog ref="dialogRef" @success="fetchGrid" />
    <OrderSelect ref="orderSelectRef" @success="handleDialogSetOrder" />
    <DecimalDialog ref="correctDialogRef" :title="'重量修正设置'" @success="weightCorrectSet" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import ClothDialog from './ClothDialog.vue'
import OrderSelect from './OrderSelect.vue'
import DecimalDialog from '@/components/DecimalDialog.vue'

dayjs.extend(utc)

const tableRef = ref(null)
const tableHeight = ref(null)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()
const correctDialogRef = ref()
const orderSelectRef = ref()

const pagination = ref({
  page: 1,
  pageSize: 100,
  total: 0,
})

const searchForm = ref({
  filters: {
    cloth_id: null,
    machine_name: null,
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    delivery_status: null,
    delivery_no: null,
    add_user_name: null,
  },
  fuzzy_fields: {
    cloth_id: null,
    machine_name: null,
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    delivery_no: null,
  },
  date_ranges: {
    add_time: [],
    delivery_time: [],
  },
})

const deliveryStatusMap = ref({ 0: '未出货', 1: '已出货' })
const deliveryStatusOptions = ref([
  { statusValue: false, statusLabel: '未出货' },
  { statusValue: true, statusLabel: '已出货' },
])

const handleDialogSetOrder = async (submit_id, submit_label) => {
  try {
    await ElMessageBox.confirm('确定要设置关联计划单为 ' + submit_label + ' 吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update_batch', {
      table_name: 'knit_cloth',
      pk_name: 'cloth_id',
      pk_values: selectedIds.value,
      json_data: {
        cloth_order_id: submit_id,
      },
    })
    ElMessage.success(res.data.message || '设置成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('设置失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }
}

const weightCorrectSet = async (submit_num) => {
  try {
    await ElMessageBox.confirm('确定要设置重量修正为 ' + submit_num + ' 吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update_batch', {
      table_name: 'knit_cloth',
      pk_name: 'cloth_id',
      pk_values: selectedIds.value,
      json_data: {
        cloth_weight_correct: submit_num,
      },
    })
    ElMessage.success(res.data.message || '设置成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('设置失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }
}

const tableHeightSet = async () => {
  await nextTick()
  const tableElement = tableRef.value.$el
  if (!tableElement) return

  const header = tableElement.querySelector('.el-table__header-wrapper')
  const row = tableElement.querySelector('.el-table__row')

  if (header && row) {
    const headerHeight = header.offsetHeight
    const rowHeight = row.offsetHeight
    tableHeight.value = headerHeight + rowHeight * 10
  }
}

const fetchGrid = async () => {
  loading.value = true
  gridData.value = null
  const rawFilters = {}

  for (const key in searchForm.value.filters) {
    const value = searchForm.value.filters[key]
    if (value !== null && value !== undefined && value !== '') {
      rawFilters[key] = value
    }
  }

  try {
    const res = await knit_api.post('/api/cloth/query', {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      filters: rawFilters,
      fuzzy_fields: searchForm.value.fuzzy_fields,
      date_ranges: searchForm.value.date_ranges,
    })
    gridData.value = res.data.records
    pagination.value.total = res.data.total
    tableHeightSet()
  } catch (err) {
    ElMessage.error('加载失败：' + (err.response?.data?.error || err.message))
    console.error(err)
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

const openCorrectAddInput = () => {
  correctDialogRef.value.open()
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const formatDeliveryStatus = (row) => {
  return deliveryStatusMap.value[row.delivery_status] || row.delivery_status || '-'
}

const handlePageChange = (newPage) => {
  pagination.value.page = newPage
  fetchGrid()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.cloth_id)
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的布匹吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/delete', {
      table_name: 'knit_cloth',
      pk_name: 'cloth_id',
      pk_values: selectedIds.value,
    })
    ElMessage.success(res.data.message || '删除成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败：' + (err.response?.data?.error || err.message))
      console.error(err)
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
