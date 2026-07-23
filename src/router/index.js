import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/pages/auth/Login.vue'
import Signup from '@/pages/auth/Signup.vue'
import Home from '@/pages/Home.vue'
import Map from '@/pages/Map.vue'         
import Payments from '@/pages/Payments.vue' 
import Cards from '@/pages/Cards.vue'     
import DefaultLayout from '@/layouts/menu/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login },
    { path: '/signup', name: 'signup', component: () => ('@/pages/auth/Signup.vue') },
    {
      path: '/',
      redirect: '/login',
      component: DefaultLayout, // 이제 정확히 파일을 찾을 수 있습니다
      children: [
        { path: '', name: 'home', component: Home },
        { path: 'map', name: 'map', component: Map },
        { path: 'pay', name: 'pay', component: Payments },  
        { path: 'cards', name: 'cards', component: Cards }
      ]
    }
  ]
})

export default router;