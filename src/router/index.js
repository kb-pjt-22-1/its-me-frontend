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
    { path: '/signup', name: 'signup', component: Signup },
    // 햄버거 메뉴 '개인정보 및 보안'에서 진입 (SidebarMenu.vue)
    { path: '/member-profile', name: 'member-profile', component: () => import('@/pages/auth/MemberProfile.vue') },
    {
      // redirect: '/login'을 두면 vue-router가 '/'에서 이 라우트의 component/children을
      // 무시하고 무조건 /login으로 보낸다. 그러면 로그인 성공 후 router.push('/')를 해도
      // 다시 로그인 화면으로 튕겨서, 로그인 자체가 실패한 것처럼 보인다.
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', name: 'home', component: Home },
        { path: 'map', name: 'map', component: Map },
        { path: 'pay', name: 'pay', component: Payments },  
        { path: 'cards', name: 'cards', component: Cards },
        { path: 'bookmarks', name: 'bookmarks', component: () => import('@/pages/Bookmarks.vue') }
      ]
    },
{
  path: '/pay',
  name: 'Pay',
  component: () => import('@/pages/Payments.vue') 
},
    {
  path: '/payments',
  name: 'Payments',
  component: () => import('@/pages/PaymentsList.vue')
}
  ]
})

export default router;