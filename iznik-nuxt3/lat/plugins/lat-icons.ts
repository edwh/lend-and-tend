import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faSeedling,
  faPersonDigging,
  faUserCircle,
} from '@fortawesome/free-solid-svg-icons'

export default defineNuxtPlugin(() => {
  // faUserCircle: the Settings page account icon (it was logging "Could not
  // find one or more icon(s)" and rendering nothing).
  library.add(faSeedling, faPersonDigging, faUserCircle)
})
