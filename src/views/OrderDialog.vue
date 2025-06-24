<template>
  <el-dialog v-model="visible" :title="titleMap[mode]" width="33%" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="计划单号" prop="order_no">
        <el-input v-model="form.order_no" maxlength="60" />
      </el-form-item>
      <el-form-item label="产品名称" prop="order_cloth_name">
        <el-input v-model="form.order_cloth_name" maxlength="60" />
      </el-form-item>
      <el-form-item label="产品颜色" prop="order_cloth_color">
        <el-input v-model="form.order_cloth_color" maxlength="60" />
      </el-form-item>
      <el-form-item label="计划匹数" prop="order_cloth_piece">
        <DecimalInput
          v-model="form.order_cloth_piece"
          :decimals="0"
          min="0"
          max="999999999"
        />
      </el-form-item>
      <el-form-item label="计划总重量" prop="order_cloth_weight">
        <DecimalInput
          v-model="form.order_cloth_weight"
          :decimals="2"
          min="0"
          max="999999999"
        />
      </el-form-item>
      <el-form-item label="产品单价" prop="order_cloth_weight_price">
        <DecimalInput
          v-model="form.order_cloth_weight_price"
          :decimals="2"
          min="0"
          max="999999999"
        />
      </el-form-item>
      <el-form-item label="空加" prop="order_cloth_add">
        <DecimalInput
          v-model="form.order_cloth_add"
          :decimals="2"
          min="-999999999"
          max="999999999"
        />
      </el-form-item>
      <el-form-item label="备注" prop="note">
        <el-input
          type="textarea"
          v-model="form.note"
          maxlength="4095"
          :autosize="{ minRows: 2, maxRows: 4 }"
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
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import DecimalInput from '@/components/DecimalInput.vue'

const visible = ref(false)
const saveDisabled = ref(true)
const mode = ref('add') // 'add' | 'edit' | 'copy'
const recordId = ref(null)

const formRef = ref()
const form = ref({
  order_no: null,
  order_cloth_name: null,
  order_cloth_color: null,
  order_cloth_piece: null,
  order_cloth_weight: null,
  order_cloth_weight_price: null,
  order_cloth_add: null,
  note: null,
})
const emit = defineEmits(['success'])

const rules = {
  order_no: [{ required: true, message: '请输入计划单号', trigger: 'blur' }],
}

const titleMap = {
  add: '新增计划单',
  edit: '编辑计划单',
  copy: '复制计划单',
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
  visible.value = true
  saveDisabled.value = true

  if (action === 'add') {
    resetForm()
  } else if (id && (action === 'copy' || action === 'edit')) {
    const res = await knit_api.post('/api/order/query', {
      page: 1,
      page_size: 1,
      filters: {
        order_id: id,
      },
    })
    Object.keys(form.value).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(res.data.records[0], key)) {
        form.value[key] = res.data.records[0][key]
      }
    })
    if (action === 'copy') {
      // 去掉主键
      recordId.value = null
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
          table_name: 'knit_order',
          pk_name: 'order_id',
          json_data: input_values,
        })
        ElMessage.success('新增成功')
      } else if (mode.value === 'edit') {
        await knit_api.post('/api/generic/update', {
          table_name: 'knit_order',
          pk_name: 'order_id',
          pk_value: recordId.value,
          json_data: input_values,
        })
        ElMessage.success('更新成功')
      }
      visible.value = false
      emit('success') // 通知父组件刷新列表等
    } catch (err) {
      ElMessage.error('保存失败：' + (err.response?.data?.error || err.message))
    }
  })
}

defineExpose({ open })
</script>
