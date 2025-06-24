<template>
  <el-dialog v-model="visible" :title="title" width="300px" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="输入值" prop="input_num">
        <DecimalInput v-model="form.input_num" :decimals="decimals" :min="min" :max="max" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit(form.input_num)">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import DecimalInput from '@/components/DecimalInput.vue'

const visible = ref(false)

const formRef = ref()
const form = ref({
  input_num: null,
})
const emit = defineEmits(['success'])
const initialForm = ref({})

const props = defineProps({
  title: { type: String, default: '请输入数值' },
  decimals: { type: Number, default: 2 },
  min: {
    type: String,
    default: '-999999999',
  },
  max: {
    type: String,
    default: '999999999',
  },
  emptyable: {
    type: Boolean,
    default: true,
  },
})

const rules = computed(() => ({
  input_num: props.emptyable
    ? []  // 允许为空，不加 required
    : [{ required: true, message: '请输入数值', trigger: 'blur' }]
}))

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

const handleSubmit = (input_num) => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      visible.value = false
      emit('success', input_num) // 通知父组件刷新列表等
    } catch (err) {
      ElMessage.error('提交失败：' + (err.response?.data?.error || err.message))
    }
  })
}

defineExpose({ open })
</script>
