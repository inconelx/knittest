<template>
  <div style="max-width: 500px; margin: 20px auto">
    <el-form :model="form" label-width="130px" ref="formRef">
      <el-form-item
        label="公司名称"
        prop="company_name"
        :rules="[{ required: true, message: '请输入公司名称', trigger: 'blur' }]"
      >
        <el-input v-model="form.company_name" placeholder="请输入公司名称" maxlength="60" />
      </el-form-item>

      <el-form-item
        label="公司类型"
        prop="company_type"
        :rules="[{ required: true, message: '请选择公司类型', trigger: 'change' }]"
      >
        <el-select v-model="form.company_type" placeholder="请选择公司类型" style="width: 100%">
          <el-option
            v-for="item in companyTypeOptions"
            :key="item.table_field_value"
            :label="item.table_field_label"
            :value="item.table_field_value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="公司简称">
        <el-input v-model="form.company_abbreviation" placeholder="请输入公司简称" maxlength="30" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          type="textarea"
          :rows="4"
          v-model="form.note"
          placeholder="请输入备注"
          maxlength="4000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item>
        <el-space>
          <el-button type="primary" @click="onSave">保存</el-button>
          <el-button @click="onCancel">退出</el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)

// 表单字段
const form = ref({
  company_name: '',
  company_type: null,
  company_abbreviation: '',
  note: '',
})

const companyTypeOptions = ref([])

// 模式识别
const isEdit = ref(false)
const isCopy = ref(false)
const companyId = ref(null)

// 初始化
onMounted(async () => {
  const id = route.params.id

  if (route.name === 'EditCompany') {
    isEdit.value = true
    companyId.value = id
  } else if (route.name === 'CopyCompany') {
    isCopy.value = true
    companyId.value = id
  }

  if (companyId.value) {
    try {
      const res = await axios.post('http://localhost:5000/api/company/query', {
        page: 1,
        page_size: 1,
        filters: {
          company_id: companyId.value,
        },
      })
      // form.value = res.data.records[0]
      Object.keys(form.value).forEach((key) => {
        if (key in res.data.records[0]) {
          form.value[key] = res.data.records[0][key]
        }
      })
    } catch (err) {
      ElMessage.error('加载失败')
    }
    // console.log(form.value)
  }

  try {
    const res = await axios.get('http://localhost:5000/api/combobox', {
      params: {
        table_name: 'knit_company',
        table_field_name: 'company_type',
      },
    })
    companyTypeOptions.value = res.data
  } catch (err) {
    console.error('下拉选项加载失败', err)
  }
})

// 保存
const onSave = async () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (isEdit.value) {
        await axios.post('http://localhost:5000/api/generic/update', {
          table_name: 'knit_company',
          pk_name: 'company_id',
          pk_value: companyId.value,
          json_data: form.value,
        })
        ElMessage.success('更新成功')
      } else {
        await axios.post('http://localhost:5000/api/generic/insert', {
          table_name: 'knit_company',
          pk_name: 'company_id',
          json_data: form.value,
        })
        ElMessage.success(isCopy.value ? '复制成功' : '新增成功')
      }

      router.back()
    } catch (err) {
      ElMessage.error(err.response?.data?.error || err.message || '保存失败')
    }
  })
}

// 取消
const onCancel = () => {
  router.back()
}
</script>
