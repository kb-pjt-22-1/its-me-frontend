<!-- src/layouts/menu/DefaultLayout.vue -->
<template>
  <div class="layout-wrapper">
    <router-view />
    <!-- Footer.vue가 같은 폴더에 있으므로 ./Footer.vue 로 import -->
    <Footer /> 
  </div>
</template>

<script setup>
// 같은 폴더에 있으므로 ./로 시작합니다
import Footer from './Footer.vue' 
</script>

<style scoped>
.layout-wrapper { padding-bottom: 60px; }
</style>