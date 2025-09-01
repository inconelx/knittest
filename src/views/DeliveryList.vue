<template>
  <div class="view_main">
    <div>
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增出货单</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button type="primary" :disabled="selectedIds.length === 0" @click="openCompanySelect">
        勾选设置公司
      </el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>

    <div>
      <el-form :inline="true" :model="searchForm" label-width="auto">
        <el-form-item label="出货单号">
          <el-input v-model="searchForm.filters.delivery_no" style="width: 160px" />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.filters.company_name" style="width: 160px" />
        </el-form-item>
        <el-form-item label="客户简称">
          <el-input v-model="searchForm.filters.company_abbreviation" style="width: 160px" />
        </el-form-item>

        <el-form-item label="出货时间">
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
      <el-table-column prop="delivery_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="320" show-overflow-tooltip>
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row.delivery_id)"
            >信息编辑</el-button
          >
          <el-button size="small" @click="openDeliveryClothEdit(scope.row.delivery_id)"
            >出货布匹设置</el-button
          >
          <el-button size="small" @click="printDelivery(scope.row.delivery_id)">打印码单</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="delivery_no" label="出货单号" width="160" show-overflow-tooltip />
      <el-table-column prop="company_name" label="客户名称" width="160" show-overflow-tooltip />
      <el-table-column
        prop="company_abbreviation"
        label="客户简称"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="delivery_piece" label="出货总匹数" width="160" show-overflow-tooltip />
      <el-table-column
        prop="delivery_weight"
        label="出货总重量"
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
    <DeliveryDialog ref="dialogRef" @success="fetchGrid" />
    <CompanySelect ref="companySelectRef" @success="handleDialogSetCompany" />
    <DeliveryClothEdit ref="deliveryClothEditRef" @close="fetchGrid" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import DeliveryDialog from './DeliveryDialog.vue'
import DeliveryClothEdit from './DeliveryClothEdit.vue'
import CompanySelect from './CompanySelect.vue'
import DecimalDialog from '@/components/DecimalDialog.vue'

dayjs.extend(utc)

const tableRef = ref(null)
const tableHeight = ref(null)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()
const companySelectRef = ref()
const deliveryClothEditRef = ref()

const pagination = ref({
  page: 1,
  pageSize: 100,
  total: 0,
})

const searchForm = ref({
  filters: {
    delivery_no: null,
    company_name: null,
    company_abbreviation: null,
  },
  fuzzy_fields: {
    delivery_no: null,
    company_name: null,
    company_abbreviation: null,
  },
  date_ranges: {
    add_time: [],
  },
})

const printDelivery = async (delivery_id) => {
  try {
    await knit_api.post('/api/send-print', {
      print_label: 'knit_delivery_print',
      print_param: delivery_id,
    })
    ElMessage.success('发送打印成功')
  } catch (err) {
    ElMessage.error('发送打印失败：' + (err.response?.data?.error || err.message))
    console.error(err)
  }
}

const handleDialogSetCompany = async (submit_id, submit_label) => {
  try {
    await ElMessageBox.confirm('确定要设置关联公司为 ' + submit_label + ' 吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update', {
      table_name: 'knit_delivery',
      pk_values: selectedIds.value,
      json_data: {
        delivery_company_id: submit_id,
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
    const res = await knit_api.post('/api/delivery/query', {
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

const openDeliveryClothEdit = (action, id = null) => {
  deliveryClothEditRef.value.open(action, id)
}

const openCompanySelect = () => {
  companySelectRef.value.open()
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
  selectedIds.value = selection.map((item) => item.delivery_id)
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的出货单吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/delete', {
      table_name: 'knit_delivery',
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
