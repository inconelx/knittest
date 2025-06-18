<template>
  <div class="p-4">
    <div class="mb-4 flex justify-between items-center">
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增公司</el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>

    <div class="mt-4 flex justify-between items-center">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="公司名称">
          <el-input v-model="searchForm.filters.company_name" />
        </el-form-item>

        <el-form-item label="公司简称">
          <el-input v-model="searchForm.filters.company_abbreviation" />
        </el-form-item>

        <el-form-item label="公司类型">
          <el-select
            v-model="searchForm.filters.company_type"
            placeholder="请选择公司类型"
            style="width: 150px"
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

    <div class="mt-4 flex justify-end">
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
      <el-table-column prop="company_id" label="ID" width="160" />
      <el-table-column prop="company_name" label="公司名称" />
      <el-table-column prop="company_type" label="公司类型" :formatter="formatCompanyType" />
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
      <el-table-column prop="company_abbreviation" label="简称" />
      <el-table-column prop="note" label="备注" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row.company_id)">编辑</el-button>
          <el-button size="small" @click="openDialog('copy', scope.row.company_id)">复制</el-button>
        </template>
      </el-table-column>
    </el-table>
    <CompanyDialog ref="dialogRef" @success="fetchGrid" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import CompanyDialog from './CompanyDialog.vue'

dayjs.extend(utc)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()

const companyTypeMap = ref({})
const companyTypeOptions = ref([])

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

const searchForm = ref({
  filters: {
    company_name: null,
    company_type: null,
    company_abbreviation: null,
  },
  dateRange: [], // ['2025-06-01', '2025-06-18']
})

const fuzzyFields = new Set(['company_name', 'company_abbreviation'])

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
    const res = await knit_api.post('/api/company/query', {
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
    console.error('公司类型加载失败', err)
  }
}

const openDialog = (action, id = null) => {
  dialogRef.value.open(action, id)
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const formatCompanyType = (row) => {
  return companyTypeMap.value[row.company_type] || row.company_type || '-'
}

const handlePageChange = (newPage) => {
  pagination.value.page = newPage
  fetchGrid()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.company_id)
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的公司吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/delete', {
      table_name: 'knit_company',
      pk_name: 'company_id',
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
