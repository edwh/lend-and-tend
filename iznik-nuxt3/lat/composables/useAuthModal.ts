import { ref, readonly } from 'vue'

type AuthMode = 'login' | 'register'

const _open = ref(false)
const _mode = ref<AuthMode>('login')

export function useAuthModal() {
  function open(mode: AuthMode = 'login') {
    _mode.value = mode
    _open.value = true
  }

  function close() {
    _open.value = false
  }

  return {
    isOpen: readonly(_open),
    mode: readonly(_mode),
    open,
    close,
  }
}
