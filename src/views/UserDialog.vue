<template>
  <el-dialog v-model="visible" :title="titleMap[mode]" width="25%" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="账户" prop="user_name">
        <el-input v-model="form.user_name" maxlength="60" />
      </el-form-item>

      <el-form-item label="姓名" prop="real_name">
        <el-input v-model="form.real_name" maxlength="60" />
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
  <PasswordDialog ref="passwordDialogRef" :title="'设置密码'" @success="passwordSet" />
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import PasswordDialog from '@/components/PasswordDialog.vue'

const visible = ref(false)
const mode = ref('add') // 'add' | 'edit'
const recordId = ref(null)
const saveDisabled = ref(true)

const formRef = ref()
const form = ref({
  user_name: null,
  real_name: null,
  note: null,
})

const passwordDialogRef = ref()

const emit = defineEmits(['success'])

const rules = {
  user_name: [{ required: true, message: '请输入用户名称', trigger: 'blur' }],
}

const titleMap = {
  add: '新增用户',
  edit: '编辑用户',
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
  } else if (id && action === 'edit') {
    try {
      const res = await knit_api.post('/api/user/query', {
        page: 1,
        page_size: 1,
        filters: {
          user_id: id,
        },
      })
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

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (mode.value === 'add') {
        passwordDialogRef.value.open()
      } else if (mode.value === 'edit') {
        const input_values = {}
        for (const key in form.value) {
          const value = form.value[key]
          if (value !== null && value !== undefined && value !== '') {
            input_values[key] = value
          } else {
            input_values[key] = null
          }
        }
        await knit_api.post('/api/generic/update', {
          table_name: 'sys_user',
          pk_name: 'user_id',
          pk_value: recordId.value,
          json_data: input_values,
        })
        ElMessage.success('更新成功')
        visible.value = false
        emit('success') // 通知父组件刷新列表等
      }
    } catch (err) {
      ElMessage.error('保存失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  })
}

const passwordSet = async (submit_hash) => {
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
    input_values['user_password'] = submit_hash
    await knit_api.post('/api/generic/insert', {
      table_name: 'sys_user',
      pk_name: 'user_id',
      json_data: input_values,
    })
    ElMessage.success('新增成功')
    visible.value = false
    emit('success') // 通知父组件刷新列表等
  } catch (err) {
    ElMessage.error('保存失败：' + (err.response?.data?.error || err.message))
    console.error(err)
  }
}

defineExpose({ open })
</script>
