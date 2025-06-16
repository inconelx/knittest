<template>
  <el-dialog v-model="visible" :title="titleMap[mode]" width="600px" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="机台名称" prop="machine_name">
        <el-input v-model="form.machine_name" maxlength="60" />
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
      <el-button
        type="primary"
        @click="handleSubmit"
        >保存</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'

const visible = ref(false)
const mode = ref('add') // 'add' | 'edit' | 'copy'
const recordId = ref(null)

const formRef = ref()
const form = reactive({
  machine_name: '',
  note: '',
})
const emit = defineEmits(['success'])
const initialForm = ref({})

const rules = {
  machine_name: [{ required: true, message: '请输入机台名称', trigger: 'blur' }],
}

const titleMap = {
  add: '新增机台',
  edit: '编辑机台',
  copy: '复制机台',
}

const resetForm = () => {
  Object.assign(form, {
    machine_name: '',
    note: '',
  })
}

const open = async (action, id = null) => {
  mode.value = action
  recordId.value = id
  visible.value = true

  if (action === 'add') {
    resetForm()
  } else if (id) {
    const res = await knit_api.post('/api/machine/query', {
      page: 1,
      page_size: 1,
      filters: {
        machine_id: id,
      },
    })
    // Object.assign(form, res.data.records[0])
    Object.keys(form).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(res.data.records[0], key)) {
        form[key] = res.data.records[0][key]
      }
    })
    if (action === 'copy') {
      // 去掉主键
      recordId.value = null
    }
  }
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (mode.value === 'add' || mode.value === 'copy') {
        await knit_api.post('/api/generic/insert', {
          table_name: 'knit_machine',
          pk_name: 'machine_id',
          json_data: form,
        })
        ElMessage.success('新增成功')
      } else if (mode.value === 'edit') {
        await knit_api.post('/api/generic/update', {
          table_name: 'knit_machine',
          pk_name: 'machine_id',
          pk_value: recordId.value,
          json_data: form,
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
