import BaseAPI from './BaseAPI'

export default class SessionAPI extends BaseAPI {
  fetch(params) {
    return this.$getv2('/session', params)
  }

  fetchv2(params, log = true) {
    return this.$getv2('/session', params, log)
  }

  login(email, password, log = true) {
    return this.$postv2(
      '/session',
      { email, password },
      log
    )
  }

  logout() {
    return this.$delv2('/session', null, true)
  }

  register(email, password, log = true) {
    return this.$postv2(
      '/user',
      { email, password },
      log
    )
  }
}
