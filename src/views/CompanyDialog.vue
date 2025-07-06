<template>
  <el-dialog v-model="visible" :title="titleMap[mode]" width="25%" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="公司名称" prop="company_name">
        <el-input v-model="form.company_name" maxlength="60" />
      </el-form-item>

      <el-form-item label="公司类型" prop="company_type">
        <el-select v-model="form.company_type" placeholder="请选择类型">
          <el-option
            v-for="item in companyTypeOptions"
            :key="item.table_field_value"
            :label="item.table_field_label"
            :value="item.table_field_value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="简称" prop="company_abbreviation">
        <el-input v-model="form.company_abbreviation" maxlength="60" />
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

const visible = ref(false)
const saveDisabled = ref(true)
const mode = ref('add') // 'add' | 'edit' | 'copy'
const recordId = ref(null)

const formRef = ref()
const form = ref({
  company_name: null,
  company_type: null,
  company_abbreviation: null,
  note: null,
})
const emit = defineEmits(['success'])

const rules = {
  company_name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  company_type: [{ required: true, message: '请选择公司类型', trigger: 'blur' }],
  company_abbreviation: [{ required: true, message: '请输入公司简称', trigger: 'blur' }],
}

const titleMap = {
  add: '新增公司',
  edit: '编辑公司',
  copy: '复制公司',
}

const companyTypeOptions = ref([])

const fetchCompanyType = async () => {
  const res = await knit_api.get('/api/combobox', {
    params: { table_name: 'knit_company', table_field_name: 'company_type' },
  })
  companyTypeOptions.value = res.data
}

const resetForm = () => {
  for (const key in form.value) {
    form.value[key] = null
  }
}

const open = async (action, id = null) => {
  if (formRef.value) {
    formRef.value.clearValidate()
  }
  mode.value = action
  recordId.value = id
  saveDisabled.value = true

  await fetchCompanyType()
  
  resetForm()
  await nextTick()
  visible.value = true

  if (mode.value === 'add') {
  } else if (recordId.value !== null && (mode.value === 'copy' || mode.value === 'edit')) {
    try {
      const res = await knit_api.post('/api/company/query', {
        page: 1,
        page_size: 1,
        filters: {
          company_id: recordId.value,
        },
      })
      Object.keys(form.value).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(res.data.records[0], key)) {
          form.value[key] = res.data.records[0][key]
        }
      })
      if (mode.value === 'copy') {
        // 去掉主键
        recordId.value = null
      }
    } catch (err) {
      ElMessage.error('加载失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }
  saveDisabled.value = false
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
      if (mode.value === 'add' || mode.value === 'copy') {
        await knit_api.post('/api/generic/insert', {
          table_name: 'knit_company',
          json_data: input_values,
        })
        ElMessage.success('新增成功')
      } else if (mode.value === 'edit') {
        await knit_api.post('/api/generic/update', {
          table_name: 'knit_company',
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

defineExpose({ open })
</script>
