/* eslint-disable yoda */
import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'
import * as Mdf from '@/modelCommon'
import RefreshModel from './RefreshModel'
import RefreshRun from './RefreshRun'
import RefreshRunList from './RefreshRunList'
import RefreshWorkset from './RefreshWorkset'
import RefreshWorksetList from './RefreshWorksetList'
import UpdateWorksetStatus from './UpdateWorksetStatus'
import RunInfoDialog from './RunInfoDialog'
import WorksetInfoDialog from './WorksetInfoDialog'
import OmMcwDialog from '@/om-mcw/OmMcwDialog'

/* eslint-disable no-multi-spaces */
const RUN_LST_TAB_POS = 1       // model runs list tab position
const PARAM_RUN_LST_TAB_POS = 2 // run parameters list tab position
const TABLE_LST_TAB_POS = 3     // output tables list tab position
const WS_LST_TAB_POS = 4        // worksets list tab position
const PARAM_SET_LST_TAB_POS = 5 // workset parameters list tab position
const RUN_MODEL_TAB_POS = 6     // run model tab position
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
    RunInfoDialog,
    WorksetInfoDialog,
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
      isRunModelTab: false, // if true then current tab is run model tab
      tabLst: [],           // tabs properties
      paramEditCount: 0,    // number of edited and unsaved parameters
      pathToRouteLeave: ''  // router component leave guard: path-to leave if user confirm changes discard
    }
  },
  /* eslint-enable no-multi-spaces */

  computed: {
    loadDone () {
      return this.loadModelDone && this.loadRunDone && this.loadRunListDone && this.loadWsDone && this.loadWsListDone
    },
    isSuccessTheRun () { return Mdf.isRunSuccess(this.runSelected) },

    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },
    modelParamCount () { return Mdf.paramCount(this.theModel) },
    modelTableCount () { return Mdf.outTableCount(this.theModel) },

    // if true then selected workset edit mode else readonly and model run enabled
    isWsEdit () {
      return Mdf.isNotEmptyWorksetText(this.wsSelected) && !this.wsSelected.IsReadonly
    },

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
      const rpRun = { digest: this.digest, runOrSet: 'run', runSetKey: this.runSelected.Digest }
      const rpSet = { digest: this.digest, runOrSet: 'set', runSetKey: this.wsSelected.Name }

      this.doTabAdd('run-list', { digest: this.digest })
      this.doTabAdd('set-list', { digest: this.digest })
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
        this.dispatchTheSelected({ ModelDigest: this.digest, runDigestName: this.runSelected.Digest, isRun: this.isRunSelected })
      }
    },
    doneRunLoad (isSuccess, dgst) {
      this.loadRunDone = true
      if (!!isSuccess && (dgst || '') !== '') {
        this.runSelected = this.runTextByDigest(dgst)
        this.doTabRefreshItem(dgst)
        this.dispatchTheSelected({ ModelDigest: this.digest, runDigestName: this.runSelected.Digest, isRun: this.isRunSelected })
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
        this.dispatchTheSelected({ ModelDigest: this.digest, worksetName: this.wsSelected.Name, isRun: this.isRunSelected })
      }
    },
    doneWsLoad (isSuccess, name) {
      this.loadWsDone = true
      if (!!isSuccess && (name || '') !== '') {
        this.wsSelected = this.worksetTextByName(name)
        this.dispatchTheSelected({ ModelDigest: this.digest, worksetName: this.wsSelected.Name, isRun: this.isRunSelected })
        this.doTabRefreshItem(name)
        this.doTabRefreshWsEditStatus(name)
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
    // update workset read-only status
    doTabRefreshWsEditStatus (key) {
      if (!this.$refs.theTab || !this.$refs.theTab.hasOwnProperty('refreshWsEditStatus')) return
      this.$refs.theTab.refreshWsEditStatus(key)
    },

    // run selected from the list: reload run info
    onRunSelect (dgst) {
      if ((dgst || '') === '') {
        console.warn('run digest is empty')
        return
      }
      this.runSelected = this.runTextByDigest(dgst)
      this.doTabPathRefresh('table-list', { digest: this.digest, runOrSet: 'run', runSetKey: this.runSelected.Digest })
      this.doTabPathRefresh('parameter-run-list', { digest: this.digest, runOrSet: 'run', runSetKey: this.runSelected.Digest })
      this.doRunSetHint()
    },
    // workset selected from the list: reload workset info
    onWsSelect (name) {
      if ((name || '') === '') {
        console.warn('workset name is empty')
        return
      }
      this.wsSelected = this.worksetTextByName(name)
      this.doTabPathRefresh('parameter-set-list', { digest: this.digest, runOrSet: 'set', runSetKey: this.wsSelected.Name })
      this.doRunSetHint()
    },
    doRunSetHint () {
      this.isRunSetHint = true
      setTimeout(() => { this.isRunSetHint = false }, 150)
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

    // new model run using current workset name: open model run tab
    onNewRunModel () {
      const rp = { digest: this.digest, runOrSet: 'set', runSetKey: this.wsSelected.Name }
      this.doTabAdd('run-model', rp)
      this.doTabLink('run-model', rp, true)
    },
    // run completed: refresh run list
    onRunListRefresh () {
      this.refreshRunListTickle = !this.refreshRunListTickle // refersh run list
    },

    // on parameter updated (data dirty flag) change
    onEditUpdated (isUpdated, paramKey) {
      let k = this.tabLst.findIndex((t) => t.key === paramKey)
      if (k >= 0) this.tabLst[k].updated = isUpdated
    },

    // tab mounted: handle tabs mounted by direct link
    onTabMounted (kind, routeParts) {
      if (!this.loadDone) {
        return // wait until model loaded
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

    // activate tab as result of tab click or after tab component mounted by router link
    doTabLink (kind, routeParts, isToNewRoute = false) {
      const ti = this.makeTabInfo(kind, routeParts)
      for (let k = 0; k < this.tabLst.length; k++) {
        this.tabLst[k].active = this.tabLst[k].key === ti.key // make this tab active and deactivate all other tabs
      }

      // if new path is a result of tab add or tab close then route to new path
      if (isToNewRoute && (ti.path || '') !== '') this.$router.push(ti.path)

      // if this model run tab then disable new model run button (workset run button)
      this.isRunModelTab = kind === 'run-model'

      // select run or workset for current tab, if tab has own run or workset
      let isNew = false
      if ((kind === 'set-list' && this.isRunSelected) || (kind === 'run-list' && !this.isRunSelected)) {
        isNew = true
        this.isRunSelected = kind === 'run-list'
      }
      if (routeParts.runOrSet === 'run' && (routeParts.runSetKey || '') !== '') {
        isNew = !this.isRunSelected || routeParts.runSetKey !== this.runSelected.Digest
        if (isNew) this.runSelected = this.runTextByDigest(routeParts.runSetKey)
        this.isRunSelected = true
      }
      if (routeParts.runOrSet === 'set' && (routeParts.runSetKey || '') !== '') {
        isNew = this.isRunSelected || routeParts.runSetKey !== this.wsSelected.Name
        if (isNew) this.wsSelected = this.worksetTextByName(routeParts.runSetKey)
        this.isRunSelected = false
      }
      if (isNew) this.doRunSetHint()
    },

    // if tab not exist then add new tab
    doTabAdd (kind, routeParts) {
      // make tab key, path and title
      if (!kind || (kind || '') === '' || !routeParts || (routeParts.digest || '') !== this.digest) {
        console.warn('tab kind or route model digest is empty or invalid')
        return
      }
      const ti = this.makeTabInfo(kind, routeParts)

      // exit if tab already exist
      if (this.tabLst.findIndex((t) => t.key === ti.key) >= 0) return

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
            runOrSet: 'run',
            title: 'Model Runs',
            pos: RUN_LST_TAB_POS
          }
        case 'set-list':
          return {
            key: Mdf.worksetListRouteKey(this.digest),
            path: '/model/' + this.digest + '/set-list',
            runOrSet: 'set',
            title: 'Input Sets',
            pos: WS_LST_TAB_POS
          }
        case 'run-model':
          return {
            key: Mdf.runModelRouteKey(this.digest),
            path: '/model/' + this.digest + '/run-model/set/' + (rp.runSetKey || ''),
            runOrSet: 'set',
            title: 'Run Model',
            pos: RUN_MODEL_TAB_POS
          }
        case 'parameter-run-list':
          return {
            key: Mdf.paramRunListRouteKey(this.digest),
            path: '/model/' + this.digest + '/run/' + (rp.runSetKey || '') + '/parameter-list',
            runOrSet: 'run',
            title: 'Parameters',
            pos: PARAM_RUN_LST_TAB_POS
          }
        case 'parameter-set-list':
          return {
            key: Mdf.paramSetListRouteKey(this.digest),
            path: '/model/' + this.digest + '/set/' + (rp.runSetKey || '') + '/parameter-list',
            runOrSet: 'set',
            title: 'Parameters',
            pos: PARAM_SET_LST_TAB_POS
          }
        case 'table-list':
          return {
            key: Mdf.tableListRouteKey(this.digest),
            path: '/model/' + this.digest + '/run/' + (rp.runSetKey || '') + '/table-list',
            runOrSet: 'run',
            title: 'Output Tables',
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
            key: Mdf.tableRouteKey(this.digest, (rp.ptName || '-'), (rp.runSetKey || '')),
            path: '/model/' + this.digest + '/run/' + (rp.runSetKey || '') + '/table/' + (rp.ptName || ''),
            runOrSet: 'run',
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
      next() // leave model page and route to next page
      return
    }
    // else: redirect to dialog to confirm "discard changes?"
    this.$refs.modelEditDiscardDlg.open()
    this.pathToRouteLeave = to.path || '' // store path-to leave if user confirm "yes" to "discard changes?"
    next(false)
  },

  mounted () {
  }
}
