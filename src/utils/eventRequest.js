import axios from 'axios'
import { EVENT_API_BASE_URL } from '../config'

const instance = axios.create({
  baseURL: EVENT_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    return res
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default instance