import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3333'
})

console.log('🌐 API baseURL:', api); // Verifique no console
console.log('API Base URL:', api.defaults.baseURL); // Verifique no console

export default api