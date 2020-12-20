<!-- monitor progress of model run: receive run state and run log from the server -->
<template>

<span id="run-log-refresh">
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
    refreshTickle: { type: Boolean, default: false },
    start: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      isPaused: false,
      isFlip: false,
      msgLoad: '',
      updateInt: ''
    }
  },

  computed: {
    ...mapGetters({
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    // refresh handlers
    refreshTickle () { this.doRunLogRefresh() },
    modelDigest () { this.doRunLogRefresh() },
    runStamp () { this.doRunLogRefresh() }
  },

  methods: {
    // receive run state and log page from the server
    async doRunLogRefresh () {
      if ((this.modelDigest || '') === '') return // exit: model digest unknown

      this.loadDone = false
      this.loadWait = true
      this.msgLoad = ''
      this.$emit('wait')

      // set new run parameters
      let rlp = Mdf.emptyRunStateLog()
      let nStart = (this.start || 0) > 0 ? (this.start || 0) : 0
      let nCount = (this.count || 0) > 0 ? (this.count || 0) : 0

      let u = this.omppServerUrl +
        '/api/run/log/model/' + (this.modelDigest || '') +
        '/stamp/' + (this.runStamp || '') +
        '/start/' + nStart.toString() +
        '/count/' + nCount.toString()

      try {
        // send request to the server
        const response = await axios.get(u)
        rlp = response.data
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

      // return state of run log progress
      if (!Mdf.isRunStateLog(rlp)) rlp = Mdf.emptyRunStateLog()
      this.$emit('done', this.loadDone, rlp)
    }
  },

  mounted () {
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
</style>
