<template>
  <div class="view_main">
    <div>
      <DebounceButton type="primary" :on-click="() => fetchGrid()">刷新</DebounceButton>
      <DebounceButton type="primary" :on-click="() => openDialog('add')">新增计划单</DebounceButton>
      <DebounceButton type="primary" :on-click="() => resetSearch()">重置筛选</DebounceButton>
      <DebounceButton
        type="primary"
        :disabled="selectedIds.length === 0"
        :on-click="() => openCompanySelect()"
      >
        勾选设置公司
      </DebounceButton>
      <DebounceButton
        type="primary"
        :disabled="selectedIds.length === 0"
        :on-click="() => openWeightAddInput()"
      >
        勾选设置空加
      </DebounceButton>
      <DebounceButton
        type="danger"
        :disabled="selectedIds.length === 0"
        :on-click="() => deleteSelected()"
      >
        删除勾选
      </DebounceButton>
    </div>

    <div>
      <el-form :inline="true" :model="searchForm" label-width="auto">
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
            :editable="false"
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
      <el-table-column prop="order_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="160" show-overflow-tooltip>
        <template #default="scope">
          <DebounceButton size="small" :on-click="() => openDialog('edit', scope.row.order_id)"
            >编辑</DebounceButton
          >
          <DebounceButton size="small" :on-click="() => openDialog('copy', scope.row.order_id)"
            >复制</DebounceButton
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
      <el-table-column prop="order_cloth_add" label="空加" width="160" show-overflow-tooltip />
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
      <el-table-column prop="edit_time" label="最后修改时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatDate(row.edit_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" width="320" show-overflow-tooltip />
    </el-table>
    <OrderDialog ref="dialogRef" @success="fetchGrid" />
    <CompanySelect ref="companySelectRef" @success="handleDialogSetCompany" />
    <DecimalDialog ref="addDialogRef" :title="'空加设置'" @success="weightAddSet" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import OrderDialog from './OrderDialog.vue'
import CompanySelect from './CompanySelect.vue'
import DecimalDialog from '@/components/DecimalDialog.vue'
import DebounceButton from '@/components/DebounceButton.vue'

dayjs.extend(utc)

const tableRef = ref(null)
const tableHeight = ref(null)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()
const addDialogRef = ref()
const companySelectRef = ref()

const pagination = ref({
  page: 1,
  pageSize: 100,
  total: 0,
})

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

const handleDialogSetCompany = async (submit_id, submit_label) => {
  try {
    await ElMessageBox.confirm('确定要设置关联公司为 ' + submit_label + ' 吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update', {
      table_name: 'knit_order',
      pk_values: selectedIds.value,
      json_data: {
        order_custom_company_id: submit_id,
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

const weightAddSet = async (submit_num) => {
  try {
    await ElMessageBox.confirm('确定要设置空加为 ' + submit_num + ' 吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update', {
      table_name: 'knit_order',
      pk_values: selectedIds.value,
      json_data: {
        order_cloth_add: submit_num,
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

const openDialog = (action, id = null) => {
  dialogRef.value.open(action, id)
}

const openCompanySelect = () => {
  companySelectRef.value.open()
}

const openWeightAddInput = () => {
  addDialogRef.value.open()
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
  selectedIds.value = selection.map((item) => item.order_id)
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的计划单吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/delete', {
      table_name: 'knit_order',
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
