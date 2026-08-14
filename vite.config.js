import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        open: true,
        // api/index.js는 baseURL '/api'로 요청을 보내는데, 이 프록시가 없으면 그 요청이
        // Vite 서버 자신에게 가서 index.html이 돌아오거나 404가 난다. 백엔드는
        // its-me-backend를 로컬에서 8080으로 띄운다는 전제(해당 저장소 application.properties
        // 기본값)와 맞췄다.
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
    // `npm run build`로 만든 dist를 `npm run preview`로 그대로 띄워서 확인할 때 쓴다.
    // server.proxy는 `vite dev` 전용이라 preview에는 안 넘어오므로 따로 선언해야 한다.
    preview: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    test: {
        environment: 'jsdom',
        // jsdom은 기본적으로 about:blank를 URL로 쓰는데, localStorage/sessionStorage는
        // 오리진이 있어야 동작해서 about:blank에선 window.localStorage 자체가 undefined다.
        // 실제 origin을 지정해줘야 로그인/토큰 저장 등 localStorage를 쓰는 테스트가 돌아간다.
        environmentOptions: {
            jsdom: {
                url: 'http://localhost:3000',
            },
        },
        globals: true,
        setupFiles: ['./test/setup.js'],
        // 아직 작성된 테스트가 없어도 CI가 실패하지 않도록 함.
        // 테스트가 하나라도 생기면 자동으로 정상 동작.
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: './coverage',
            // 소나큐브 sonar.coverage.exclusions와 맞춘다 - 로컬 커버리지 리포트가
            // 소나큐브가 보는 숫자와 어긋나지 않도록. 이유는 sonar-project.properties 주석 참고.
            exclude: [
                'src/config/index.js',
                'src/stores/counter.js',
                'src/layouts/menu/NavBar.vue',
                'src/layouts/menu/DefaultLayout.vue',
                'src/components/common/PageContainer.vue',
            ],
        },
    },
})