<!-- monitor progress of model run: receive run progress from the server -->
<template>

<span id="run-progress-refersh">
  <span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'

export default {
  props: {
    modelDigest: { type: String, default: '' },
    runStamp: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      msgLoad: ''
    }
  },

  computed: {
    ...mapGetters({
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    // refresh handlers
    refreshTickle () { this.doRunProgressRefresh() },
    modelDigest () { this.doRunProgressRefresh() },
    runStamp () { this.doRunProgressRefresh() }
  },

  methods: {
    // receive run status and progress from the server
    async doRunProgressRefresh () {
      if ((this.modelDigest || '') === '') return // exit: model digest unknown

      this.loadDone = false
      this.loadWait = true
      this.msgLoad = ''
      this.$emit('wait')

      let rpl = [] // set run progress list to empty array initially

      let u = this.omppServerUrl +
        '/api/model/' + (this.modelDigest || '') +
        '/run/' + (this.runStamp || '') +
        '/status/list'

      try {
        // send data page to the server, response body expected to be empty
        const response = await axios.get(u)
        rpl = response.data
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or run status retrive failed>'
        console.log('Server offline or run status retrive failed.', em)
      }
      this.loadWait = false

      // return array of run status and progress elements or empty on error
      if (!Mdf.isRunStatusProgressList(rpl)) rpl = []
      this.$emit('done', this.loadDone, rpl)
    }
  },

  mounted () {
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
</style>
