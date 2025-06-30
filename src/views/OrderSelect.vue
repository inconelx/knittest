<template>
  <el-dialog v-model="visible" :title="titleName" width="75%" :close-on-click-modal="false">
    <div>
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button @click="handleSubmit(null, null)">设置清除</el-button>
      <el-button @click="visible = false">取消</el-button>
    </div>
    <div class="mt-4 flex justify-between items-center" label-width="auto">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="计划单号">
          <el-input v-model="searchForm.filters.order_no" style="width: 160px" />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.filters.order_cloth_name" style="width: 160px" />
        </el-form-item>
        <el-form-item label="产品颜色">
          <el-input v-model="searchForm.filters.order_cloth_color" style="width: 160px" />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.filters.company_name" style="width: 160px" />
        </el-form-item>
        <el-form-item label="客户简称">
          <el-input v-model="searchForm.filters.company_abbreviation" style="width: 160px" />
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
      <el-table-column
        type="index"
        :index="(index) => (pagination.page - 1) * pagination.pageSize + index + 1"
      />
      <el-table-column prop="order_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="80" show-overflow-tooltip>
        <template #default="scope">
          <el-button size="small" @click="handleSubmit(scope.row.order_id, scope.row.order_no)"
            >选取</el-button
          >
        </template>
      </el-table-column>
      <el-table-column prop="order_no" label="计划单号" width="160" show-overflow-tooltip />
      <el-table-column prop="order_cloth_name" label="产品名称" width="160" show-overflow-tooltip />
      <el-table-column
        prop="order_cloth_color"
        label="产品颜色"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="company_name" label="客户名称" width="160" show-overflow-tooltip />
      <el-table-column
        prop="company_abbreviation"
        label="客户简称"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="order_cloth_piece"
        label="计划匹数"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="order_cloth_weight"
        label="计划总重量"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="order_cloth_weight_price"
        label="产品单价"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="add_time" label="录入时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatDate(row.add_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" width="320" show-overflow-tooltip />
    </el-table>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const tableRef = ref(null)
const tableHeight = ref(null)

const loading = ref(false)
const gridData = ref([])

const visible = ref(false)

const searchForm = ref({
  filters: {
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    company_name: null,
    company_abbreviation: null,
  },
  fuzzy_fields: {
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    company_name: null,
    company_abbreviation: null,
  },
  date_ranges: {
    add_time: [],
  },
})

const pagination = ref({
  page: 1,
  pageSize: 100,
  total: 0,
})

const emit = defineEmits(['success'])

const titleName = '计划单选取'

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
    const res = await knit_api.post('/api/order/query', {
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

const handlePageChange = (newPage) => {
  pagination.value.page = newPage
  fetchGrid()
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
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

const open = async () => {
  resetSearch()
  visible.value = true
  fetchGrid()
}

const handleSubmit = (select_id, select_label) => {
  try {
    visible.value = false
    emit('success', select_id, select_label) // 通知父组件刷新列表等
  } catch (err) {
    ElMessage.error('保存失败：' + (err.response?.data?.error || err.message))
    console.error(err)
  }
}

defineExpose({ open })
</script>
