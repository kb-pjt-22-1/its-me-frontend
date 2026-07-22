<template>
  <nav class="fixed bottom-0 w-full bg-white border-t flex justify-around py-3">
    <router-link to="/">홈</router-link>
    <router-link to="/map">주변</router-link> <!-- /nearby -> Map.vue -->
    <router-link to="/pay">결제</router-link>    <!-- /pay -> Payments.vue -->
    <router-link to="/cards">카드</router-link>   <!-- /cards -> Cards.vue -->
  </nav>
</template>