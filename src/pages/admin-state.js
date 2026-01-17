import { mapState } from 'pinia'
import { useServerStateStore } from '../stores/server-state'
import { useUiStateStore } from '../stores/ui-state'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'
import * as Mdf from 'src/model-common'
import { copyToClipboard } from 'quasar'

/* eslint-disable no-multi-spaces */
const ADMIN_STATE_REFRESH_TIME = 1973 // msec, admin state refresh interval
const MAX_STATE_SEND_COUNT = 5        // max request to send without response
const MAX_NO_STATE_COUNT = 4          // max invalid response count
/* eslint-enable no-multi-spaces */

export default {
  name: 'AdminState',
  components: { DeleteConfirmDialog },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      adminState: Mdf.emptyAdminState(),
      isShowServers: false,
      isShowOmsActive: false,
      isShowActiveRuns: true,
      isShowQueueRuns: false,
      locale: '',
      activeRunState: { // active job control state: key is 'Oms-SubmitStamp', value is JobRun
      },
      isShowActiveFilter: false,
      omsActiveFilter: [],
      nameActiveFilter: [],
      digestActiveFilter: [],
      activeRunLog: {
        user: '',
        submit: '',
        fileName: '',
        lines: []
      },
      queueRunState: { // queue job control state: key is 'Oms-SubmitStamp', value is JobRun
      },
      isShowQueueFilter: false,
      omsQueueFilter: [],
      nameQueueFilter: [],
      digestQueueFilter: [],
      stopRunTitle: '',
      stopSubmitStamp: '',
      stopOmsName: '',
      showStopRunTickle: false,
      isRefreshPaused: false,
      isRefreshDisabled: false,
      stateRefreshTickle: 0,
      stateSendCount: 0,
      stateNoDataCount: 0,
      stateRefreshInt: ''
    }
  },

  computed: {
    isConfigAdminAll () { return !!this.serverConfig.IsAdminAll },

    ...mapState(useServerStateStore, {
      omsUrl: 'omsUrl',
      serverConfig: 'config'
    }),
    ...mapState(useUiStateStore, [
      'uiLang'
    ])
  },

  watch: {
    refreshTickle () { this.initView() },
    isConfigAdminAll () { this.initView() }
  },

  methods: {
    isUnderscoreTs (ts) { return Mdf.isUnderscoreTimeStamp(ts) },
    fromUnderscoreTs (ts) { return Mdf.isUnderscoreTimeStamp(ts) ? Mdf.fromUnderscoreTimeStamp(ts) : ts },
    isSuccess (status) { return status === 'success' },
    isInProgress (status) { return status === 'progress' || status === 'init' || status === 'wait' },
    runStatusDescr (status) { return Mdf.statusText(status) },

    // convert last used milliseconds date-time to timestamp string
    // return empty '' string if it is before 2022-08-17 23:45:59
    lastUsedDt (ts) {
      return (!!ts && ts > Date.UTC(2022, 7, 17, 23, 45, 59)) ? Mdf.dtToTimeStamp(new Date(ts)) : ''
    },

    // return count of oms users where disk usage is over the limit
    omsDiskOverCount () {
      if (!this.adminState.IsDiskUse || !Array.isArray(this.adminState?.OmsActive)) return 0

      let n = 0
      for (const om of this.adminState.OmsActive) {
        if (om.IsDiskOver) n++
      }
      return n
    },

    // convert size in MBytes to string
    sizeMbStr (sizeMb) {
      if (!sizeMb || typeof sizeMb !== typeof 1 || sizeMb < 0) return '0'
      if (this.locale) {
        return sizeMb.toLocaleString(this.locale)
      }
      return sizeMb.toFixed(0)
    },

    // update page view
    initView () {
      this.adminState = Mdf.emptyAdminState()
      this.clearActiveRunLog()
      this.activeRunState = {}
      this.clearActiveFilter()
      this.queueRunState = {}
      this.clearQueueFilter()

      // locale for number formatting
      let lc = this.uiLang || this.$q.lang.getLocale() || ''
      if (lc) {
        try {
          const cla = Intl.getCanonicalLocales(lc)
          lc = cla?.[0] || ''
        } catch (e) {
          lc = ''
          console.warn('Error: undefined canonical locale:', e)
        }
      }
      this.locale = (typeof lc === typeof 'string') ? lc : ''

      // restart config refresh
      this.stopRefresh()
      if (this.isConfigAdminAll) {
        this.startRefresh()
      }
    },

    // refersh admin state
    onStateRefresh () {
      if (this.isRefreshPaused) {
        return
      }
      this.stateRefreshTickle = !this.stateRefreshTickle
      if (this.stateSendCount < MAX_STATE_SEND_COUNT) {
        this.doStateRefresh()
      }
    },
    refreshPauseToggle () {
      this.stateSendCount = 0
      this.stateNoDataCount = 0
      this.isRefreshPaused = !this.isRefreshPaused
    },
    startRefresh () {
      this.isRefreshPaused = false
      this.isRefreshDisabled = false
      this.stateSendCount = 0
      this.stateNoDataCount = 0
      this.stateRefreshInt = setInterval(this.onStateRefresh, ADMIN_STATE_REFRESH_TIME)
    },
    stopRefresh () {
      this.isRefreshDisabled = true
      clearInterval(this.stateRefreshInt)
    },

    // return array of servers from RunCompUsage by oms name and sumit stamp
    runCompUse (oms, stamp) {
      const rcu = []
      for (const r of this.adminState.RunCompUsage) {
        if (r.Oms === oms && r.SubmitStamp === stamp) rcu.push(r)
      }
      return rcu
    },

    // clear all active runs filters
    clearActiveFilter () {
      this.isShowActiveFilter = false
      this.omsActiveFilter = []
      this.nameActiveFilter = []
      this.digestActiveFilter = []
    },

    // return total number of values in active runs filters
    countActiveFilter () {
      return this.omsActiveFilter.length + this.nameActiveFilter.length + this.digestActiveFilter.length
    },

    // apply active runs filters: actual apply is in template
    applyActiveFilter () {
      this.isShowActiveFilter = false // hide checkboxes
    },

    // return true if oms of active run is in filter: show active runs for this oms
    isOmsInActiveFilter (oms) {
      if (!oms || !this.omsActiveFilter.length) { // ignore empty filter
        return true
      }
      return this.omsActiveFilter.findIndex(v => v === oms) >= 0
    },

    // return true if model name of active run is in filter: show active runs for this model name
    isNameInActiveFilter (name) {
      if (!name || !this.nameActiveFilter.length) { // ignore empty filter
        return true
      }
      return this.nameActiveFilter.findIndex(v => v === name) >= 0
    },

    // return true if this model digest of active run is in filter: show active runs for this model digest
    isDigestInActiveFilter (dgst) {
      if (!dgst || !this.digestActiveFilter.length) { // ignore empty filter
        return true
      }
      return this.digestActiveFilter.findIndex(v => v === dgst) >= 0
    },

    // do show or hide active job control state
    onActiveRunState (oms, stamp) {
      if (this.isActiveRunState(oms, stamp)) {
        this.clearActiveRunState(oms, stamp)
      } else {
        this.getActiveRunState(oms, stamp)
      }
    },
    // return true if active job control state is avalibale for that oms and submit stamp
    isActiveRunState (oms, stamp) {
      return !!this.findActiveRunState(oms, stamp)
    },
    // return true if active job control state is avalibale for that oms and submit stamp
    findActiveRunState (oms, stamp) {
      if (!oms || !stamp) return ''
      const key = oms + '-' + stamp
      if (!this.activeRunState?.[key]) return ''
      const rj = this.activeRunState?.[key]
      return Mdf.isRunJob(rj) ? rj : ''
    },
    // delete job active control state: set value of ['oms-stamp'] to empty '' string
    clearActiveRunState (oms, stamp) {
      if (!oms || !stamp) return
      const key = oms + '-' + stamp
      if (this.activeRunState?.[key]) this.activeRunState[key] = ''
    },

    // return active job control state as string
    viewActiveRunState (oms, stamp) {
      const rj = this.findActiveRunState(oms, stamp)
      if (!rj) return ''

      try {
        return JSON.stringify(rj, null, 2)
      } catch (e) {
        console.warn('Unable to convert model run info:', oms, stamp, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to convert model run info') })
        this.clearActiveRunState(oms, stamp) // clean active job control state
      }
      return '' // retrun empty on error
    },

    // copy job active control state as string to clipboard
    async toClipboardActiveRunState (oms, stamp) {
      const txt = this.viewActiveRunState(oms, stamp)
      if (!txt) {
        console.warn('empty job control state:', txt)
        this.$q.notify({ type: 'warning', message: this.$t('Unable to copy model run info to clipboard') })
        return
      }
      try {
        await copyToClipboard(txt)
        this.$q.notify({ type: 'info', message: this.$t('Copy model run info to clipboard:') + txt.length + ' ' + this.$t('characters') })
      } catch (e) {
        console.warn('Unable copy to job control state to clipboard:', e)
        this.$q.notify({ type: 'warning', message: this.$t('Unable to copy model run info to clipboard') })
      }
    },

    // clean active run log selection
    clearActiveRunLog () {
      this.activeRunLog.user = ''
      this.activeRunLog.submit = ''
      this.activeRunLog.fileName = ''
      this.activeRunLog.lines = []
    },

    // return true if run log is avalibale for that oms and submit stamp
    isActiveRunLog (oms, stamp) {
      if (!oms || !stamp) return false
      return ((this.activeRunLog.user || '') === oms && (this.activeRunLog.submit || '') === stamp)
    },

    // do show or hide active run log
    onActiveRunLog (oms, stamp) {
      if (!oms || !stamp) return

      // if this is an active run log
      const isActive = ((this.activeRunLog.user || '') === oms && (this.activeRunLog.submit || '') === stamp)
      this.clearActiveRunLog() // clear any selected run log
      if (isActive) {
        return
      }
      // else there is no currently selected run log: select new
      this.activeRunLog.user = oms
      this.activeRunLog.submit = stamp
    },

    // copy active run log string to clipboard
    async toClipboardActiveRunLog (oms, stamp) {
      if (!this.isActiveRunLog(oms, stamp)) return

      const txt = this.activeRunLog.lines.join('\n')
      if (!txt) {
        console.warn('empty active run log:', txt)
        this.$q.notify({ type: 'warning', message: this.$t('Unable to copy model run log to clipboard') })
        return
      }
      try {
        await copyToClipboard(txt)
        this.$q.notify({ type: 'info', message: this.$t('Copy model run log to clipboard:') + txt.length + ' ' + this.$t('characters') })
      } catch (e) {
        console.warn('Unable to copy model run log:', e)
        this.$q.notify({ type: 'warning', message: this.$t('Unable to copy model run log to clipboard') })
      }
    },

    // clear all queue runs filters
    clearQueueFilter () {
      this.isShowQueueFilter = false
      this.omsQueueFilter = []
      this.nameQueueFilter = []
      this.digestQueueFilter = []
    },

    // return total number of values in queue runs filters
    countQueueFilter () {
      return this.omsQueueFilter.length + this.nameQueueFilter.length + this.digestQueueFilter.length
    },

    // apply queue runs filters: actual apply is in template
    applyQueueFilter () {
      this.isShowQueueFilter = false // hide checkboxes
    },

    // return true if oms of queue run is in filter: show queue runs for this oms
    isOmsInQueueFilter (oms) {
      if (!oms || !this.omsQueueFilter.length) { // ignore empty filter
        return true
      }
      return this.omsQueueFilter.findIndex(v => v === oms) >= 0
    },

    // return true if model name of queue run is in filter: show queue runs for this model name
    isNameInQueueFilter (name) {
      if (!name || !this.nameQueueFilter.length) { // ignore empty filter
        return true
      }
      return this.nameAQueueFilter.findIndex(v => v === name) >= 0
    },

    // return true if this model digest of queue run is in filter: show queue runs for this model digest
    isDigestInQueueFilter (dgst) {
      if (!dgst || !this.digestQueueFilter.length) { // ignore empty filter
        return true
      }
      return this.digestQueueFilter.findIndex(v => v === dgst) >= 0
    },

    // do show or hide queue job control state
    onQueueRunState (oms, stamp) {
      if (this.isQueueRunState(oms, stamp)) {
        this.clearQueueRunState(oms, stamp)
      } else {
        this.getQueueRunState(oms, stamp)
      }
    },
    // return true if queue job control state is avalibale for that oms and submit stamp
    isQueueRunState (oms, stamp) {
      return !!this.findQueueRunState(oms, stamp)
    },
    // return true if queue job control state is avalibale for that oms and submit stamp
    findQueueRunState (oms, stamp) {
      if (!oms || !stamp) return ''
      const key = oms + '-' + stamp
      if (!this.queueRunState?.[key]) return ''
      const rj = this.queueRunState?.[key]
      return Mdf.isRunJob(rj) ? rj : ''
    },
    // delete queue job control state: set value of ['oms-stamp'] to empty '' string
    clearQueueRunState (oms, stamp) {
      if (!oms || !stamp) return
      const key = oms + '-' + stamp
      if (this.queueRunState?.[key]) this.queueRunState[key] = ''
    },

    // return queue job control state as string
    viewQueueRunState (oms, stamp) {
      const rj = this.findQueueRunState(oms, stamp)
      if (!rj) return ''

      try {
        return JSON.stringify(rj, null, 2)
      } catch (e) {
        console.warn('Unable to convert model run info:', oms, stamp, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to convert model run info') })
        this.clearQueueRunState(oms, stamp) // clean queue job control state
      }
      return '' // retrun empty on error
    },

    // copy queue job control state as string to clipboard
    async toClipboardQueueRunState (oms, stamp) {
      const txt = this.viewQueueRunState(oms, stamp)
      if (!txt) {
        console.warn('empty job control state:', txt)
        this.$q.notify({ type: 'warning', message: this.$t('Unable to copy model run info to clipboard') })
        return
      }
      try {
        await copyToClipboard(txt)
        this.$q.notify({ type: 'info', message: this.$t('Copy model run info to clipboard:') + txt.length + ' ' + this.$t('characters') })
      } catch (e) {
        console.warn('Unable copy to job control state to clipboard:', e)
        this.$q.notify({ type: 'warning', message: this.$t('Unable to copy model run info to clipboard') })
      }
    },

    // delete from the queue: ask user confirmation to delete model run
    onStopRunConfirm (oms, stamp) {
      if (this.adminState.QueueRuns.findIndex(qr => qr.Oms === (oms || '') && qr.SubmitStamp === (stamp || '')) < 0) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to find model run') + (oms || '') + ' ' + (stamp || '') })
        return
      }
      this.stopRunTitle = oms + ' ' + this.fromUnderscoreTs(stamp)
      this.stopSubmitStamp = stamp
      this.stopOmsName = oms
      this.showStopRunTickle = !this.showStopRunTickle
    },

    // user answer is Yes to delete model run from the queue
    async onYesStopRun (title, stamp, oms) {
      if (!oms || !stamp) {
        console.warn('Unable to stop: user (oms) or submit stamp is empty', oms, stamp)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to stop: user (oms) or submit stamp is empty') })
        return
      }

      const u = this.omsUrl +
        'api/admin-all/run/stop/queue/' + encodeURIComponent(oms) +
        /stamp/ + encodeURIComponent(stamp)
      try {
        await this.$axios.put(u) // ignore response on success
      } catch (e) {
        console.warn('Unable to stop model run', e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to stop model run: ') + title })
        return // exit on error
      }

      // notify user on success, even run may not exist
      this.$q.notify({ type: 'info', message: this.$t('Stopping model run: ') + title })
    },

    // receive server configuration, including configuration of model catalog and run catalog
    async doStateRefresh () {
      this.stateSendCount++

      let u = this.omsUrl + 'api/admin-all/state'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        const std = response?.data
        if (Mdf.isAdminState(std)) { // if response is a admin state
          this.stateSendCount = 0
          this.stateNoDataCount = 0
          this.adminState = std
        } else {
          this.stateNoDataCount++
        }
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        if (this.stateNoDataCount++ <= MAX_NO_STATE_COUNT) {
          console.warn('Server offline or state retrieval failed.', em)
        }
      }
      if (this.stateNoDataCount > MAX_NO_STATE_COUNT) {
        this.isRefreshPaused = true
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or state retrieval failed.') })
        return
      }

      // clear active run state and queue run state
      const ak = Object.keys(this.activeRunState)
      for (const key of ak) {
        if (this.adminState.ActiveRuns.findIndex(ar => ar.Oms + '-' + ar.SubmitStamp === key) < 0) {
          this.activeRunState[key] = ''
        }
      }
      const qk = Object.keys(this.queueRunState)
      for (const key of qk) {
        if (this.adminState.QueueRuns.findIndex(qr => qr.Oms + '-' + qr.SubmitStamp === key) < 0) {
          this.queueRunState[key] = ''
        }
      }

      // check if active run log selected to view and it still active
      if (!(this.activeRunLog.user || '') || !(this.activeRunLog.submit || '')) {
        return
      }
      if (this.adminState.ActiveRuns.findIndex(ar => ar.Oms === this.activeRunLog.user && ar.SubmitStamp === this.activeRunLog.submit) < 0) {
        this.clearActiveRunLog()
        return
      }

      // update active run log
      let isOk = false
      let ml = []
      const oms = this.activeRunLog.user || ''
      const stamp = this.activeRunLog.submit || ''
      u = this.omsUrl +
        'api/admin-all/job/active/' + encodeURIComponent(oms) + /stamp/ + encodeURIComponent(stamp) + '/log'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        ml = response.data
        isOk = Array.isArray(ml) // if response is run log file name and lines
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Unable to get model run log:', oms, stamp, em)
      }

      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to get model run log:') + ' ' + oms + ' ' + stamp })
        this.clearActiveRunLog()
        return
      }

      // else: update model run log file name and lines
      this.activeRunLog.fileName = (ml.length > 0 && typeof ml[0] === typeof 'string') ? ml[0] : ''
      this.activeRunLog.lines = (ml.length > 1) ? ml.slice(1) : []
    },

    // get active job control state
    async getActiveRunState (oms, stamp) {
      if (!oms || !stamp) {
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) oms user  or submit stamp:') + ' ' + (oms || '') + ' ' + (stamp || '') })
        return
      }

      // update active run log
      let isOk = false
      const u = this.omsUrl +
        'api/admin-all/job/active/' + encodeURIComponent(oms) + /stamp/ + encodeURIComponent(stamp) + '/state'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        const rj = response.data
        isOk = Mdf.isNotEmptyRunJob(rj) // if response is job control state
        this.activeRunState[oms + '-' + stamp] = rj
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Unable to retrieve model run info:', oms, stamp, em)
      }

      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to retrieve model run info:') + ' ' + oms + ' ' + stamp })
      }
    },

    // get queue job control state
    async getQueueRunState (oms, stamp) {
      if (!oms || !stamp) {
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) oms user  or submit stamp:') + ' ' + (oms || '') + ' ' + (stamp || '') })
        return
      }

      // update queue run log
      let isOk = false
      const u = this.omsUrl +
        'api/admin-all/job/queue/' + encodeURIComponent(oms) + /stamp/ + encodeURIComponent(stamp) + '/state'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        const rj = response.data
        isOk = Mdf.isNotEmptyRunJob(rj) // if response is job control state
        this.queueRunState[oms + '-' + stamp] = rj
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Unable to retrieve model run info:', oms, stamp, em)
      }

      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to retrieve model run info:') + ' ' + oms + ' ' + stamp })
      }
    },

    // pause or resume all model runs queue
    async doQueuePauseResume (isPause) {
      const u = this.omsUrl + '/api/admin-all/jobs-pause/' + (isPause ? 'true' : 'false')
      try {
        await this.$axios.post(u) // ignore response on success
      } catch (e) {
        console.warn('Unable to pause or resume all model run queues', isPause, e)
        this.$q.notify({ type: 'negative', message: this.$t(isPause ? 'Unable to pause all model run queues' : 'Unable to resume all model run queues') })
        return // exit on error
      }

      // notify user on success, actual service state update dealyed
      this.$q.notify({ type: 'info', message: this.$t(isPause ? 'Pausing all model run queues...' : 'Resuming all model run queues...') })
    }
  },

  mounted () {
    this.initView()
  },
  beforeUnmount () {
    this.stopRefresh()
  }
}
