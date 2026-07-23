import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // 프록시 설정을 통해 localhost:8080/api로 매핑됨
  timeout: 5000,
});

export default api;