<template>
  <el-dialog v-model="visible" :title="titleMap[mode]" width="25%" :close-on-click-modal="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="auto">
      <el-form-item label="机台号" prop="cloth_machine_id">
        <el-select
          v-model="form.cloth_machine_id"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="输入以搜索机台号"
          :remote-method="remoteSearchMachine"
          @change="handleMachineChange"
          :loading="machineLoading"
          :disabled="mode != 'add'"
          maxlength="60"
        >
          <el-option
            v-for="item in machineOptions"
            :key="item.machine_id"
            :label="item.machine_name"
            :value="item.machine_id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="原始重量" prop="cloth_origin_weight">
        <DecimalInput v-model="form.cloth_origin_weight" :decimals="2" min="0" max="999999999" />
      </el-form-item>

      <el-form-item label="重量修正" prop="cloth_weight_correct">
        <DecimalInput
          v-model="form.cloth_weight_correct"
          :decimals="2"
          min="-999999999"
          max="999999999"
        />
      </el-form-item>

      <el-form-item label="计划单号" prop="cloth_order_id">
        <el-select
          v-model="form.cloth_order_id"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="输入以搜索计划单号"
          :remote-method="remoteSearchOrder"
          :loading="orderLoading"
          maxlength="60"
        >
          <el-option
            v-for="item in orderOptions"
            :key="item.order_id"
            :label="item.order_no"
            :value="item.order_id"
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
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { knit_api } from '@/utils/auth.js'
import DecimalInput from '@/components/DecimalInput.vue'

const visible = ref(false)
const mode = ref('add') // 'add' | 'edit'
const recordId = ref(null)
const saveDisabled = ref(true)
const machineLoading = ref(false)
const orderLoading = ref(false)

const machineOptions = ref([])
const orderOptions = ref([])

const formRef = ref()
const form = ref({
  cloth_machine_id: null,
  cloth_origin_weight: null,
  cloth_weight_correct: null,
  note: null,
})
const emit = defineEmits(['success'])
const initialForm = ref({})

const rules = {
  cloth_machine_id: [{ required: true, message: '请选择机台号', trigger: 'blur' }],
  cloth_origin_weight: [{ required: true, message: '重量不能为空', trigger: 'blur' }],
}

const titleMap = {
  add: '新增布匹',
  edit: '编辑布匹',
}

const resetForm = () => {
  for (const key in form.value) {
    form.value[key] = null
  }
}

const remoteSearchMachine = async (query) => {
  if (query === null || query === undefined) {
    machineOptions.value = []
    return
  }
  machineLoading.value = true
  try {
    const res = await knit_api.post('/api/machine/search', {
      size: 10,
      keyword: query,
    })
    machineOptions.value = res.data
    orderOptions.value = res.data
  } catch (err) {
    ElMessage.error('搜索失败：' + (err.response?.data?.err || err.message))
    console.error(err)
    machineOptions.value = []
  } finally {
    machineLoading.value = false
  }
}

const remoteSearchOrder = async (query) => {
  if (query === null || query === undefined) {
    orderOptions.value = []
    return
  }
  orderLoading.value = true
  try {
    const res = await knit_api.post('/api/order/search', {
      size: 10,
      keyword: query,
    })
    orderOptions.value = res.data
  } catch (err) {
    ElMessage.error('搜索失败：' + (err.response?.data?.err || err.message))
    console.error(err)
    orderOptions.value = []
  } finally {
    orderLoading.value = false
  }
}

const handleMachineChange = (val) => {
  const matched = orderOptions.value.find((item) => item.machine_id === val)
  form.value.cloth_order_id = matched ? matched.order_id : null
}

const open = async (action, id = null) => {
  if (formRef.value) {
    formRef.value.clearValidate()
  }
  mode.value = action
  recordId.value = id
  visible.value = true
  saveDisabled.value = true
  machineOptions.value = []
  orderOptions.value = []

  if (action === 'add') {
    resetForm()
  } else if (id && action === 'edit') {
    const res = await knit_api.post('/api/cloth/query', {
      page: 1,
      page_size: 1,
      filters: {
        cloth_id: id,
      },
    })
    if (res.data.records[0]['cloth_machine_id']) {
      machineOptions.value = [
        {
          machine_id: res.data.records[0]['cloth_machine_id'],
          machine_name: res.data.records[0]['machine_name'],
        },
      ]
    }
    if (res.data.records[0]['cloth_order_id']) {
      orderOptions.value = [
        {
          order_id: res.data.records[0]['cloth_order_id'],
          order_no: res.data.records[0]['order_no'],
        },
      ]
    }
    Object.keys(form.value).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(res.data.records[0], key)) {
        form.value[key] = res.data.records[0][key]
      }
    })
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
      if (mode.value === 'add') {
        await knit_api.post('/api/generic/insert', {
          table_name: 'knit_cloth',
          pk_name: 'cloth_id',
          json_data: input_values,
        })
        ElMessage.success('新增成功')
      } else if (mode.value === 'edit') {
        await knit_api.post('/api/generic/update', {
          table_name: 'knit_cloth',
          pk_name: 'cloth_id',
          pk_value: recordId.value,
          json_data: input_values,
        })
        ElMessage.success('更新成功')
      }
      visible.value = false
      emit('success') // 通知父组件刷新列表等
    } catch (err) {
      ElMessage.error('保存失败：' + (err.response?.data?.err || err.message))
      console.error(err)
    }
  })
}

defineExpose({ open })
</script>
