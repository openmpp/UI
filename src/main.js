// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import 'core-js/shim' // IE11
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
/* eslint-enable no-new */
