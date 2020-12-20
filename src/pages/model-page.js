import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import RefreshModel from 'components/RefreshModel.vue'
import RefreshRun from 'components/RefreshRun.vue'
import RefreshRunList from 'components/RefreshRunList.vue'
import RefreshWorkset from 'components/RefreshWorkset.vue'
import RefreshWorksetList from 'components/RefreshWorksetList.vue'
import UpdateWorksetStatus from 'components/UpdateWorksetStatus.vue'

/* eslint-disable no-multi-spaces */
const RUN_LST_TAB_POS = 1       // model runs list tab position
const WS_LST_TAB_POS = 4        // worksets list tab position
const NEW_RUN_TAB_POS = 8       // new model run tab position
const FREE_TAB_POS = 20         // first unassigned tab position
/* eslint-enable no-multi-spaces */

export default {
  name: 'Model',
  components: { RefreshModel, RefreshRun, RefreshRunList, RefreshWorkset, RefreshWorksetList, UpdateWorksetStatus },

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
      loadWsDone: false,
      loadWsListDone: false,
      refreshRunListTickle: false,
      modelName: '',
      runDnsCurrent: '',      // run digest selected (run name, run stamp)
      wsNameCurrent: '',      // workset name selected
      activeTabKey: '',       // active tab path
      tabItems: [],           // tab list
      updatingWsStatus: false,
      isWsNowReadonly: false,
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
      return !this.loadModelDone || !this.loadRunDone || !this.loadRunListDone || !this.loadWsDone || !this.loadWsListDone || this.updatingWsStatus
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
      isExistInRunTextList: 'isExistInRunTextList',
      isExistInWorksetTextList: 'isExistInWorksetTextList'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected
    }),
    ...mapGetters('uiState', {
      paramViewUpdatedCount: 'paramViewUpdatedCount'
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // update page view
    doRefresh () {
      this.doTabAdd('run-list', { digest: this.digest })
      this.doTabAdd('set-list', { digest: this.digest })
      this.doTabAdd('new-run', { digest: this.digest })

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
      // else: if run already selected then make sure it still exist, if not exist then use first run
      if (!!this.runDigestSelected && this.isExistInRunTextList({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })) {
        this.runDnsCurrent = this.runDigestSelected
      } else {
        this.runDnsCurrent = this.runTextList[0].RunDigest
      }
    },
    doneRunLoad (isSuccess, dgst) {
      this.loadRunDone = true
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
      }
    },
    doneWsLoad (isSuccess, name) {
      this.loadWsDone = true
    },
    doneUpdateWsStatus (isSuccess, name, isReadonly) {
      this.updatingWsStatus = false
    },

    // run selected from the list: update current run
    onRunSelect (dgst) {
      if ((dgst || '') === '') {
        console.warn('selected run digest is empty')
        return
      }
      this.runDnsCurrent = dgst
    },
    // workset selected from the list: update current workset
    onWorksetSelect (name) {
      if ((name || '') === '') {
        console.warn('selected workset name is empty')
        return
      }
      this.wsNameCurrent = name
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
    onWorksetReadonlyUpdate (isReadonly) {
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
      this.isWsNowReadonly = isReadonly
      this.updateWsStatusTickle = !this.updateWsStatusTickle
    },
    // on parameter updated (data dirty flag) change
    onEditUpdated (isUpdated, tabPath) {
      const nPos = this.tabItems.findIndex(t => t.path === tabPath)
      if (nPos >= 0) this.tabItems[nPos].updated = isUpdated
    },
    // view run log: add tab with open run log page
    onRunLogSelect (stamp) {
      const p = this.doTabAdd('run-log', { digest: this.digest, runStamp: stamp })
      if (p) this.$router.push(p)
    },
    // new model run using current workset name: add tab with to run the model
    onNewRunSelect () {
      const p = this.doTabAdd('new-run', { digest: this.digest })
      if (p) this.$router.push(p)
    },
    // run completed: refresh run list
    onRunListRefresh () {
      this.refreshRunListTickle = !this.refreshRunListTickle // refersh run list
    },

    // on click tab close button: close taband route to the next tab
    onTabCloseClick (tabPath) {
      const nPos = this.tabItems.findIndex(t => t.path === tabPath)
      if (nPos < 0) {
        console.warn('onTabCloseClick error: not found tab key:', tabPath)
        return
      }
      this.tabItems.splice(nPos, 1)

      // if tab was active then focus on the next tab
      if (tabPath === this.activeTabKey || tabPath === this.$route.path) {
        const len = Mdf.lengthOf(this.tabItems)
        const n = (nPos < len) ? nPos : nPos - 1
        this.activeTabKey = (n >= 0) ? this.tabItems[n].path : ''
        if (this.activeTabKey !== '') {
          this.$router.push(this.activeTabKey)
        }
      }
    },

    // tab mounted: add to the tab list and if this is current router path then make this tab active
    onTabMounted (kind, routeParts) {
      const p = this.doTabAdd(kind, routeParts)
      if (p === this.$route.path) this.activeTabKey = p
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
      return (ti.path || '')
    },

    makeTabInfo (kind, routeParts) {
      // empty tab info: invalid default value
      const emptyTabInfo = () => { return { kind: (kind || ''), path: '', title: '', pos: 0, updated: false } }

      // tab kind must be defined and model digest same as current model
      if ((kind || '') === '' || !routeParts || (routeParts.digest || '') !== this.digest) return emptyTabInfo()

      switch (kind) {
        case 'run-list':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/run-list',
            title: this.$t('Model Runs'),
            pos: RUN_LST_TAB_POS,
            updated: false
          }

        case 'set-list':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/set-list',
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
          return {
            kind: kind,
            // path: '/model/' + this.digest + '/run/' + routeParts.runDigest + '/parameter/' + routeParts.parameterName,
            path: Mdf.parameterRunPath(this.digest, routeParts.runDigest, routeParts.parameterName),
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
          return {
            kind: kind,
            // path: '/model/' + this.digest + '/set/' + routeParts.worksetName + '/parameter/' + routeParts.parameterName,
            path: Mdf.parameterWorksetPath(this.digest, routeParts.worksetName, routeParts.parameterName),
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
          return {
            kind: kind,
            // path: '/model/' + this.digest + '/run/' + routeParts.runDigest + '/table/' + routeParts.tableName,
            path: Mdf.tablePath(this.digest, routeParts.runDigest, routeParts.tableName),
            title: (tds !== '') ? tds : routeParts.tableName,
            pos: FREE_TAB_POS,
            updated: false
          }
        }

        case 'new-run':
          return {
            kind: kind,
            path: '/model/' + this.digest + '/new-run',
            title: this.$t('Run the Model'),
            pos: NEW_RUN_TAB_POS,
            updated: false
          }

        case 'run-log': {
          if ((routeParts.runStamp || '') === '') {
            console.warn('Invalid (empty) run stamp:', routeParts.runStamp)
            return emptyTabInfo()
          }
          let rn = ''
          for (const rt of this.runTextList) {
            if (rt.ModelDigest === routeParts.digest && rt.RunStamp === routeParts.runStamp) {
              rn = rt.Name
              break
            }
          }
          return {
            kind: kind,
            path: '/model/' + this.digest + '/run-log/' + routeParts.runStamp,
            title: (rn !== '') ? rn : routeParts.runStamp,
            pos: FREE_TAB_POS,
            updated: false
          }
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
      dispatchParamViewDeleteByModel: 'paramViewDeleteByModel'
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
