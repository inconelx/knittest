<template>
  <el-dialog
    v-model="visible"
    :title="titleMap[mode]"
    width="25%"
    :close-on-click-modal="false"
    @opened="afterOpen"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="出货单号" prop="delivery_no">
        <el-input v-model="form.delivery_no" maxlength="60" />
      </el-form-item>

      <el-form-item label="公司简称" prop="delivery_company_id">
        <el-select
          v-model="form.delivery_company_id"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="输入以搜索公司简称"
          :remote-method="remoteSearchCompany"
          :loading="companyLoading"
          maxlength="60"
        >
          <el-option
            v-for="item in companyOptions"
            :key="item.company_id"
            :label="item.company_abbreviation"
            :value="item.company_id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="备注" prop="note">
        <el-input
          type="textarea"
          v-model="form.note"
          maxlength="4095"
          :autosize="false"
          :rows="4"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :disabled="saveDisabled">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

const visible = ref(false)
const mode = ref('add') // 'add' | 'edit'
const recordId = ref(null)
const saveDisabled = ref(true)

const companyLoading = ref(false)
const companyOptions = ref([])

const formRef = ref()
const form = ref({
  delivery_no: null,
  delivery_company_id: null,
  note: null,
})

const emit = defineEmits(['success'])
const initialForm = ref({})

const rules = {
  delivery_no: [{ required: true, message: '请输入出货单名称', trigger: 'blur' }],
}

const titleMap = {
  add: '新增出货单',
  edit: '编辑出货单',
}

const resetForm = () => {
  for (const key in form.value) {
    form.value[key] = null
  }
}

const remoteSearchCompany = async (query) => {
  if (query === null || query === undefined) {
    companyOptions.value = []
    return
  }
  companyLoading.value = true
  try {
    const res = await knit_api.post('/api/company/search', {
      size: 10,
      keyword: query,
    })
    companyOptions.value = res.data
  } catch (err) {
    ElMessage.error('搜索失败：' + (err.response?.data?.error || err.message))
    console.error(err)
    companyOptions.value = []
  } finally {
    companyLoading.value = false
  }
}

const open = async (action, id = null) => {
  if (formRef.value) {
    formRef.value.clearValidate()
  }
  mode.value = action
  recordId.value = id
  saveDisabled.value = true
  visible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const input_values = {}
      for (const key in form.value) {
        const value = form.value[key]
        if (value !== null && value !== undefined && value !== '') {
          input_values[key] = value
        } else {
          input_values[key] = null
        }
      }
      if (mode.value === 'add') {
        await knit_api.post('/api/generic/insert', {
          table_name: 'knit_delivery',
          json_data: input_values,
        })
        ElMessage.success('新增成功')
      } else if (mode.value === 'edit') {
        await knit_api.post('/api/generic/update', {
          table_name: 'knit_delivery',
          pk_values: [recordId.value],
          json_data: input_values,
        })
        ElMessage.success('更新成功')
      }
      visible.value = false
      emit('success') // 通知父组件刷新列表等
    } catch (err) {
      ElMessage.error('保存失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  })
}

const afterOpen = async () => {
  await nextTick()
  if (mode.value === 'add') {
    resetForm()
  } else if (recordId.value !== null && mode.value === 'edit') {
    try {
      const res = await knit_api.post('/api/delivery/query', {
        page: 1,
        page_size: 1,
        filters: {
          delivery_id: recordId.value,
        },
      })
      if (res.data.records[0]['delivery_company_id']) {
        companyOptions.value = [
          {
            company_id: res.data.records[0]['delivery_company_id'],
            company_abbreviation: res.data.records[0]['company_abbreviation'],
          },
        ]
      }
      Object.keys(form.value).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(res.data.records[0], key)) {
          form.value[key] = res.data.records[0][key]
        }
      })
    } catch (err) {
      ElMessage.error('加载失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }
  saveDisabled.value = false
}

defineExpose({ open })
</script>
