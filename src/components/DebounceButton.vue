<template>
  <el-button v-bind="{ ...attrs, disabled: globalLocked || props.disabled }" @click="handleClick">
    <slot />
  </el-button>
</template>

<script setup>
import { ref, defineProps, useAttrs } from 'vue'
import { globalLocked } from '@/utils/globalButtonLock,js'

const props = defineProps({
  debounceTime: { type: Number, default: 500 }, // 防抖时间
  onClick: Function,
  disabled: Boolean,
})

const attrs = useAttrs()

const handleClick = async (event) => {
  console.log(globalLocked.value)
  if (globalLocked.value) return
  globalLocked.value = true

  try {
    if (props.onClick) {
      const result = props.onClick(event)
      await Promise.resolve(result) // 支持同步或任何 thenable
    }
  } finally {
    setTimeout(() => {
      globalLocked.value = false
    }, props.debounceTime)
  }
}
</script>
