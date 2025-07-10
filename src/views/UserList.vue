<template>
  <div class="view_main">
    <div>
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="openDialog('add')">新增用户</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button
        type="primary"
        :disabled="selectedIds.length === 0"
        @click="batchUserSet({ print_allowed: false }, '禁用打印')"
      >
        勾选禁用打印
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedIds.length === 0"
        @click="batchUserSet({ print_allowed: true }, '启用打印')"
      >
        勾选允许打印
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedIds.length === 0"
        @click="batchUserSet({ print_allowed: false }, '封禁')"
      >
        勾选封禁
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedIds.length === 0"
        @click="batchUserSet({ print_allowed: true }, '解封')"
      >
        勾选解封
      </el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
        删除勾选
      </el-button>
    </div>

    <div>
      <el-form :inline="true" :model="searchForm" label-width="auto">
        <el-form-item label="账号">
          <el-input v-model="searchForm.filters.user_name" style="width: 160px" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="searchForm.filters.real_name" style="width: 160px" />
        </el-form-item>
        <el-form-item label="账号状态">
          <el-select
            v-model="searchForm.filters.user_status"
            placeholder="请选择账号状态"
            style="width: 160px"
            clearable
          >
            <el-option
              v-for="item in userStatusOptions"
              :key="item.statusValue"
              :label="item.statusLabel"
              :value="item.statusValue"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="打印机权限">
          <el-select
            v-model="searchForm.filters.print_status"
            placeholder="请选择打印机权限"
            style="width: 160px"
            clearable
          >
            <el-option
              v-for="item in printStatusOptions"
              :key="item.statusValue"
              :label="item.statusLabel"
              :value="item.statusValue"
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
      <el-table-column prop="user_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="200" show-overflow-tooltip>
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row.user_id)">编辑</el-button>
          <el-button size="small" @click="openpPasswordDialog(scope.row.user_id)"
            >修改密码</el-button
          >
        </template>
      </el-table-column>
      <el-table-column prop="user_name" label="账号" width="160" show-overflow-tooltip />
      <el-table-column prop="real_name" label="姓名" width="160" show-overflow-tooltip />
      <el-table-column
        prop="user_status"
        label="账号状态"
        :formatter="formatUserStatus"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="print_status"
        label="打印机权限"
        :formatter="formatPrintStatus"
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
    <UserDialog ref="dialogRef" @success="fetchGrid" />
    <PasswordDialog ref="passwordDialogRef" :title="'设置密码'" @success="passwordSet" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import utc from 'dayjs/plugin/utc'
import UserDialog from './UserDialog.vue'
import PasswordDialog from '@/components/PasswordDialog.vue'

dayjs.extend(utc)

const tableRef = ref(null)
const tableHeight = ref(null)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])
const dialogRef = ref()
const passwordDialogRef = ref()

const tmpRowId = ref()

const pagination = ref({
  page: 1,
  pageSize: 100,
  total: 0,
})

const searchForm = ref({
  filters: {
    user_name: null,
    real_name: null,
    user_status: null,
    print_status: null,
  },
  fuzzy_fields: {
    user_name: null,
    real_name: null,
  },
  date_ranges: {
    add_time: [],
  },
})

const userStatusMap = ref({ 0: '管理员', 1: '员工', 2: '封禁' })
const userStatusOptions = ref([
  { statusValue: 0, statusLabel: '管理员' },
  { statusValue: 1, statusLabel: '员工' },
  { statusValue: 2, statusLabel: '封禁' },
])

const printStatusMap = ref({ 0: '允许', 1: '拒绝' })
const printStatusOptions = ref([
  { statusValue: 0, statusLabel: '允许' },
  { statusValue: 1, statusLabel: '拒绝' },
])

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
    const res = await knit_api.post('/api/user/query', {
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

const openpPasswordDialog = (id) => {
  tmpRowId.value = id
  passwordDialogRef.value.open()
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const formatUserStatus = (row) => {
  return userStatusMap.value[row.user_status] || row.user_status || '-'
}

const formatPrintStatus = (row) => {
  return printStatusMap.value[row.print_status] || row.print_status || '-'
}

const handlePageChange = (newPage) => {
  pagination.value.page = newPage
  fetchGrid()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.user_id)
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的用户吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/delete', {
      table_name: 'sys_user',
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

const batchUserSet = async (set_data, set_text) => {
  try {
    await ElMessageBox.confirm('确定要将选中的用户 ' + set_text + ' 吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update', {
      table_name: 'sys_user',
      pk_values: selectedIds.value,
      json_data: set_data,
    })
    ElMessage.success(res.data.message || set_text + ' 成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(set_text + ' 成功：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }
}

const passwordSet = async (submit_hash) => {
  try {
    await ElMessageBox.confirm('确定要修改密码吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/generic/update', {
      table_name: 'sys_user',
      pk_values: [tmpRowId.value],
      json_data: { user_password: submit_hash },
    })
    ElMessage.success(res.data.message || '修改成功')
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('修改失败：' + (err.response?.data?.error || err.message))
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
