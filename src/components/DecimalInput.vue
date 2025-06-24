<template>
  <el-input v-bind="$attrs" v-model="internalValue" @blur="handleBlur" @input="handleInput" />
</template>

<script setup>
import { computed, toRefs } from 'vue'
import Decimal from 'decimal.js'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  decimals: {
    type: Number,
    default: 2,
  },
  min: {
    type: String,
    default: '-999999999',
  },
  max: {
    type: String,
    default: '999999999',
  },
})

const emit = defineEmits(['update:modelValue'])

const { modelValue, decimals, min, max } = toRefs(props)

// 安全小数位数（不允许负数）
const safeDecimals = computed(() => {
  const d = Number(decimals.value)
  return Number.isInteger(d) && d >= 0 ? d : 0
})

// 绑定到 el-input
const internalValue = computed({
  get: () => modelValue.value,
  set: (val) => {
    emit('update:modelValue', val)
  },
})

// 输入时限制内容
function handleInput(val) {
  // 只保留数字、点和负号
  let safeVal = val.replace(/[^\d.-]/g, '')

  // 保证 - 只能在开头，且最多出现一次
  const hasMinus = safeVal.startsWith('-')
  safeVal = safeVal.replace(/-/g, '')
  if (hasMinus) safeVal = '-' + safeVal

  // 不允许多个小数点
  const parts = safeVal.split('.')
  if (parts.length > 2) {
    safeVal = parts[0] + '.' + parts.slice(1).join('')
  }

  // 小数位数限制
  if (parts.length === 2) {
    if (safeDecimals.value > 0) {
      parts[1] = parts[1].slice(0, safeDecimals.value)
      safeVal = parts[0] + '.' + parts[1]
    } else {
      // 不允许小数点
      safeVal = parts[0]
    }
  }

  emit('update:modelValue', safeVal)
}

// 失焦时校验范围和格式
function handleBlur() {
  const raw = modelValue.value?.trim()
  if (!raw) {
    // 允许为空，用户清空时不填最小值
    emit('update:modelValue', '')
    return
  }

  try {
    const decVal = new Decimal(raw)
    const minVal = new Decimal(min.value)
    const maxVal = new Decimal(max.value)

    let finalVal = decVal

    if (decVal.lessThan(minVal)) {
      finalVal = minVal
    } else if (decVal.greaterThan(maxVal)) {
      finalVal = maxVal
    }

    emit('update:modelValue', finalVal.toFixed(safeDecimals.value))
  } catch {
    // 无效输入时清空
    emit('update:modelValue', '')
  }
}
</script>
