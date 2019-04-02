import Vue from 'vue'
import 'core-js/es6/promise'
import store from './store'
import router from './router'
import App from './App'
import { VuePlugin } from 'vuera'

Vue.use(VuePlugin)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  store,
  router,
  render: h => h(App)
})
