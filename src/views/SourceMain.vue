<template>
  <div>
    <el-container>
      <el-aside>
        <el-menu default-active="$route.path" router>
          <!-- <el-menu-item index="/home">首页</el-menu-item> -->
          <!-- <el-menu-item index="/users">用户管理</el-menu-item> -->
          <el-menu-item index="/companies">公司管理</el-menu-item>
          <el-menu-item index="/machine">机台管理</el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header style="background: #409eff; color: white"></el-header>
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
</script>
