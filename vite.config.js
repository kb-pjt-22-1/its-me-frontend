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
        globals: true,
        // 아직 작성된 테스트가 없어도 CI가 실패하지 않도록 함.
        // 테스트가 하나라도 생기면 자동으로 정상 동작.
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: './coverage',
        },
    },
})