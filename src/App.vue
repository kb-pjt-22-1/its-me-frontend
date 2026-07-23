<!-- App.vue -->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
/* 가장 바깥 배경만 여기서 관리 */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f2f5; /* 여기서 전체 배경색을 지정합니다 */
}

#app {
  display: flex;
  justify-content: center; 
  min-height: 100vh;
}
</style>