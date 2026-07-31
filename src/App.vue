<template>
  <div id="app">
    <Header v-if="showChrome" />
    <SidebarMenu v-if="showChrome" />
    <main :class="showChrome ? 'page-container app-page has-bottom-nav' : 'page-container'">
      <router-view />
    </main>
    <NavBar v-if="showChrome" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@/layouts/menu/Header.vue';
import NavBar from '@/layouts/menu/NavBar.vue';
import SidebarMenu from '@/components/SidebarMenu.vue';

const route = useRoute();
// 로그인/회원가입처럼 route.meta.hideChrome가 true인 화면은 헤더/사이드바/하단바 없이 뜹니다.
const showChrome = computed(() => !route.meta.hideChrome);
</script>

<style>
/* 가장 바깥 배경만 여기서 관리 */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}
</style>