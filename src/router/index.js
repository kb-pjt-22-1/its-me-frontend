import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/pages/auth/Login.vue'
import Signup from '@/pages/auth/Signup.vue'
import Home from '@/pages/Home.vue'
import Map from '@/pages/Map.vue'
import Payments from '@/pages/Payments.vue'
import Cards from '@/pages/Cards.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { hideChrome: true } },
    { path: '/signup', name: 'signup', component: Signup, meta: { hideChrome: true } },

    { path: '/', name: 'home', component: Home },
    { path: '/map', name: 'map', component: Map },
    { path: '/bookmarks', name: 'bookmarks', component: () => import('@/pages/Bookmarks.vue') },
    { path: '/pay', name: 'pay', component: Payments },
    { path: '/payments', name: 'payment-history', component: () => import('@/pages/PaymentsList.vue') },
    { path: '/cards', name: 'cards', component: Cards },
    { path: '/cards/:userCardId', name: 'card-detail', component: () => import('@/pages/Carddetail.vue') },
    { path: '/stores/:merchantId', name: 'store-detail', component: () => import('@/pages/Storedetail.vue') },
    { path: '/pin-setting', name: 'pin-setting', component: () => import('@/pages/Pinsetting.vue') },
  ],
})

export default router