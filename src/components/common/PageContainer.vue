<template>
  <div class="page-container">
    <slot />
  </div>
</template>

<style scoped>
/* Header(440px)와 동일한 폭. 화면 크기를 통일하고 싶은 페이지는
   전부 이 컴포넌트로 내용을 감싸면 됩니다 */
.page-container {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}
</style>