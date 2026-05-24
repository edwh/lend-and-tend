import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faSeedling,
  faPersonDigging,
} from '@fortawesome/free-solid-svg-icons'

export default defineNuxtPlugin(() => {
  library.add(faSeedling, faPersonDigging)
})
