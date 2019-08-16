import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import OmMcwButton from '@/om-mcw/OmMcwButton'
import RefreshModel from './RefreshModel'
import RefreshRun from './RefreshRun'
import RefreshRunList from './RefreshRunList'
import RefreshWorkset from './RefreshWorkset'
import RefreshWorksetList from './RefreshWorksetList'
import UpdateWorksetStatus from './UpdateWorksetStatus'
import NewRunInit from './NewRunInit'
import NewRunProgress from './NewRunProgress'
import RunInfoDialog from './RunInfoDialog'
import WorksetInfoDialog from './WorksetInfoDialog'

/* eslint-disable no-multi-spaces */
const EMPTY_RUN_STEP = 0      // empty state of new model: undefined
const INIT_RUN_STEP = 1       // initiate new model run: submit request to the server
const PROC_RUN_STEP = 2       // model run in progress
const FINAL_RUN_STEP = 16     // final state of model run: completed or failed
const MIN_LOG_PAGE_SIZE = 4   // min run log page size to read from the server
const MAX_LOG_PAGE_SIZE = 10  // max run log page size to read from the server

const TABLE_LST_TAB_POS = 1 // output tables list tab position
const PARAM_LST_TAB_POS = 2 // parameter list tab position
const RUN_LST_TAB_POS = 3   // model runs list tab position
const WS_LST_TAB_POS = 4    // worksets list tab position
const FREE_TAB_POS = 16     // first unassigned tab position
/* eslint-enable no-multi-spaces */

export default {
  components: {
    OmMcwButton,
    RefreshModel,
    RefreshRun,
    RefreshRunList,
    RefreshWorkset,
    RefreshWorksetList,
    UpdateWorksetStatus,
    NewRunInit,
    NewRunProgress,
    RunInfoDialog,
    WorksetInfoDialog
  },

  props: {
    digest: '',
    refreshTickle: false
  },

  data () {
    return {
      loadModelDone: false,
      loadRunDone: false,
      loadRunListDone: false,
      loadWsDone: false,
      loadWsListDone: false,
      refreshRunTickle: false,
      refreshRunListTickle: false,
      refreshWsTickle: false,
      refreshWsListTickle: false,
      saveWsStatusTickle: false,
      mountedDone: false,
      modelName: '',
      runDigest: '',
      wsName: '',
      isFromWs: false,            // if true then page view is a workset else run
      isRunPanel: false,          // if true then run panel is visible
      newRunStep: EMPTY_RUN_STEP, // model run step: initial, start new, view progress
      newRunName: '',
      newRunSubCount: 1,
      newRunState: Mdf.emptyRunState(),
      newRunLogStart: 0,
      newRunLogSize: 0,
      newRunLineLst: [],
      tabLst: []
    }
  },

  computed: {
    loadDone () {
      return this.mountedDone &&
        this.loadModelDone && this.loadRunDone && this.loadRunListDone && this.loadWsDone && this.loadWsListDone
    },
    isSuccessTheRun () { return Mdf.isRunSuccess(this.theRunText) },
    currentRunSetKey () { return [this.runDigest, this.wsName, this.isFromWs].toString() },

    // if true then workset edit mode else readonly and model run enabled
    isWsEdit () {
      return this.isFromWs && Mdf.isNotEmptyWorksetText(this.theWorksetText) && !this.theWorksetText.IsReadonly
    },
    // make new model run name
    autoNewRunName () {
      return (this.modelName || '') + '_' + (this.wsName || '')
    },

    // model new run step: empty, initialize, in progress, final
    isEmptyRunStep () { return this.newRunStep === EMPTY_RUN_STEP },
    isInitRunStep () { return this.newRunStep === INIT_RUN_STEP },
    isProcRunStep () { return this.newRunStep === PROC_RUN_STEP },
    isFinalRunStep () { return this.newRunStep === FINAL_RUN_STEP },

    // view header line
    isNotEmptyHdr () {
      return this.isFromWs ? Mdf.isNotEmptyWorksetText(this.theWorksetText) : Mdf.isNotEmptyRunText(this.theRunText)
    },
    lastTimeOfHdr () {
      return this.isFromWs ? Mdf.dtStr(this.theWorksetText.UpdateDateTime) : Mdf.dtStr(this.theRunText.UpdateDateTime)
    },
    nameOfHdr () {
      return this.isFromWs ? (this.theWorksetText.Name || '') : (this.theRunText.Name || '')
    },
    descrOfHdr () {
      return this.isFromWs ? Mdf.descrOfTxt(this.theWorksetText) : Mdf.descrOfTxt(this.theRunText)
    },
    emptyHdrMsg () {
      return this.isFromWs ? 'No input set of parameters found' : 'No model run results'
    },
    statusOfTheRun () { return Mdf.statusText(this.theRunText) },

    ...mapGetters({
      theModel: GET.THE_MODEL,
      theRunText: GET.THE_RUN_TEXT,
      runTextList: GET.RUN_TEXT_LIST,
      theWorksetText: GET.THE_WORKSET_TEXT,
      worksetTextList: GET.WORKSET_TEXT_LIST
    })
  },

  watch: {
    // refresh button handler
    refreshTickle () {
      this.loadModelDone = false
      this.loadRunDone = false
      this.loadRunListDone = false
      this.loadWsDone = false
      this.loadWsListDone = false
    },

    // add tabs if data ready and component mounted
    loadDone () {
      if (this.loadDone) {
        this.doTabAdd(false, false, 'parameter-list')
        if (this.isSuccessTheRun) {
          this.doTabAdd(false, false, 'table-list')
          this.doTabAdd(false, false, 'run-list')
        }
        this.doTabAdd(false, false, 'workset-list')
        //
        this.doTabHeaderRefresh()
        this.doTabPathRefresh()
        this.doTabAdd(true, true, (this.isSuccessTheRun ? 'table-list' : 'parameter-list'))
      }
    },

    // change of selected run or workset
    currentRunSetKey () {
      if (this.loadDone) {
        this.doTabPathRefresh()
      }
    }
  },

  methods: {
    // reload event handlers: async get the model, runs and worksets
    doneModelLoad (isSuccess) {
      this.modelName = Mdf.modelName(this.theModel)
      this.loadModelDone = true
      this.resetRunStep()
    },
    doneRunLoad (isSuccess) {
      this.loadRunDone = true
      this.isFromWs = !isSuccess
    },
    doneRunListLoad (isSuccess) {
      this.loadRunListDone = true
      let ok = !!isSuccess
      if (ok) {
        this.runDigest = this.theRunText.Digest
      } else {
        this.isFromWs = true
        this.loadRunDone = true // do not refresh run: run list empty
      }
    },
    doneWsLoad (isSuccess) { this.loadWsDone = true },
    doneWsListLoad (isSuccess) {
      this.loadWsListDone = true
      let ok = !!isSuccess
      if (ok) {
        this.wsName = this.theWorksetText.Name
      } else {
        this.loadWsDone = true // do not refresh workset: workset list empty
      }
    },
    doneWsStatusUpdate (isSuccess) {
      // this.refreshWsTickle = !this.refreshWsTickle // refersh current workset
    },

    // run selected from the list: reload run info
    doRunSelect (dgst) {
      if ((dgst || '') === '') {
        console.warn('run digest is empty')
        return
      }
      this.runDigest = dgst
      this.isFromWs = false
    },
    // workset selected from the list: reload workset info
    doWsSelect (name) {
      if ((name || '') === '') {
        console.warn('workset name is empty')
        return
      }
      this.wsName = name
      this.isFromWs = true
    },

    // toggle workset readonly status
    doWsEditToggle () {
      this.saveWsStatusTickle = !this.saveWsStatusTickle
    },

    // on parameter updated (data dirty flag) change
    onEditUpdated (isUpdated, name) {
      const ti = this.makeTabInfo('parameter', name)
      let k = this.tabLst.findIndex((t) => t.key === ti.key)
      if (k >= 0) this.tabLst[k].updated = isUpdated
    },

    // model run methods
    //
    // show or close model run panel
    showRunPanel () { this.isRunPanel = true },
    hideRunPanel () {
      this.isRunPanel = false
      this.resetRunStep()
    },
    // clean new run data
    resetRunStep () {
      this.newRunStep = EMPTY_RUN_STEP
      this.newRunName = ''
      this.newRunSubCount = 1
      this.newRunState = Mdf.emptyRunState()
      this.newRunLogStart = 0
      this.newRunLogSize = MIN_LOG_PAGE_SIZE
      this.newRunLineLst = []
    },

    // run the model
    doModelRun () {
      // cleanup model run name and sub-count
      let name = this.$refs.runNameInput.value
      name = name.replace(/["'`$}{@\\]/g, ' ').trim()
      if ((name || '') === '') name = this.autoNewRunName

      let sub = this.$refs.subCountInput.value
      sub = sub.replace(/[^0-9]/g, ' ').trim()
      let nSub = ((sub || '') !== '') ? parseInt(sub) : 1

      this.newRunName = name  // actual values after cleanup
      this.newRunSubCount = nSub || 1
      this.newRunState = Mdf.emptyRunState()

      // start new model run: send request to the server
      this.newRunStep = INIT_RUN_STEP
    },

    // new model run started: response from server
    doneNewRunInit (ok, rst) {
      this.newRunStep = ok ? PROC_RUN_STEP : FINAL_RUN_STEP
      if (!!ok && Mdf.isNotEmptyRunState(rst)) {
        this.newRunState = rst
        this.newRunName = rst.RunName
      }
    },

    // model run progress: response from server
    doneNewRunProgress (ok, rlp) {
      if (!ok || !Mdf.isNotEmptyRunStateLog(rlp)) return  // empty run state or error

      this.newRunState = Mdf.toRunStateFromLog(rlp)

      // update log lines
      let nLen = Mdf.lengthOf(rlp.Lines)
      if (nLen > 0) {
        let log = []
        for (let k = 0; k < nLen; k++) {
          log.push({offset: rlp.Offset + k, text: rlp.Lines[k]})
        }
        this.newRunLineLst = log
      }

      // check is it final update: model run completed
      let isDone = (this.newRunState.IsFinal && rlp.Offset + rlp.Size >= rlp.TotalSize)

      if (!isDone) {
        this.newRunLogStart = rlp.Offset + rlp.Size
        if (this.newRunLogStart + this.newRunLogSize < rlp.TotalSize) {
          this.newRunLogSize = Math.min(rlp.TotalSize - this.newRunLogStart, MAX_LOG_PAGE_SIZE)
          this.newRunLogStart = rlp.TotalSize - this.newRunLogSize
        } else {
          if (this.newRunLogStart + this.newRunLogSize >= rlp.TotalSize) this.newRunLogStart = rlp.TotalSize - this.newRunLogSize
        }
        if (this.newRunLogStart < rlp.Offset) this.newRunLogStart = rlp.Offset + 1
      } else {
        this.loadRunListDone = false
        this.refreshRunListTickle = !this.refreshRunListTickle  // refersh run list and current run
        this.refreshRunTickle = !this.refreshRunTickle          // refersh run list and current run
        this.newRunStep = FINAL_RUN_STEP
      }
    },
    //
    // end of model run methods

    // show currently selected run info
    showRunInfoDlg () {
      this.$refs.theRunInfoDlg.showRunInfo(this.theRunText)
    },
    // show currently selected workset info
    showWsInfoDlg () {
      this.$refs.theWsInfoDlg.showWsInfo(this.theWorksetText)
    },

    // tab mounted: handle tabs mounted by direct link
    doTabMounted (kind, dn = '') {
      if ((kind || '') === '') {
        console.warn('invalid (empty) kind of tab mounted')
        return
      }
      if (!this.loadDone) {
        return  // wait until model loaded
      }
      this.doTabAdd(true, false, kind, dn)
    },

    // click on tab link: activate that tab
    doTabLink (tabKey, isToNewRoute = false, path = '') {
      for (let k = 0; k < this.tabLst.length; k++) {
        this.tabLst[k].active = this.tabLst[k].key === tabKey
      }
      // if new path is a result of tab add or close then route to new path
      if (isToNewRoute && (path || '') !== '') {
        this.$router.push(path)
      }
    },

    // close tab and if tab was active then activate other tab
    doTabClose (tabKey) {
      // do not close last tab
      if (this.tabLst.length <= 1) return

      // remove tab from the list
      let n = -1 
      let k = this.tabLst.findIndex((t) => t.key === tabKey)
      if (k >= 0) {
        if (this.tabLst[k].active) n = (k < this.tabLst.length - 1) ? k : this.tabLst.length - 2
        this.tabLst.splice(k, 1)
      }

      // if it was an active tab then actvate tab at the same position: previous tab or last tab
      if (0 <= n && n < this.tabLst.length) {
        this.doTabLink(this.tabLst[n].key, true, this.tabLst[n].path)
      }
    },

    // update all tab headers
    doTabHeaderRefresh () {
      for (let k = 0; k < this.tabLst.length; k++) {
        const ti = this.makeTabInfo(this.tabLst[k].kind, this.tabLst[k].dn)
        if ((ti.title || '') !== '' && (ti.title || '') !== this.tabLst[k].title) {
          this.tabLst[k].title = ti.title
        }
      }
    },

    // update all tab route paths
    doTabPathRefresh () {
      for (let k = 0; k < this.tabLst.length; k++) {
        const ti = this.makeTabInfo(this.tabLst[k].kind, this.tabLst[k].dn)
        if ((ti.path || '') !== '' && (ti.path || '') !== this.tabLst[k].path) {
          this.tabLst[k].path = ti.path
        }
      }
    },

    // if tab not exist then add new tab and make it active else activate existing tab
    doTabAdd (isActivate, isToNewRoute, kind, dn = '') {
      // make tab key path and title
      const ti = this.makeTabInfo(kind, dn)
      if (!kind || (kind || '') === '' || !ti) {
        console.warn('tab kind is empty or invalid')
        return
      }

      // find existing tab by key and activate if required
      let k = this.tabLst.findIndex((t) => t.key === ti.key)
      if (k >= 0) {
        if (isActivate) {
          this.doTabLink(this.tabLst[k].key, isToNewRoute, this.tabLst[k].path) // activate existing tab
        }
        return // done: tab already exist
      }

      // make new tab
      let t = {
        kind: kind,
        dn: (dn || ''),
        key: (ti.key || ''),
        path: (ti.path || ''),
        active: false,
        updated: false,
        title: (ti.title || '')
      }

      // insert predefined tab into tab list or append to tab list
      let nPos = -1
      if (ti.pos < FREE_TAB_POS) {
        nPos = 0
        while (nPos < this.tabLst.length) {
          if (this.tabLst[nPos].pos > t.pos) break
          nPos++
        }
      }
      if (0 <= nPos && nPos < this.tabLst.length) {
        this.tabLst.splice(nPos, 0, t)
      } else {
        this.tabLst.push(t)
      }

      // activate new tab
      if (isActivate) {
        this.doTabLink(t.key, isToNewRoute, t.path)
      } else {
        if (this.tabLst.length === 1) {
          this.doTabLink(t.key, true, t.path)
        }
      }
    },

    // return tab info: key, path and title
    makeTabInfo (kind, dn = '') {
      // tab kind must be defined
      if ((kind || '') === '') {
        return this.emptyTabInfo()
      }

      // path to current model and to current run or workset
      let mp = '/model/' + this.digest
      let rdn = (this.theRunText.Digest || '') !== '' ? (this.theRunText.Digest || '') : (this.theRunText.Name || '')
      let rwp = '/' +
        (this.isFromWs ? Mdf.SET_OF_RUNSET + '/' + (this.theWorksetText.Name || '') : Mdf.RUN_OF_RUNSET + '/' + rdn)

      switch (kind) {
        case 'parameter-list':
          return {
            key: 'pl-' + this.digest,
            path: mp + rwp + '/parameter-list',
            title: 'Parameters: ' + Mdf.paramCount(this.theModel).toString(),
            pos: PARAM_LST_TAB_POS
          }
        case 'table-list':
          return {
            key: 'tl-' + this.digest,
            path: mp + '/run/' + rdn + '/table-list',
            title: 'Output tables: ' + Mdf.outTableCount(this.theModel).toString(),
            pos: TABLE_LST_TAB_POS
          }
        case 'run-list':
          return {
            key: 'rtl-' + this.digest,
            path: mp + '/run-list',
            title: 'Model runs: ' + Mdf.runTextCount(this.runTextList).toString(),
            pos: RUN_LST_TAB_POS
          }
        case 'workset-list':
          return {
            key: 'wtl-' + this.digest,
            path: mp + '/workset-list',
            title: 'Input sets: ' + Mdf.worksetTextCount(this.worksetTextList).toString(),
            pos: WS_LST_TAB_POS
          }
        case 'parameter':
          const pt = Mdf.paramTextByName(this.theModel, dn)
          let pds = Mdf.descrOfDescrNote(pt)
          return {
            key: 'p-' + this.digest + '-' + (dn || ''),
            path: mp + rwp + '/parameter/' + (dn || ''),
            title: (pds !== '') ? pds : (dn || ''),
            pos: FREE_TAB_POS
          }
        case 'table':
          const tt = Mdf.tableTextByName(this.theModel, dn)
          let tds = Mdf.descrOfDescrNote(tt)
          return {
            key: 't-' + this.digest + '-' + (dn || ''),
            path: mp + '/run/' + rdn + '/table/' + (dn || ''),
            title: (tds !== '') ? tds : (dn || ''),
            pos: FREE_TAB_POS
          }
      }
      // default
      console.log('tab kind invalid', kind)
      return this.emptyTabInfo()
    },

    // empty tab info: invalid default value
    emptyTabInfo () { return { key: '', path: '', title: '', pos: 0 } }
  },

  mounted () {
    this.mountedDone = true
    this.resetRunStep()
  }
}
