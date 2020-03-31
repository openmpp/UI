// import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import RunLogRefresh from './RunLogRefresh'
import RunProgressRefresh from './RunProgressRefresh'

/* eslint-disable no-multi-spaces */
const MAX_EMPTY_LOG_COUNT = 10         // pause progress refresh if empty response exceed this count (10 = 10 seconds)
const RUN_PROGRESS_REFRESH_TIME = 1000 // msec, run progress refresh time
const RUN_PROGRESS_SUB_RATIO = 4       // multipler for refresh time to get sub values progress
const MIN_LOG_COUNT = 200              // min size of page log read request
/* eslint-enable no-multi-spaces */

export default {
  components: { RunLogRefresh, RunProgressRefresh },

  props: {
    digest: { type: String, default: '' },
    runStamp: { type: String, default: '' }
  },

  data () {
    return {
      isRefreshCompleted: false,
      isRefreshPaused: false,
      isLogRefresh: false,
      isProgressRefresh: false,
      refreshInt: '',
      refreshCount: 0,
      runName: '',
      runDigest: '',
      runState: Mdf.emptyRunState(),
      runProgress: [],
      emptyLogCount: 0,
      logStart: 0,
      logCount: MIN_LOG_COUNT,
      logLines: []
    }
  },

  computed: {
    routeKey () {
      return Mdf.runLogRouteKey(this.digest, this.runStamp)
    },
    ...mapGetters({
      runTextList: GET.RUN_TEXT_LIST
    })
  },
  watch: {
    routeKey () {
      this.initView()
      this.$emit('tab-mounted', 'run-log', { digest: this.digest, runOrSet: 'run', runStamp: this.runStamp, runSetKey: (this.runDigest || '') })
    }
  },

  methods: {
    // initialize current page view
    initView () {
      this.isRefreshCompleted = false
      this.setRunNameDigestByStamp(this.RunStamp)
      this.runState = Mdf.emptyRunState()
      this.runProgress = []
      this.emptyLogCount = 0
      this.logStart = 0
      this.logLines = []
      this.stopRefreshProgress()
      this.startRefreshProgress()
    },

    // return run status text by run status code
    statusOfTheRun (rp) { return Mdf.statusText(rp) },

    // find run stamp in run list and set run name and run digest
    setRunNameDigestByStamp () {
      for (const rt of this.runTextList) {
        if (rt.ModelDigest === this.digest && rt.RunStamp === this.runStamp) {
          this.runName = rt.Name
          this.runDigest = rt.RunDigest
          return
        }
      }
    },

    // refersh model run progress
    refreshRunProgress () {
      if (this.isRefreshPaused) return
      if (!this.runName) this.setRunNameDigestByStamp(this.runStamp)
      //
      this.isLogRefresh = !this.isLogRefresh
      this.refreshCount++
      if (this.refreshCount < RUN_PROGRESS_SUB_RATIO || (this.refreshCount % RUN_PROGRESS_SUB_RATIO) === 1) {
        this.isProgressRefresh = !this.isProgressRefresh
      }
    },
    // pause on/off run progress refresh
    runRefreshPauseToggle () {
      this.emptyLogCount = 0
      this.refreshCount = 0
      this.isRefreshPaused = !this.isRefreshPaused
    },
    startRefreshProgress () {
      this.isRefreshPaused = false
      this.refreshCount = 0
      this.emptyLogCount = 0
      this.refreshInt = setInterval(this.refreshRunProgress, RUN_PROGRESS_REFRESH_TIME)
    },
    stopRefreshProgress () {
      this.refreshCount = 0
      clearInterval(this.refreshInt)
    },

    // model current run log progress: response from server
    doneRunLogRefresh (ok, rlp) {
      if (!ok) return
      if (!Mdf.isNotEmptyRunStateLog(rlp)) {
        if (this.emptyLogCount++ > MAX_EMPTY_LOG_COUNT) this.isRefreshPaused = true // pause refresh if run state and log not available
        return
      }
      this.runState = Mdf.toRunStateFromLog(rlp)
      this.emptyLogCount = 0

      // update log lines
      let nStart = this.logLines.length - rlp.Offset
      if (nStart >= 0) {
        let nLen = (rlp.Offset + rlp.Size) - this.logLines.length
        for (let k = nStart; k < nLen; k++) {
          this.logLines.push(rlp.Lines[k] || '')
        }
      }

      // check is it final update: model run completed
      let isDone = (this.runState.IsFinal && rlp.Offset + rlp.Size >= rlp.TotalSize)
      if (!isDone) {
        this.logStart = this.logLines.length
        this.logCount = rlp.TotalSize - this.logStart
        if (this.logCount < MIN_LOG_COUNT) this.logCount = MIN_LOG_COUNT
      } else {
        this.stopRefreshProgress()
        this.isProgressRefresh = !this.isProgressRefresh // last refersh of run progress
        this.isRefreshCompleted = true
        this.$emit('run-list-refresh')
      }
    },

    // model run status progress: response from server
    doneRunProgressRefresh (ok, rpl) {
      if (!ok || !Mdf.isLength(rpl)) return // empty run progress or error

      this.runProgress = rpl

      // if last run progress entry not empty then update run name, run digest and digest refresh run list
      const n = Mdf.lengthOf(rpl) - 1
      if (!Mdf.isNotEmptyRunStatusProgress(rpl[n])) return

      if (!!rpl[n].Name && !!rpl[n].RunDigest && (this.runName !== rpl[n].Name || this.runDigest !== rpl[n].RunDigest)) {
        this.runName = rpl[n].Name
        this.runDigest = rpl[n].RunDigest
        this.$emit('tab-title-update', 'run-log', { digest: this.digest, runOrSet: 'run', runStamp: this.runStamp, runSetKey: (this.runDigest || '') })
        this.$emit('run-list-refresh')
      }
    }
  },

  mounted () {
    this.initView()
    this.$emit('tab-mounted', 'run-log', { digest: this.digest, runOrSet: 'run', runStamp: this.runStamp, runSetKey: (this.runDigest || '') })
  },
  beforeDestroy () {
    this.stopRefreshProgress()
  }
}
