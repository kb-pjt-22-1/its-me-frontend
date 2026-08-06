import {createRouter, createWebHistory} from 'vue-router'
import Login from '@/pages/auth/Login.vue'
import Signup from '@/pages/auth/Signup.vue'
import Home from '@/pages/Home.vue'
import Map from '@/pages/Map.vue'
import Payments from '@/pages/Payments.vue'
import Cards from '@/pages/Cards.vue'
import DefaultLayout from '@/layouts/menu/DefaultLayout.vue'
import {useAuthStore} from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // guestOnly: 이미 로그인된 사용자가 들어오면 홈으로 돌려보낸다.
        {path: '/login', name: 'login', component: Login, meta: {guestOnly: true}},
        {path: '/signup', name: 'signup', component: Signup, meta: {guestOnly: true}},
        // 햄버거 메뉴 '개인정보 및 보안'에서 진입 (SidebarMenu.vue)
        {
            path: '/member-profile',
            name: 'member-profile',
            component: () => import('@/pages/auth/MemberProfile.vue'),
            meta: {requiresAuth: true},
        },
        // 햄버거 메뉴 '간편 비밀번호(PIN) 설정'에서 진입하거나, 회원가입 후 첫 로그인 시
        // Login.vue가 이리로 보낸다. 최초 설정/변경 중 뭘 보여줄지는 Pinsetting.vue가
        // getMyProfile().pinRegistered로 스스로 판단한다 - 라우트는 하나뿐이다.
        {
            path: '/pin-setting',
            name: 'pin-setting',
            component: () => import('@/pages/Pinsetting.vue'),
            meta: {requiresAuth: true},
        },
        {
            // 로그인 여부에 따른 분기는 아래 beforeEach 가드가 담당한다.
            // 여기에 redirect: '/login'을 두면 안 된다 - vue-router가 '/'에서 이 라우트의
            // component/children을 무시하고 무조건 /login으로 보내버려서, 로그인 성공 후
            // router.push('/')를 해도 다시 로그인 화면으로 튕긴다.
            path: '/',
            component: DefaultLayout,
            meta: {requiresAuth: true},
            children: [
                {path: '', name: 'home', component: Home},
                {path: 'map', name: 'map', component: Map},
                {path: 'pay', name: 'pay', component: Payments},
                {path: 'cards', name: 'cards', component: Cards},
                {path: 'bookmarks', name: 'bookmarks', component: () => import('@/pages/Bookmarks.vue')},
            ],
        },
        {
            path: '/payments',
            name: 'Payments',
            component: () => import('@/pages/PaymentsList.vue'),
            meta: {requiresAuth: true},
        },
        // 카드 목록(/cards)에서 카드를 눌렀을 때 들어가는 상세 화면
        {
            path: '/cards/:userCardId',
            name: 'card-detail',
            component: () => import('@/pages/Carddetail.vue'),
            meta: {requiresAuth: true},
        },
        // 매장 목록/지도에서 매장을 눌렀을 때 들어가는 상세 화면
        {
            path: '/stores/:merchantId',
            name: 'store-detail',
            component: () => import('@/pages/Storedetail.vue'),
            meta: {requiresAuth: true},
        },
    ],
})

router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    // 새로고침이나 첫 진입이면 저장된 토큰으로 자동 로그인을 먼저 시도한다. 두 번째 호출부터는
    // 이미 끝난 Promise를 그대로 돌려받으므로 라우팅이 느려지지 않는다.
    await authStore.bootstrapSession()

    // 토큰이 없거나 모두 만료됐다 - 로그인 화면을 띄운다.
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        // 로그인 후 원래 가려던 곳으로 돌려보내기 위해 경로를 남긴다. 기본값이 홈이라
        // '/'는 굳이 붙이지 않는다.
        return {
            name: 'login',
            query: to.fullPath === '/' ? {} : {redirect: to.fullPath},
        }
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
        return {name: 'home'}
    }

    return true
})

export default router