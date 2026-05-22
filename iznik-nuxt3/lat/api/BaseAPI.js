import { useAuthStore } from '~/stores/auth'

export default class BaseAPI {
  constructor(config) {
    this.config = config
  }

  async $requestv2(method, path, config = {}, logError = true) {
    const authStore = useAuthStore()
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=0, must-revalidate, no-cache, no-store, private',
      ...config.headers,
    }

    if (authStore.auth?.persistent) {
      headers.Authorization = 'Iznik ' + JSON.stringify(authStore.auth.persistent)
    }

    let body = null
    if (method === 'GET' && config.params) {
      const urlParams = new URLSearchParams()
      for (const [key, value] of Object.entries(config.params)) {
        if (Array.isArray(value)) {
          urlParams.append(key, value.join(','))
        } else {
          urlParams.append(key, value)
        }
      }
      const urlParamsStr = urlParams.toString()
      if (urlParamsStr.length) {
        path += (path.includes('?') ? '&' : '?') + urlParamsStr
      }
    } else if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
      body = JSON.stringify(config.data || config.params || {})
    }

    try {
      const response = await fetch(this.config.public.APIv2 + path, {
        method,
        headers,
        body,
        credentials: 'include',
      })

      const data = response.ok ? await response.json() : null

      if (response.status === 401) {
        authStore.setAuth(null, null)
        authStore.setUser(null)
        throw new Error('Unauthorized')
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data?.message || response.statusText}`)
      }

      if (data?.jwt && data?.persistent) {
        if (authStore.auth?.jwt) {
          authStore.setAuth(data.jwt, data.persistent)
        }
      }

      return data
    } catch (error) {
      if (logError === true || (typeof logError === 'function' && logError(error))) {
        console.error(`API Error ${method} ${path}:`, error.message)
      }
      throw error
    }
  }

  $getv2(path, params = {}, logError = true) {
    return this.$requestv2('GET', path, { params }, logError)
  }

  $postv2(path, data, logError = true) {
    return this.$requestv2('POST', path, { data }, logError)
  }

  $patchv2(path, data, logError = true) {
    return this.$requestv2('PATCH', path, { data }, logError)
  }

  $putv2(path, data, logError = true) {
    return this.$requestv2('PUT', path, { data }, logError)
  }

  $delv2(path, data, logError = true) {
    return this.$requestv2('DELETE', path, { data }, logError)
  }
}
