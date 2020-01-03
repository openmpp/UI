<!-- monitor progress of new model run -->
<template>

<span id="new-run-progress">
  <span
    @click="runLogPauseToggle()"
    class="om-cell-icon-link material-icons"
    :alt="!isPaused ? 'Pause' : 'Refresh'"
    :title="!isPaused ? 'Pause' : 'Refresh'">{{!isPaused ? (isFlip ? 'autorenew' : 'loop') : 'play_circle_outline'}}</span>
  <span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'

const PROGRESS_UPDATE_TIME = 1000 // msec, run progress update time

export default {
  props: {
    modelDigest: { type: String, default: '' },
    newRunStamp: { type: String, default: '' },
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
  },

  methods: {
    // refersh model run progress
    refreshRunProgress () {
      if (this.loadWait || this.isPaused) return
      this.isFlip = !this.isFlip
      this.doNewRunProgress()
    },

    // pause on/off
    runLogPauseToggle () { this.isPaused = !this.isPaused },

    // refresh new model run state: receive run state and log page from the server
    async doNewRunProgress () {
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
        '/stamp/' + (this.newRunStamp || '') +
        '/start/' + nStart.toString() +
        '/count/' + nCount.toString()

      try {
        // send data page to the server, response body expected to be empty
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

      // return run status
      if (!Mdf.isRunStateLog(rlp)) rlp = Mdf.emptyRunStateLog()
      this.$emit('done', this.loadDone, rlp)
    }
  },

  mounted () {
    this.doNewRunProgress()
    this.updateInt = setInterval(this.refreshRunProgress, PROGRESS_UPDATE_TIME)
  },
  beforeDestroy () {
    clearInterval(this.updateInt)
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";
  @import "@material/textfield/mdc-text-field";
  @import "@/om-mcw.scss";
</style>
