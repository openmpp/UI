import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'
import * as Mdf from '@/modelCommon'
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
import OmMcwDialog from '@/om-mcw/OmMcwDialog'
import OmMcwButton from '@/om-mcw/OmMcwButton'

/* eslint-disable no-multi-spaces */
const EMPTY_RUN_STEP = 0      // empty state of new model: undefined
const INIT_RUN_STEP = 1       // initiate new model run: submit request to the server
const PROC_RUN_STEP = 2       // model run in progress
const FINAL_RUN_STEP = 16     // final state of model run: completed or failed
const MIN_LOG_PAGE_SIZE = 4   // min run log page size to read from the server
const MAX_LOG_PAGE_SIZE = 10  // max run log page size to read from the server

const RUN_LST_TAB_POS = 1       // model runs list tab position
const PARAM_RUN_LST_TAB_POS = 2 // run parameters list tab position
const TABLE_LST_TAB_POS = 3     // output tables list tab position
const WS_LST_TAB_POS = 4        // worksets list tab position
const PARAM_SET_LST_TAB_POS = 5 // workset parameters list tab position
const FREE_TAB_POS = 20         // first unassigned tab position
/* eslint-enable no-multi-spaces */

export default {
  components: {
    RefreshModel,
    RefreshRun,
    RefreshRunList,
    RefreshWorkset,
    RefreshWorksetList,
    UpdateWorksetStatus,
    NewRunInit,
    NewRunProgress,
    RunInfoDialog,
    WorksetInfoDialog,
    OmMcwButton,
    OmMcwDialog
  },

  /* eslint-disable no-multi-spaces */
  props: {
    digest: '',           // model digest or name
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
      modelName: '',
      isRunSelected: false,               // if true then last selection was from run list else workset
      runSelected: Mdf.emptyRunText(),    // last selected run
      wsSelected: Mdf.emptyWorksetText(), // last selected workset
      isRunSetHint: false,  // highlight run or workset change
      tabLst: [],           // tabs properties
      paramEditCount: 0,    // number of edited and unsaved parameters
      pathToRouteLeave: '', // router component leave guard: path-to leave if user confirm changes discard
      // model run state
      isRunPanel: false,          // if true then run panel is visible
      newRunStep: EMPTY_RUN_STEP, // model run step: initial, start new, view progress
      newRunName: '',
      newRunSubCount: 1,
      newRunState: Mdf.emptyRunState(),
      newRunLogStart: 0,
      newRunLogSize: 0,
      newRunLineLst: []
    }
  },
  /* eslint-enable no-multi-spaces */

  computed: {
    loadDone () {
      return this.loadModelDone && this.loadRunDone && this.loadRunListDone && this.loadWsDone && this.loadWsListDone
    },
    isSuccessTheRun () { return Mdf.isRunSuccess(this.runSelected) },

    // if true then selected workset edit mode else readonly and model run enabled
    isWsEdit () {
      return Mdf.isNotEmptyWorksetText(this.wsSelected) && !this.wsSelected.IsReadonly
    },
    // make new model run name
    autoNewRunName () {
      return (this.modelName || '') + '_' + (this.wsSelected.Name || '')
    },

    // model new run step: empty, initialize, in progress, final
    isEmptyRunStep () { return this.newRunStep === EMPTY_RUN_STEP },
    isInitRunStep () { return this.newRunStep === INIT_RUN_STEP },
    isProcRunStep () { return this.newRunStep === PROC_RUN_STEP },
    isFinalRunStep () { return this.newRunStep === FINAL_RUN_STEP },

    // view header line
    isNotEmptyHdr () {
      return this.isRunSelected ? Mdf.isNotEmptyRunText(this.runSelected) : Mdf.isNotEmptyWorksetText(this.wsSelected)
    },
    lastTimeOfHdr () {
      return this.isRunSelected ? Mdf.dtStr(this.runSelected.UpdateDateTime) : Mdf.dtStr(this.wsSelected.UpdateDateTime)
    },
    nameOfHdr () {
      return this.isRunSelected ? (this.runSelected.Name || '') : (this.wsSelected.Name || '')
    },
    descrOfHdr () {
      return this.isRunSelected ? Mdf.descrOfTxt(this.runSelected) : Mdf.descrOfTxt(this.wsSelected)
    },
    emptyHdrMsg () {
      return this.isRunSelected ? 'No model run results found' : 'No input set of parameters found'
    },
    statusOfTheRun () { return Mdf.statusText(this.runSelected) },

    ...mapGetters({
      theModel: GET.THE_MODEL,
      runTextList: GET.RUN_TEXT_LIST,
      runTextByIndex: GET.RUN_TEXT_BY_IDX,
      runTextByDigest: GET.RUN_TEXT_BY_DIGEST,
      worksetTextList: GET.WORKSET_TEXT_LIST,
      worksetTextByIndex: GET.WORKSET_TEXT_BY_IDX,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME,
      paramViewUpdatedCount: GET.PARAM_VIEW_UPDATED_COUNT
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

    // add tabs if data ready: loaded of model metadata, loaded list of model runs and list of input worksets
    loadDone () {
      if (!this.loadDone) return // exit: load not done yet

      this.isRunSelected = this.isSuccessTheRun
      const rpRun = {digest: this.digest, runOrSet: Mdf.RUN_OF_RUNSET, runSetKey: this.runSelected.Digest}
      const rpSet = {digest: this.digest, runOrSet: Mdf.SET_OF_RUNSET, runSetKey: this.wsSelected.Name}

      this.doTabAdd('run-list', {digest: this.digest})
      this.doTabAdd('workset-list', {digest: this.digest})
      this.doTabAdd('parameter-set-list', rpSet)
      if (this.isSuccessTheRun) {
        this.doTabAdd('parameter-run-list', rpRun)
        this.doTabAdd('table-list', rpRun)
        this.doTabLink('table-list', rpRun, true) // output tables list tab (do  activate and route)
      } else {
        this.doTabLink('parameter-set-list', rpSet, true) // list of workset parameters tab (do  activate and route)
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
    doneRunListLoad (isSuccess) {
      this.loadRunListDone = true
      if (!isSuccess) {
        this.loadRunDone = true // do not refresh run: run list empty
        this.runSelected = Mdf.emptyRunText()
      }
      // else: if run already selected then re-select same run to make sure it still exist
      if (Mdf.isNotEmptyRunText(this.runSelected) && (this.runSelected.Digest || '') !== '') this.runSelected = this.runTextByDigest(this.runSelected.Digest)
      if (!Mdf.isRunSuccess(this.runSelected)) this.runSelected = this.runTextByIndex(0)
      if (!Mdf.isNotEmptyRunText(this.runSelected)) {
        this.dispatchTheSelected({ModelDigest: this.digest, runDigestName: this.runSelected.Digest, isRun: this.isRunSelected})
      }
    },
    doneRunLoad (isSuccess, dgst) {
      this.loadRunDone = true
      if (!!isSuccess && (dgst || '') !== '') {
        this.runSelected = this.runTextByDigest(dgst)
        this.doTabRefreshItem(dgst)
        this.dispatchTheSelected({ModelDigest: this.digest, runDigestName: this.runSelected.Digest, isRun: this.isRunSelected})
      }
    },
    doneWsListLoad (isSuccess) {
      this.loadWsListDone = true
      if (!isSuccess) {
        this.loadWsDone = true // do not refresh workset: workset list empty
        this.wsSelected = Mdf.emptyWorksetText()
      }
      // else: if workset was already selected then re-select it to make sure it still exist
      if (Mdf.isNotEmptyWorksetText(this.wsSelected)) this.wsSelected = this.worksetTextByName(this.wsSelected.Name)
      if (!Mdf.isNotEmptyWorksetText(this.wsSelected)) {
        this.wsSelected = this.worksetTextByIndex(0)
        this.dispatchTheSelected({ModelDigest: this.digest, worksetName: this.wsSelected.Name, isRun: this.isRunSelected})
      }
    },
    doneWsLoad (isSuccess, name) {
      this.loadWsDone = true
      if (!!isSuccess && (name || '') !== '') {
        this.wsSelected = this.worksetTextByName(name)
        this.dispatchTheSelected({ModelDigest: this.digest, worksetName: this.wsSelected.Name, isRun: this.isRunSelected})
        this.doTabRefreshItem(name)
      }
    },
    doneWsStatusUpdate (isSuccess, name) {
      if (!!isSuccess && (name || '') !== '') this.wsSelected = this.worksetTextByName(name)
      // refersh current workset
      this.refreshWsTickle = !this.refreshWsTickle
    },
    // update workset or run in the list view
    doTabRefreshItem (key) {
      if (!this.$refs.theTab || !this.$refs.theTab.hasOwnProperty('refreshItem')) return
      this.$refs.theTab.refreshItem(key)
    },

    // run selected from the list: reload run info
    onRunSelect (dgst) {
      if ((dgst || '') === '') {
        console.warn('run digest is empty')
        return
      }
      this.runSelected = this.runTextByDigest(dgst)
      this.doTabPathRefresh('table-list', {digest: this.digest, runOrSet: Mdf.RUN_OF_RUNSET, runSetKey: this.runSelected.Digest})
      this.doTabPathRefresh('parameter-run-list', {digest: this.digest, runOrSet: Mdf.RUN_OF_RUNSET, runSetKey: this.runSelected.Digest})
      this.doRunSetHint()
    },
    // workset selected from the list: reload workset info
    onWsSelect (name) {
      if ((name || '') === '') {
        console.warn('workset name is empty')
        return
      }
      this.wsSelected = this.worksetTextByName(name)
      this.doTabPathRefresh('parameter-set-list', {digest: this.digest, runOrSet: Mdf.SET_OF_RUNSET, runSetKey: this.wsSelected.Name})
      this.doRunSetHint()
    },
    doRunSetHint () {
      this.isRunSetHint = true
      setTimeout(() => this.isRunSetHint = false, 150)
    },
    // refresh parameter list and table list tabs path
    doTabPathRefresh (kind, routeParts) {
      const ti = this.makeTabInfo(kind, routeParts)
      const k = this.tabLst.findIndex((t) => t.key === ti.key)
      if (k >= 0) this.tabLst[k].path = ti.path
    },

    // toggle workset readonly status
    onWsEditToggle () {
      this.saveWsStatusTickle = !this.saveWsStatusTickle
    },

    // on parameter updated (data dirty flag) change
    onEditUpdated (isUpdated, paramKey) {
      let k = this.tabLst.findIndex((t) => t.key === paramKey)
      if (k >= 0) this.tabLst[k].updated = isUpdated
    },

    // tab mounted: handle tabs mounted by direct link
    onTabMounted (kind, routeParts) {
      if (!this.loadDone) {
        return  // wait until model loaded
      }
      if ((kind || '') === '' || !routeParts || (routeParts.digest || '') !== this.digest) {
        console.warn('invalid (empty) tab mounted kind or route model digest', kind, routeParts)
        return
      }
      this.doTabAdd(kind, routeParts)
      this.doTabLink(kind, routeParts, false)
    },
    // tab route change without mount to handle tab link click of the same component
    // example: from one parameter tab to other parameter tab, component not mounted
    onTabNewRoute (kind, routeParts) { this.doTabLink(kind, routeParts, false) },

    // close tab and if tab was active then activate other tab
    onTabClose (routeKey) {
      // do not close last tab
      if (this.tabLst.length <= 1) return

      // remove tab from the list
      let n = -1 
      let k = this.tabLst.findIndex((t) => t.key === routeKey)
      if (k >= 0) {
        if (this.tabLst[k].active) n = (k < this.tabLst.length - 1) ? k : this.tabLst.length - 2
        this.tabLst.splice(k, 1)
      }

      // if it was an active tab then actvate tab at the same position: previous tab or last tab
      if (0 <= n && n < this.tabLst.length) this.$router.push(this.tabLst[n].path)
    },

    // click on tab link: activate that tab
    doTabLink (kind, routeParts, isToNewRoute = false) {
      const ti = this.makeTabInfo(kind, routeParts)
      for (let k = 0; k < this.tabLst.length; k++) {
        this.tabLst[k].active = this.tabLst[k].key === ti.key // make this tab active and deactivate all other tabs
      }
      // if new path is a result of tab add or tab close then route to new path
      if (isToNewRoute && (ti.path || '') !== '') this.$router.push(ti.path)

      // select run or workset for current tab, if tab has own run or workset
      let isNew = false
      if (kind === 'workset-list' && this.isRunSelected || kind === 'run-list' && !this.isRunSelected) {
        isNew = true
        this.isRunSelected = kind === 'run-list'
      }
      if (routeParts.runOrSet === Mdf.RUN_OF_RUNSET && (routeParts.runSetKey || '') !== '') {
        isNew = !this.isRunSelected || routeParts.runSetKey !== this.runSelected.Digest
        if (isNew) this.runSelected = this.runTextByDigest(routeParts.runSetKey)
        this.isRunSelected = true
      }
      if (routeParts.runOrSet === Mdf.SET_OF_RUNSET && (routeParts.runSetKey || '') !== '') {
        isNew = this.isRunSelected || routeParts.runSetKey !== this.wsSelected.Name
        if (isNew) this.wsSelected = this.worksetTextByName(routeParts.runSetKey)
        this.isRunSelected = false
      }
      if (isNew) this.doRunSetHint()
    },

    // if tab not exist then add new tab and make it active (if required)
    // else activate existing tab
    doTabAdd (kind, routeParts) {
      // make tab key, path and title
      if (!kind || (kind || '') === '' || !routeParts || (routeParts.digest || '') !== this.digest) {
        console.warn('tab kind or route model digest is empty or invalid')
        return
      }
      const ti = this.makeTabInfo(kind, routeParts)

      // find existing tab by key and activate if required
      if (this.tabLst.findIndex((t) => t.key === ti.key) >= 0) return // done: tab already exist

      // make new tab
      let t = {
        kind: kind,
        ptName: (routeParts.ptName || ''), // parameter name or output table name
        key: (ti.key || ''),
        path: (ti.path || ''),
        runOrSet: ti.runOrSet,
        active: false,
        updated: false,
        title: (ti.title || ''),
        pos: ti.pos
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
    },

    // return tab info: {key, path, runOrSet, title, pos}
    // by tab kind and route parts: {digest, runOrSet, runSetKey, ptName}
    makeTabInfo (kind, rp) {
      // empty tab info: invalid default value
      const emptyTabInfo = () => { return { key: '', path: '', runOrSet: '', title: '', pos: 0 } }

      // tab kind must be defined and model digest same as current model
      if ((kind || '') === '' || !rp || (rp.digest || '') !== this.digest) return emptyTabInfo()

      switch (kind) {
        case 'run-list':
          return {
            key: Mdf.runListRouteKey(this.digest),
            path: '/model/' + this.digest + '/run-list',
            runOrSet: Mdf.RUN_OF_RUNSET,
            title: 'Model runs: ' + Mdf.runTextCount(this.runTextList),
            pos: RUN_LST_TAB_POS
          }
        case 'workset-list':
          return {
            key: Mdf.worksetListRouteKey(this.digest),
            path: '/model/' + this.digest + '/workset-list',
            runOrSet: Mdf.SET_OF_RUNSET,
            title: 'Input sets: ' + Mdf.worksetTextCount(this.worksetTextList),
            pos: WS_LST_TAB_POS
          }
        case 'parameter-run-list':
          return {
            key: Mdf.paramRunListRouteKey(this.digest),
            path: '/model/' + this.digest + '/run/' + (rp.runSetKey || '') + '/parameter-list',
            runOrSet: Mdf.RUN_OF_RUNSET,
            title: 'Parameters: ' + Mdf.paramCount(this.theModel),
            pos: PARAM_RUN_LST_TAB_POS
          }
        case 'parameter-set-list':
          return {
            key: Mdf.paramSetListRouteKey(this.digest),
            path: '/model/' + this.digest + '/set/' + (rp.runSetKey || '') + '/parameter-list',
            runOrSet: Mdf.SET_OF_RUNSET,
            title: 'Parameters: ' + Mdf.paramCount(this.theModel),
            pos: PARAM_SET_LST_TAB_POS
          }
        case 'table-list':
          return {
            key: Mdf.tableListRouteKey(this.digest),
            path: '/model/' + this.digest + '/run/' + (rp.runSetKey || '') + '/table-list',
            runOrSet: Mdf.RUN_OF_RUNSET,
            title: 'Output tables: ' + Mdf.outTableCount(this.theModel),
            pos: TABLE_LST_TAB_POS
          }
        case 'parameter':
          const pds = Mdf.descrOfDescrNote(Mdf.paramTextByName(this.theModel, rp.ptName))
          return {
            key: Mdf.paramRouteKey(this.digest, (rp.ptName || '-'), rp.runOrSet, rp.runSetKey),
            path: '/model/' + this.digest + '/' + (rp.runOrSet || '') + '/' + (rp.runSetKey || '') + '/parameter/' + (rp.ptName || ''),
            runOrSet: rp.runOrSet || '',
            title: (pds !== '') ? pds : rp.ptName || '',
            pos: FREE_TAB_POS
          }
        case 'table':
          const tds = Mdf.descrOfDescrNote(Mdf.tableTextByName(this.theModel, rp.ptName))
          return {
            key: Mdf.tableRouteKey(this.digest, (rp.ptName || '-'), (rp.runSetKey|| '')),
            path: '/model/' + this.digest + '/run/' + (rp.runSetKey || '') + '/table/' + (rp.ptName || ''),
            runOrSet: Mdf.RUN_OF_RUNSET,
            title: (tds !== '') ? tds : rp.ptName || '',
            pos: FREE_TAB_POS
          }
      }
      // default
      console.log('tab kind invalid', kind)
      return emptyTabInfo()
    },

    // show currently selected run info
    showRunInfoDlg () {
      this.$refs.theRunInfoDlg.showRunInfo(this.runSelected)
    },
    // show currently selected workset info
    showWsInfoDlg () {
      this.$refs.theWsInfoDlg.showWsInfo(this.wsSelected)
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
    onModelRun () {
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

    onModelEditDiscardClosed (e) {
      if ((e.action || '') !== 'accept') return // if user not answered "yes" to "discard changes?" question

      this.dispatchParamViewDeleteByPrefix(Mdf.routeJoin([this.digest, 'p-'])) // remove all parameter views
      this.$router.push(this.pathToRouteLeave)
    },

    ...mapActions({
      dispatchTheSelected: DISPATCH.THE_SELECTED,
      dispatchParamViewDeleteByPrefix: DISPATCH.PARAM_VIEW_DELETE_BY_PREFIX
    })
  },

  // route leave guard: on leaving model page check
  // if any parameters edited and not changes saved then ask user to coonfirm "discard all changes?"
  beforeRouteLeave (to, from, next) {
    // if there any edited and unsaved parameters for current model
    this.paramEditCount = this.paramViewUpdatedCount(Mdf.routeJoin([this.digest, 'p-']))
    if (this.paramEditCount <= 0) {
      next()  // leave model page and route to next page
      return
    }
    // else: redirect to dialog to confirm "discard changes?"
    this.$refs.modelEditDiscardDlg.open()
    this.pathToRouteLeave = to.path || '' // store path-to leave if user confirm "yes" to "discard changes?"
    next(false)
  },

  mounted () {
    this.resetRunStep()
  }
}
