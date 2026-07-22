<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans antialiased">
    <!-- 전체 로그인 컨테이너: 여기에 모든 요소가 들어갑니다 -->
    <div class="w-full max-w-md space-y-10">

      <!-- 헤더 섹션 -->
      <!-- 입력 폼 섹션 -->
      <form class="space-y-5" @submit.prevent="handleLogin">
        <!-- 아이디 -->
        <div class="relative">
          <input 
            type="text" 
            v-model="userId"
            placeholder="아이디"
            class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition duration-150"
          />
        </div>

        <!-- 비밀번호 -->
        <div class="relative">
          <input 
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            placeholder="비밀번호"
            class="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition duration-150"
          />
        </div>

        <!-- 실패 문구 표시 영역 (여기!) -->
        <p v-if="errorMessage" class="text-red-500 text-sm text-center font-medium animate-pulse">
          {{ errorMessage }}
        </p>

        <!-- 로그인 버튼 -->
        <router-link to="/" class="font-bold text-gray-900 hover:underline ml-1">
          로그인
        </router-link>
      </form>

      <!-- 회원가입 링크 -->
      <div class="text-center text-sm font-medium text-gray-500 pt-2">
        아직 계정이 없으신가요? 
        <router-link to="/signup" class="font-bold text-gray-900 hover:underline ml-1">
          회원가입
        </router-link>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const userId = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref(''); // 에러 메시지 상태 관리
const router = useRouter();

function handleLogin() {
  // 간단한 테스트용 로그인 로직 (실제로는 API 연동)
  if (userId.value === 'admin' && password.value === '1234') {
    errorMessage.value = ''; // 성공 시 에러 메시지 초기화
    router.push('/');
  } else {
    // 실패 시 에러 메시지 설정
    errorMessage.value = '아이디 또는 비밀번호가 잘못되었습니다.';
  }
}
</script>