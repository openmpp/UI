<template>
  <div id="license-page" class="mdc-typography mdc-typography--body1">
   <span v-if="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span>{{ msg }}
  </div>
</template>

<script>
import axios from 'axios'

export default {
  props: {
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      publicPath: (process.env.BASE_URL || '/'),
      msg: ''
    }
  },

  computed: {
  },

  methods: {
    // refersh page content
    async doRefresh () {
      this.loadDone = false
      this.loadWait = true
      this.msg = 'Loading...'
      try {
        const response = await axios.get(this.publicPath + 'LICENSE.txt')
        this.msg = response.data
        this.loadDone = true
      } catch (e) {
        let em = ''
        this.msg = 'Server offline or LICENSE.txt not found.'
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.log('Server offline or LICENSE.txt not found.', em)
      }
      this.loadWait = false
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  #license-page {
    display: block;
    height: 100%;
    width: 100%;
    overflow: auto;
    white-space: pre;
    font-family: "Roboto Mono", monospace;
  }
</style>
