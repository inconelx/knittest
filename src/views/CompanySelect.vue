<template>
  <el-dialog v-model="visible" :title="titleName" width="75%" :close-on-click-modal="false">
    <div>
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button @click="handleSubmit(null, null)">设置清除</el-button>
      <el-button @click="visible = false">取消</el-button>
    </div>
    <div>
      <el-form :inline="true" :model="searchForm" label-width="auto">
        <el-form-item label="公司名称">
          <el-input v-model="searchForm.filters.company_name" style="width: 160px" />
        </el-form-item>

        <el-form-item label="公司简称">
          <el-input v-model="searchForm.filters.company_abbreviation" style="width: 160px" />
        </el-form-item>

        <el-form-item label="公司类型">
          <el-select
            v-model="searchForm.filters.company_type"
            placeholder="请选择公司类型"
            style="width: 160px"
            clearable
          >
            <el-option
              v-for="item in companyTypeOptions"
              :key="item.table_field_value"
              :label="item.table_field_label"
              :value="item.table_field_value"
            />
          </el-select>
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

    <el-table v-loading="loading" :data="gridData" border style="width: 100%" scrollbar-always>
      <el-table-column
        type="index"
        :index="(index) => (pagination.page - 1) * pagination.pageSize + index + 1"
      />
      <el-table-column prop="company_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="80" show-overflow-tooltip>
        <template #default="scope">
          <el-button
            size="small"
            @click="handleSubmit(scope.row.company_id, scope.row.company_abbreviation)"
            >选取</el-button
          >
        </template>
      </el-table-column>
      <el-table-column prop="company_name" label="公司名称" width="160" show-overflow-tooltip />
      <el-table-column prop="company_abbreviation" label="简称" width="160" show-overflow-tooltip />
      <el-table-column
        prop="company_type"
        label="公司类型"
        :formatter="formatCompanyType"
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
import { ref } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const loading = ref(false)
const gridData = ref([])

const visible = ref(false)

const searchForm = ref({
  filters: {
    company_name: null,
    company_type: null,
    company_abbreviation: null,
  },
  fuzzy_fields: {
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

const titleName = '公司选取'

const companyTypeMap = ref({})
const companyTypeOptions = ref([])

const fetchGrid = async () => {
  loading.value = true
  gridData.value = null
  const rawFilters = {}

  await fetchCompanyType()

  for (const key in searchForm.value.filters) {
    const value = searchForm.value.filters[key]
    if (value !== null && value !== undefined && value !== '') {
      rawFilters[key] = value
    }
  }

  try {
    const res = await knit_api.post('/api/company/query', {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      filters: rawFilters,
      fuzzy_fields: searchForm.value.fuzzy_fields,
      date_ranges: searchForm.value.date_ranges,
    })
    gridData.value = res.data.records
    pagination.value.total = res.data.total
  } catch (err) {
    ElMessage.error('加载失败：' + (err.response?.data?.err || err.message))
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (newPage) => {
  pagination.value.page = newPage
  fetchGrid()
}

const fetchCompanyType = async () => {
  try {
    const res = await knit_api.get('/api/combobox', {
      params: {
        table_name: 'knit_company',
        table_field_name: 'company_type',
      },
    })
    companyTypeOptions.value = res.data
    companyTypeMap.value = Object.fromEntries(
      res.data.map((item) => [item.table_field_value, item.table_field_label]),
    )
  } catch (err) {
    ElMessage.error('公司类型加载失败：' + (err.response?.data?.err || err.message))
    console.error(err)
  }
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const formatCompanyType = (row) => {
  return companyTypeMap.value[row.company_type] || row.company_type || '-'
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
    ElMessage.error('获取失败：' + (err.response?.data?.err || err.message))
    console.error(err)
  }
}

defineExpose({ open })
</script>
