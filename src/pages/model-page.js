import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import RefreshModel from 'components/RefreshModel.vue'
import RefreshRun from 'components/RefreshRun.vue'
import RefreshRunList from 'components/RefreshRunList.vue'
import RefreshRunArray from 'components/RefreshRunArray.vue'
import RefreshWorkset from 'components/RefreshWorkset.vue'
import RefreshWorksetList from 'components/RefreshWorksetList.vue'
import UpdateWorksetStatus from 'components/UpdateWorksetStatus.vue'
import RefreshWorksetArray from 'components/RefreshWorksetArray.vue'
import RefreshUserViews from 'components/RefreshUserViews.vue'
import UploadUserViews from 'components/UploadUserViews.vue'

/* eslint-disable no-multi-spaces */
const RUN_LST_TAB_POS = 1       // model runs list tab position
const WS_LST_TAB_POS = 4        // worksets list tab position
const NEW_RUN_TAB_POS = 8       // new model run tab position
const NEW_WS_TAB_POS = 10       // new workset tab position
const DOWNLOADS_TAB_POS = 12    // downloads list tab position
const FREE_TAB_POS = 20         // first unassigned tab position
/* eslint-enable no-multi-spaces */

export default {
  name: 'ModelPage',
  components: {
    RefreshModel, RefreshRun, RefreshRunList, RefreshRunArray, RefreshWorkset, RefreshWorksetList, UpdateWorksetStatus, RefreshWorksetArray, RefreshUserViews, UploadUserViews
  },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  /* eslint-disable no-multi-spaces */
  data () {
    return {
      loadModelDone: false,
      loadRunDone: false,
      loadRunListDone: false,
      loadRunViewsDone: false,
      loadWsDone: false,
      loadWsListDone: false,
      loadWsViewsDone: false,
      loadUserViewsDone: false,
      refreshRunListTickle: false,
      refreshRunTickle: false,
      refreshWsListTickle: false,
      refreshWsTickle: false,
      refreshRunViewsTickle: false,
      refreshWsViewsTickle: false,
      uploadViewsTickle: false,
      uploadUserViewsTickle: false,
      uploadUserViewsDone: false,
      modelName: '',
      runDnsCurrent: '',      // run digest selected (run name, run stamp)
      wsNameCurrent: '',      // workset name selected
      runViewsArray: [],      // digests of runs to refresh to view existing tabs
      wsViewsArray: [],       // names of worksets to refresh to view existing tabs
      activeTabKey: '',       // active tab path
      tabItems: [],           // tab list
      updatingWsStatus: false,
      isReadonlyWsStatus: false,
      nameWsStatus: '',
      updateWsStatusTickle: false,
      paramEditCount: 0,      // number of edited and unsaved parameters
      pathToRouteLeave: '',   // router component leave guard: path-to leave if user confirm changes discard
      isYesToLeave: false,    // if true then do router push to leave the page
      showAllDiscardDlg: false
    }
  },
  /* eslint-enable no-multi-spaces */

  computed: {
    loadWait () {
      return !this.loadModelDone ||
        !this.loadRunDone || !this.loadRunListDone || !this.loadRunViewsDone ||
        !this.loadWsDone || !this.loadWsListDone || this.updatingWsStatus || !this.loadWsViewsDone ||
        !this.loadUserViewsDone
    },
    isEmptyTabList () { return !Mdf.isLength(this.tabItems) },
    runTextCount () { return Mdf.runTextCount(this.runTextList) },
    worksetTextCount () { return Mdf.worksetTextCount(this.worksetTextList) },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList,
      worksetTextList: state => state.worksetTextList
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest',
      isExistInRunTextList: 'isExistInRunTextList',
      isExistInWorksetTextList: 'isExistInWorksetTextList'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected
    }),
    ...mapGetters('uiState', {
      paramViewUpdatedCount: 'paramViewUpdatedCount',
      tabsView: 'tabsView'
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // update page view
    doRefresh () {
      const tv = this.tabsView(this.digest) // list of additional tabs: parameters or tables tabs

      this.doTabAdd('run-list', { digest: this.digest })
      this.doTabAdd('set-list', { digest: this.digest })
      this.doTabAdd('new-run', { digest: this.digest })

      // restore additional tabs
      this.runViewsArray = []
      this.wsViewsArray = []

      for (const t of tv) {
        if (t?.kind && t?.routeParts?.digest) {
          this.doTabAdd(t.kind, t.routeParts)

          const rd = t.routeParts?.runDigest || ''
          if (rd && rd !== this.runDigestSelected) this.runViewsArray.push(rd)

          const wsn = t.routeParts?.worksetName || ''
          if (wsn && wsn !== this.worksetNameSelected) this.wsViewsArray.push(wsn)
        }
      }

      // reload run text for additional tabs
      this.loadRunViewsDone = this.runViewsArray.length <= 0
      if (!this.loadRunViewsDone) this.refreshRunViewsTickle = !this.refreshRunViewsTickle

      this.loadWsViewsDone = this.wsViewsArray.length <= 0
      if (!this.loadWsViewsDone) this.refreshWsViewsTickle = !this.refreshWsViewsTickle

      // if current path is not a one of tabs then route to the first tab
      for (const t of this.tabItems) {
        if (t.path === this.$route.path) {
          this.activeTabKey = t.path
          break
        }
      }
      if (!this.activeTabKey) {
        this.$router.push(this.tabItems[0].path)
      }

      // check if run selected and ready to use
      if (this.loadRunListDone && Array.isArray(this?.runTextList) && (this.runTextList?.length || 0) > 0) {
        this.checkRunSelected()
      }
    },

    doneModelLoad (isSuccess) {
      this.modelName = Mdf.modelName(this.theModel)
      this.loadModelDone = true
    },
    doneRunListLoad (isSuccess) {
      this.loadRunListDone = true
      //
      if (!isSuccess || !Mdf.isLength(this.runTextList)) { // do not refresh run: run list empty
        this.loadRunDone = true
        this.runDnsCurrent = ''
        this.dispatchRunDigestSelected('')
        return
      }
      // else: check if run selected and ready to use
      this.checkRunSelected()
    },
    // check if run selected and ready to use
    checkRunSelected () {
      // else: if run not selected then use first run
      if (!this.runDigestSelected) {
        this.runDnsCurrent = this.runTextList[0].RunDigest
        this.dispatchRunDigestSelected('')
        return
      }
      // else: if run already selected then make sure it still exist
      const rt = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
      if (!Mdf.isNotEmptyRunText(rt)) {
        this.runDnsCurrent = this.runTextList[0].RunDigest
        this.dispatchRunDigestSelected('')
        return
      }
      // else: if run completed and run parameters list loaded then exit
      if (Mdf.isRunCompletedStatus(rt?.Status) && Array.isArray(rt?.Param) && (rt?.Param?.length || 0) >= 0) {
        this.loadRunDone = true
        return
      }
      // else: refresh run parameters list and run status
      this.runDnsCurrent = this.runDigestSelected
      this.refreshRunTickle = !this.refreshRunTickle
    },
    doneRunLoad (isSuccess, dgst) {
      this.loadRunDone = true
      //
      if (isSuccess && (dgst || '') !== '') this.dispatchRunDigestSelected(dgst)
    },
    doneRunViewsLoad (isSuccess, count) {
      this.loadRunViewsDone = true
    },
    doneWsListLoad (isSuccess) {
      this.loadWsListDone = true
      //
      if (!isSuccess || !Mdf.isLength(this.worksetTextList)) { // do not refresh workset: workset list empty
        this.loadWsDone = true
        this.wsNameCurrent = ''
        this.dispatchWorksetNameSelected('')
        return
      }
      // else: if workset already selected then make sure it still exist, if not exist then use first workset
      if (!!this.worksetNameSelected && this.isExistInWorksetTextList({ ModelDigest: this.digest, Name: this.worksetNameSelected })) {
        this.wsNameCurrent = this.worksetNameSelected
      } else {
        this.wsNameCurrent = this.worksetTextList[0].Name
        this.dispatchWorksetNameSelected('')
      }
    },
    doneWsLoad (isSuccess, name) {
      this.loadWsDone = true
      //
      if (isSuccess && (name || '') !== '') this.dispatchWorksetNameSelected(name)
    },
    doneUpdateWsStatus (isSuccess, name, isReadonly) {
      this.updatingWsStatus = false
    },
    doneWsViewsLoad (isSuccess, count) {
      this.loadWsViewsDone = true
    },
    doneUserViewsLoad (isSuccess, count) {
      this.loadUserViewsDone = true
      if (count > 0) {
        this.$q.notify({ type: 'info', message: this.$t('Updated {count} parameter view(s)', { count: count }) })
      }
    },
    doneUserViewsUpload (isSuccess, count) {
      this.uploadUserViewsDone = true
      if (isSuccess && count > 0) {
        this.$q.notify({ type: 'info', message: this.$t('Uploaded {count} parameter view(s)', { count: count }) })
      }
    },

    // run(s) completed: refresh run text for selected run
    onRunCompletedList (rcArr) {
      if (!Array.isArray(rcArr) || rcArr.length === 0) {
        console.warn('Invalid (empty) list of completed runs')
        return
      }

      const idx = ((this.runDigestSelected || '') !== '') ? rcArr.indexOf(this.runDigestSelected) : 0

      if (idx >= 0) {
        this.runDnsCurrent = rcArr[idx]
        this.refreshRunTickle = !this.refreshRunTickle
      }
    },
    // run selected from the list: update current run
    onRunSelect (dgst) {
      if ((dgst || '') === '') {
        console.warn('selected run digest is empty')
        return
      }
      if (this.runDnsCurrent === dgst) this.refreshRunTickle = !this.refreshRunTickle
      this.runDnsCurrent = dgst
    },
    // run started: refresh run list
    onRunListRefresh () {
      this.refreshRunListTickle = !this.refreshRunListTickle
    },
    // workset selected from the list: update current workset
    onWorksetSelect (name) {
      if ((name || '') === '') {
        console.warn('selected workset name is empty')
        return
      }
      if (this.wsNameCurrent === name) this.refreshWsTickle = !this.refreshWsTickle
      this.wsNameCurrent = name
    },
    // refresh workset list, for example after delete
    onWorksetListRefresh () {
      this.refreshWsListTickle = !this.refreshWsListTickle
    },
    // run parameter selected from parameters list: go to run parameter page
    onRunParamSelect (name) {
      const p = this.doTabAdd('run-parameter', { digest: this.digest, runDigest: this.runDigestSelected, parameterName: name })
      if (p) this.$router.push(p)
    },
    // workset parameter selected from parameters list: go to workset parameter page
    onSetParamSelect (name) {
      const p = this.doTabAdd('set-parameter', { digest: this.digest, worksetName: this.worksetNameSelected, parameterName: name })
      if (p) this.$router.push(p)
    },
    // output table selected from tables list: go to output table page
    onTableSelect (name) {
      const p = this.doTabAdd('table', { digest: this.digest, runDigest: this.runDigestSelected, tableName: name })
      if (p) this.$router.push(p)
    },
    // update workset readonly status
    onWorksetReadonlyUpdate (dgst, name, isReadonly) {
      if (dgst !== this.digest || !name) return

      if (isReadonly) {
        // if there are any edited and unsaved parameters for current model
        const n = this.paramViewUpdatedCount(this.digest)
        if (n > 0) {
          console.warn('Unable to save input scenario: unsaved parameters count:', n)
          this.$q.notify({
            type: 'negative',
            message: this.$t('Unable to save input scenario because you have {count} unsaved parameter(s)', { count: n })
          })
          return
        }
      }
      // else: update workset status
      this.isReadonlyWsStatus = isReadonly
      this.nameWsStatus = name
      this.updateWsStatusTickle = !this.updateWsStatusTickle
    },
    // on parameter updated (data dirty flag) change
    onEditUpdated (isUpdated, tabPath) {
      const nPos = this.tabItems.findIndex(t => t.path === tabPath)
      if (nPos >= 0) this.tabItems[nPos].updated = isUpdated
    },
    // on parameter default view saved by user
    onParameterViewSaved (name) {
      this.uploadUserViewsTickle = !this.uploadUserViewsTickle
    },
    // view run log: add tab with open run log page
    onRunLogSelect (stamp) {
      const p = this.doTabAdd('run-log', { digest: this.digest, runStamp: stamp })
      if (p) this.$router.push(p)
    },
    // new model run using current workset name: add tab to run the model
    onNewRunSelect () {
      const p = this.doTabAdd('new-run', { digest: this.digest })
      if (p) this.$router.push(p)
    },
    // create new workset: add tab to create workset
    onNewWorksetSelect () {
      const p = this.doTabAdd('new-set', { digest: this.digest })
      if (p) this.$router.push(p)
    },
    // edit workset: add tab to edit workset
    onEditWorksetSelect (name) {
      const p = this.doTabAdd('set-edit', { digest: this.digest, worksetName: name })
      if (p) this.$router.push(p)
    },
    // view download list: add tab with open download page
    onDownloadSelect () {
      const p = this.doTabAdd('download-list', { digest: this.digest })
      if (p) this.$router.push(p)
    },

    // on click tab close button: close taband route to the next tab
    onTabCloseClick (tabPath) {
      const nPos = this.tabItems.findIndex(t => t.path === tabPath)
      if (nPos < 0) {
        console.warn('onTabCloseClick error: not found tab key:', tabPath)
        return
      }
      const kind = this.tabItems[nPos].kind
      this.tabItems = this.tabItems.filter((ti, idx) => idx !== nPos)

      // if tab was active then focus on the next tab
      if (tabPath === this.activeTabKey || tabPath === this.$route.path) {
        const len = Mdf.lengthOf(this.tabItems)
        const n = (nPos < len) ? nPos : nPos - 1
        this.activeTabKey = (n >= 0) ? this.tabItems[n].path : ''
        if (this.activeTabKey !== '') {
          this.$router.push(this.activeTabKey)
        }
      }
      // if parameter or table tab closed then save list of tab item in state store
      if (kind === 'run-parameter' || kind === 'set-parameter' || kind === 'table') this.storeTabItems()
    },

    // save list of parameters or tables tabs in store state
    storeTabItems () {
      const tv = []
      for (const t of this.tabItems) {
        if (t.kind === 'run-parameter' || t.kind === 'set-parameter' || t.kind === 'table') {
          tv.push({ kind: t.kind, routeParts: t.routeParts })
        }
      }
      this.dispatchTabsView({ digest: this.digest, tabs: tv })
    },

    // tab mounted: add to the tab list and if this is current router path then make this tab active
    onTabMounted (kind, routeParts) {
      const p = this.doTabAdd(kind, routeParts)
      if (p === this.$route.path) this.activeTabKey = p
    },
    // tab select: add to the tab list and make this tab active
    onTabSelect (kind, routeParts) {
      const p = this.doTabAdd(kind, routeParts)
      if (p) this.$router.push(p)
    },

    // if tab not exist then add new tab
    doTabAdd (kind, routeParts) {
      // make tab path and title
      const ti = this.makeTabInfo(kind, routeParts)
      if ((ti.path || '') === '') {
        console.warn('tab kind or route part(s) invalid or empty:', kind, routeParts)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to navigate: route part(s) invalid or empty') })
        return ''
      }

      // exit if tab already exist
      if (this.tabItems.findIndex((t) => t.path === ti.path) >= 0) return (ti.path || '')

      // insert predefined tab into tab list or append to tab list
      let nPos = -1
      if (ti.pos < FREE_TAB_POS) {
        nPos = 0
        while (nPos < this.tabItems.length) {
          if (this.tabItems[nPos].pos > ti.pos) break
          nPos++
        }
      }
      if (nPos >= 0 && nPos < this.tabItems.length) {
        this.tabItems.splice(nPos, 0, ti)
      } else {
        this.tabItems.push(ti)
      }
      // if parameter or table tab added then save list of tab item in state store
      if (kind === 'run-parameter' || kind === 'set-parameter' || kind === 'table') this.storeTabItems()

      return (ti.path || '')
    },

    makeTabInfo (kind, routeParts) {
      // empty tab info: invalid default value
      const emptyTabInfo = () => {
        return { kind: (kind || ''), path: '', routeParts: { digest: '' }, title: '', pos: 0, updated: false }
      }

      // tab kind must be defined and model digest same as current model
      if ((kind || '') === '' || !routeParts || (routeParts.digest || '') !== this.digest) return emptyTabInfo()

      let rn = ''

      switch (kind) {
        case 'run-list':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/run-list',
            routeParts: routeParts,
            title: this.$t('Model Runs'),
            pos: RUN_LST_TAB_POS,
            updated: false
          }

        case 'set-list':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/set-list',
            routeParts: routeParts,
            title: this.$t('Input Scenarios'),
            pos: WS_LST_TAB_POS,
            updated: false
          }

        case 'run-parameter': {
          if ((routeParts.runDigest || '') === '' || (routeParts.parameterName || '') === '') {
            console.warn('Invalid (empty) run digest or parameter name:', routeParts.runDigest, routeParts.parameterName)
            return emptyTabInfo()
          }
          const pds = Mdf.descrOfDescrNote(Mdf.paramTextByName(this.theModel, routeParts.parameterName))
          // path: '/model/' + this.digest + '/run/' + routeParts.runDigest + '/parameter/' + routeParts.parameterName,
          return {
            kind: kind,
            path: Mdf.parameterRunPath(this.digest, routeParts.runDigest, routeParts.parameterName),
            routeParts: routeParts,
            title: (pds !== '') ? pds : routeParts.parameterName,
            pos: FREE_TAB_POS,
            updated: false
          }
        }

        case 'set-parameter': {
          if ((routeParts.worksetName || '') === '' || (routeParts.parameterName || '') === '') {
            console.warn('Invalid (empty) workset name or parameter name:', routeParts.worksetName, routeParts.parameterName)
            return emptyTabInfo()
          }
          const pds = Mdf.descrOfDescrNote(Mdf.paramTextByName(this.theModel, routeParts.parameterName))
          // path: '/model/' + this.digest + '/set/' + routeParts.worksetName + '/parameter/' + routeParts.parameterName,
          return {
            kind: kind,
            path: Mdf.parameterWorksetPath(this.digest, routeParts.worksetName, routeParts.parameterName),
            routeParts: routeParts,
            title: (pds !== '') ? pds : routeParts.parameterName,
            pos: FREE_TAB_POS,
            updated: false
          }
        }

        case 'table': {
          if ((routeParts.runDigest || '') === '' || (routeParts.tableName || '') === '') {
            console.warn('Invalid (empty) run digest or output table name:', routeParts.runDigest, routeParts.tableName)
            return emptyTabInfo()
          }
          const tds = Mdf.descrOfDescrNote(Mdf.tableTextByName(this.theModel, routeParts.itemKey))
          // path: '/model/' + this.digest + '/run/' + routeParts.runDigest + '/table/' + routeParts.tableName,
          return {
            kind: kind,
            path: Mdf.tablePath(this.digest, routeParts.runDigest, routeParts.tableName),
            routeParts: routeParts,
            title: (tds !== '') ? tds : routeParts.tableName,
            pos: FREE_TAB_POS,
            updated: false
          }
        }

        case 'new-run':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/new-run',
            routeParts: routeParts,
            title: this.$t('Run the Model'),
            pos: NEW_RUN_TAB_POS,
            updated: false
          }

        case 'run-log': {
          if ((routeParts.runStamp || '') === '') {
            console.warn('Invalid (empty) run stamp:', routeParts.runStamp)
            return emptyTabInfo()
          }
          rn = routeParts.runStamp
          for (const rt of this.runTextList) {
            if (rt.ModelDigest === routeParts.digest && rt.RunStamp === routeParts.runStamp) {
              rn = rt.Name
              break
            }
          }
          return {
            kind: kind,
            path: '/model/' + this.digest + '/run-log/' + routeParts.runStamp,
            routeParts: routeParts,
            title: rn,
            pos: FREE_TAB_POS,
            updated: false
          }
        }

        case 'new-set':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/set-create',
            routeParts: routeParts,
            title: this.$t('New Input Scenario'),
            pos: NEW_WS_TAB_POS,
            updated: false
          }

        case 'set-edit': {
          if ((routeParts.worksetName || '') === '') {
            console.warn('Invalid (empty) workset name:', routeParts.worksetName)
            return emptyTabInfo()
          }
          return {
            kind: kind,
            path: '/model/' + this.digest + '/set-edit/' + routeParts.worksetName,
            routeParts: routeParts,
            title: routeParts.worksetName,
            pos: FREE_TAB_POS,
            updated: false
          }
        }

        case 'download-list':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/download-list',
            routeParts: routeParts,
            title: this.$t('Downloads'),
            pos: DOWNLOADS_TAB_POS,
            updated: false
          }
      }
      // default
      console.warn('tab kind invalid:', kind)
      return emptyTabInfo()
    },

    // before route to other page question: "Discard all changes?", user answer: "yes"
    onYesDiscardChanges () {
      this.dispatchParamViewDeleteByModel(this.digest) // discard parameter view state and edit changes
      this.isYesToLeave = true
      this.$router.push(this.pathToRouteLeave)
    },

    ...mapActions('uiState', {
      dispatchRunDigestSelected: 'runDigestSelected',
      dispatchWorksetNameSelected: 'worksetNameSelected',
      dispatchParamViewDeleteByModel: 'paramViewDeleteByModel',
      dispatchTabsView: 'tabsView'
    })
  },

  // change active tab on route update or redirect from default model path to current page
  beforeRouteUpdate (to, from, next) {
    // if to.path is one of the tabs then change active tab
    let isFrom = false
    for (const t of this.tabItems) {
      if (t.path === to.path) {
        this.activeTabKey = t.path // set active tab and do navigation
        next()
        return
      }
      if (!isFrom) isFrom = t.path === from.path
    }
    // else:
    // if to.path is default model/digest and one of the tabs is from.path then cancel navigation
    if (isFrom && to.path === '/model/' + this.digest) {
      if (this.activeTabKey !== from.path) this.activeTabKey = from.path
      next(false)
      return
    }
    next() // else default
  },

  // route leave guard: on leaving model page check
  // if any parameters edited and not changes saved then ask user to coonfirm "discard all changes?"
  beforeRouteLeave (to, from, next) {
    // if user already confimed "yes" to leave the page
    if (this.isYesToLeave) {
      next() // leave model page and route to next page
      return
    }
    // else:
    //  if there any edited and unsaved parameters for current model
    this.paramEditCount = this.paramViewUpdatedCount(this.digest)
    if (this.paramEditCount <= 0) {
      next() // no unsaved changes: leave model page and route to next page
      return
    }
    // else:
    //  redirect to dialog to confirm "discard all changes?"
    this.showAllDiscardDlg = true
    this.pathToRouteLeave = to.path || '' // store path-to leave if user confirm "yes" to "discard changes?"
    next(false)
  },

  mounted () {
    this.doRefresh()
  }
}
