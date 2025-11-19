<template>
  <el-dialog
    v-model="visible"
    :title="titleName"
    width="75%"
    top="2%"
    :close-on-click-modal="false"
    @close="onDialogClose"
  >
    <p>当前出货单ID: {{ delivery_info.delivery_id }}</p>
    <p>当前出货单号: {{ delivery_info.delivery_no }}</p>
    <p>当前出货客户: {{ delivery_info.company_abbreviation }}</p>
    <p>
      总匹数: {{ delivery_info.delivery_piece }}&emsp;总重量: {{ delivery_info.delivery_weight }}
    </p>
    <div>
      <el-button type="primary" @click="fetchGrid">刷新</el-button>
      <el-button type="primary" @click="resetSearch">重置筛选</el-button>
      <el-button type="primary" @click="startScanner('out')">扫码出货</el-button>
      <el-button type="primary" @click="startScanner('cancel')">扫码撤销</el-button>
      <el-button type="primary" @click="openClothSelect">新增出货布匹</el-button>
      <el-button type="danger" :disabled="selectedIds.length === 0" @click="cancelSelected">
        撤销勾选布匹
      </el-button>
      <el-button @click="visible = false">关闭</el-button>
    </div>
    <div>
      <el-form :inline="true" :model="searchForm" label-width="auto">
        <el-form-item label="精确筛选">
          <el-checkbox v-model="searchForm.use_accurate" />
        </el-form-item>

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
            :editable="false"
          />
        </el-form-item>
      </el-form>
    </div>
    <div style="display: flex">
      <el-pagination
        background
        layout="prev, pager, next, total"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        @current-change="handlePageChange"
      />
      <div class="el-pagination">Sum {{ pagination.sum_weight }}</div>
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
      <el-table-column type="selection" width="40" />
      <el-table-column
        type="index"
        :label="`${selectedIds.length}`"
        :index="(index) => (pagination.page - 1) * pagination.pageSize + index + 1"
      />
      <el-table-column prop="cloth_id" label="ID" width="160" show-overflow-tooltip />
      <el-table-column prop="machine_name" label="机台号" width="160" show-overflow-tooltip />
      <el-table-column
        prop="cloth_calculate_weight"
        label="计算重量"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="add_user_name" label="录入账号" width="160" show-overflow-tooltip />
      <el-table-column prop="add_time" label="录入时间" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatDate(row.add_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="order_no" label="计划单号" width="210" show-overflow-tooltip />
      <el-table-column prop="order_cloth_name" label="产品名称" width="160" show-overflow-tooltip />
      <el-table-column
        prop="order_cloth_color"
        label="产品颜色"
        width="160"
        show-overflow-tooltip
      />
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
      <el-table-column prop="note" label="备注" width="320" show-overflow-tooltip />
    </el-table>
  </el-dialog>
  <ClothSelect ref="clothSelectRef" @success="handleDialogAddCloth" />
  <QrScanner ref="scanner" @detect="onDetect" />
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import axios from 'axios'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import ClothSelect from './ClothSelect.vue'
import utc from 'dayjs/plugin/utc'
import QrScanner from '@/components/QrScanner.vue'

dayjs.extend(utc)

const tableRef = ref(null)
const tableHeight = ref(null)

const loading = ref(false)
const gridData = ref([])
const selectedIds = ref([])

const scanner = ref(null)

const visible = ref(false)
const recordId = ref(null)

const clothSelectRef = ref()

const searchForm = ref({
  filters: {
    cloth_id: null,
    machine_name: null,
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    add_user_name: null,
  },
  use_accurate: false,
  fuzzy_fields: {
    cloth_id: null,
    machine_name: null,
    order_no: null,
    order_cloth_name: null,
    order_cloth_color: null,
    add_user_name: null,
  },
  date_ranges: {
    add_time: [],
  },
})

const pagination = ref({
  page: 1,
  pageSize: 100,
  total: 0,
  sum_weight: 0,
})

const delivery_info = ref({})

const emit = defineEmits(['close'])

const titleName = '出货单布匹编辑'

const scanner_operate = ref('out')
const scanner_operate_hint = ref({
  out: '出货',
  cancel: '撤销出货',
})

const startScanner = (operate) => {
  if (operate in scanner_operate_hint.value) {
    scanner_operate.value = operate
    scanner.value.start()
  }
}

const onDetect = async (decodedText) => {
  let cloth_valid_type = '成功'
  try {
    const res = await knit_api.post('/api/delivery/cloth/update', {
      delivery_id: recordId.value,
      cloth_operate: scanner_operate.value,
      pk_values: [decodedText],
    })
  } catch (error) {
    if (error.response?.data['errorType'] === 0) {
      cloth_valid_type = '失败，错误的请求'
    } else if (error.response?.data['errorType'] === 1) {
      cloth_valid_type = '失败，布匹ID错误或不存在'
    } else if (error.response?.data['errorType'] === 2) {
      cloth_valid_type = '失败，此布匹已出货'
    } else if (error.response?.data['errorType'] === 3) {
      cloth_valid_type = '失败，不能取消未出货布匹或其他出货单布匹'
    } else {
      cloth_valid_type = '失败，未知错误'
    }
  }
  if (cloth_valid_type === '成功') {
    fetchGrid()
  }
  let tmp_box_type = 'success'
  const ctx = new window.AudioContext()
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  gainNode.gain.value = 2
  if (cloth_valid_type === '成功') {
    osc.type = 'sine'
    osc.frequency.value = 980
  } else {
    osc.type = 'sawtooth'
    osc.frequency.value = 140
    tmp_box_type = 'warning'
  }
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  // osc.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.25)
  await ElMessageBox.alert(scanner_operate_hint.value[scanner_operate.value] + cloth_valid_type, '提示', {
    confirmButtonText: '继续',
    type: tmp_box_type,
    showClose: false,
    closeOnClickModal: false,
    closeOnPressEscape: false,
  })
  scanner.value.resume()
}

const handleDialogAddCloth = async (submit_ids) => {
  try {
    await ElMessageBox.confirm('确定要新增出货布匹吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/delivery/cloth/update', {
      delivery_id: recordId.value,
      cloth_operate: 'out',
      pk_values: submit_ids,
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
  rawFilters['delivery_status'] = true
  rawFilters['cloth_delivery_id'] = recordId.value

  try {
    const res = await knit_api.post('/api/cloth/query', {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      filters: rawFilters,
      fuzzy_fields: searchForm.value.use_accurate ? {} : searchForm.value.fuzzy_fields,
      order_fields: { delivery_time: false },
      date_ranges: searchForm.value.date_ranges,
    })
    gridData.value = res.data.records
    pagination.value.total = res.data.total
    pagination.value.sum_weight = res.data.sum_weight
    tableHeightSet()

    const res_total = await knit_api.post('/api/delivery/query', {
      page: 1,
      page_size: 1,
      filters: { delivery_id: recordId.value },
    })
    delivery_info.value = res_total.data.records[0]
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

const openClothSelect = () => {
  clothSelectRef.value.open()
}

const formatDate = (str) => {
  return str ? dayjs.utc(str).format('YYYY/MM/DD HH:mm:ss') : ''
  //   return str ? dayjs(str).format('YYYY/MM/DD HH:mm:ss [GMT+8]') : ''
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.cloth_id)
}

const cancelSelected = async () => {
  try {
    await ElMessageBox.confirm('确定要将选中布匹从出货单撤销吗？', '提示', {
      type: 'warning',
    })
    const res = await knit_api.post('/api/delivery/cloth/update', {
      delivery_id: recordId.value,
      cloth_operate: 'cancel',
      pk_values: selectedIds.value,
    })
    ElMessage.success(res.data.message || '撤销成功')
    selectedIds.value = []
    fetchGrid()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('撤销失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }
}

const resetSearch = async () => {
  for (const key in searchForm.value.filters) {
    searchForm.value.filters[key] = null
  }
  for (const key in searchForm.value.date_ranges) {
    searchForm.value.date_ranges[key] = []
  }
  await fetchGrid()
}

const open = async (id) => {
  for (const key in searchForm.value.filters) {
    searchForm.value.filters[key] = null
  }
  for (const key in searchForm.value.date_ranges) {
    searchForm.value.date_ranges[key] = []
  }
  gridData.value = null
  recordId.value = id
  visible.value = true
  await nextTick()
  await fetchGrid()
}

const onDialogClose = () => {
  emit('close')
}

defineExpose({ open })
</script>
