<template>
  <el-dialog v-model="visible" :title="title" width="300px" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="请输入密码" prop="input_password">
        <el-input v-model="form.input_password" maxlength="60" type="password" show-password />
      </el-form-item>
      <el-form-item label="请确认密码" prop="input_password_twice">
        <el-input v-model="form.input_password_twice" maxlength="60" type="password" show-password />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit()">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import bcrypt from 'bcryptjs'
import { ElMessage } from 'element-plus'

const visible = ref(false)

const formRef = ref()
const form = ref({
  input_password: null,
  input_password_twice: null,
})
const emit = defineEmits(['success'])

const props = defineProps({
  title: { type: String, default: '请输入密码' },
})

const rules = {
  input_password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  input_password_twice: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.value.input_password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

const resetForm = () => {
  for (const key in form.value) {
    form.value[key] = null
  }
}

const open = async () => {
  if (formRef.value) {
    formRef.value.clearValidate()
  }
  resetForm()
  visible.value = true
}

const handleSubmit = async () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(form.value.input_password, salt)
      visible.value = false
      emit('success', hashedPassword) // 通知父组件刷新列表等
    } catch (err) {
      ElMessage.error('提交失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  })
}

defineExpose({ open })
</script>
