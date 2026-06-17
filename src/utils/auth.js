import { reactive, watch } from 'vue'

const TOKEN_KEY = 'ourvideos_token'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || ''
})

watch(() => state.token, (val) => {
  if (val) {
    localStorage.setItem(TOKEN_KEY, val)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
})

export function setToken(token) {
  state.token = token
}

export function getToken() {
  return state.token
}

export function clearToken() {
  state.token = ''
}

export function isLoggedIn() {
  return !!state.token
}

export default state
