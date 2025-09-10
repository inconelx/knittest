<template>
  <el-dialog v-model="visible" :title="title" width="300px" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="请输入密码" prop="input_password">
        <el-input v-model="form.input_password" maxlength="60" type="password" show-password />
      </el-form-item>
      <el-form-item label="请确认密码" prop="input_password_twice">
        <el-input
          v-model="form.input_password_twice"
          maxlength="60"
          type="password"
          show-password
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <DebounceButton :on-click="() => (visible = false)">取消</DebounceButton>
      <DebounceButton type="primary" :on-click="() => handleSubmit()" :disabled="saveDisabled"
        >确定</DebounceButton
      >
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import bcrypt from 'bcryptjs'
import { ElMessage } from 'element-plus'
import DebounceButton from '@/components/DebounceButton.vue'

const visible = ref(false)
const saveDisabled = ref(true)

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

const handleSubmit = () => {
  if (saveDisabled.value) return
  saveDisabled.value = true
  formRef.value.validate(async (valid) => {
    try {
      if (valid) {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(form.value.input_password, salt)
        visible.value = false
        emit('success', hashedPassword) // 通知父组件刷新列表等
      }
    } catch (err) {
      ElMessage.error('提交失败：' + (err.response?.data?.error || err.message))
      console.error(err)
    } finally {
      setTimeout(() => {
        saveDisabled.value = false
      }, 500)
    }
  })
}

defineExpose({ open })
</script>
