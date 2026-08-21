import { mapState, mapActions } from 'pinia'
import { useModelStore } from '../stores/model'
import { useServerStateStore } from '../stores/server-state'
import { useUiStateStore } from '../stores/ui-state'
import * as Mdf from 'src/model-common'
import ModelInfoBaseDialog from 'components/ModelInfoBaseDialog.vue'
import ConfirmDialog from 'components/ConfirmDialog.vue'
import { openURL } from 'quasar'

export default {
  name: 'ModelLib',
  components: { ModelInfoBaseDialog, ConfirmDialog },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      treeFilter: '',
      isTreeExpanded: false,
      isAnyModelGroup: false,
      nextId: 100,
      modelCopyList: [],
      treeData: [],
      expandedKeys: [],
      treeWalk: {
        isAnyFound: false,
        keysFound: {} // if node match filter then map keysFound[node.key] = true
      },
      locale: '',
      modelInfoTickle: false,
      modelInfo: Mdf.emptyModel(),
      modelInfoDocLink: '',
      showCopyModelDialogTickle: false,
      copyDigest: '',
      copyNameVer: '',
      copyLogPath: '',
      copyLogStat: this.emptyCopyLogStat(),
      logList: [],
      isShowCopyLogs: false,
      logListRefreshTs: '',
      isModelExist: false,
      loadLibWait: false,
      loadLogListWait: false,
      loadLogWait: false,
      loadModelListWait: false,
      loadWait: false
    }
  },

  computed: {
    ...mapState(useModelStore, [
      'modelList',
      'modelByDigest',
      'modelLanguage'
    ]),
    ...mapState(useServerStateStore, {
      omsUrl: 'omsUrl',
      serverConfig: 'config'
    }),
    ...mapState(useUiStateStore, [
      'isSortModelTree',
      'isDescModelTree',
      'treeLabelKind',
      'uiLang'
    ])
  },

  watch: {
    refreshTickle () { this.doRefresh() },
    treeFilter () { this.updateTreeWalk() },
    isDescModelTree () { this.sortTree(this.treeData) }
  },

  emits: ['disk-use-refresh'],

  methods: {
    ...mapActions(useModelStore, [
      'dispatchModelList'
    ]),
    ...mapActions(useUiStateStore, [
      'dispatchSortModelTree'
    ]),
    fromUnderscoreTs (ts) { return Mdf.isUnderscoreTimeStamp(ts) ? Mdf.fromUnderscoreTimeStamp(ts) : ts },

    // refersh list of library models and list of copy model logs
    async doRefresh () {
      this.copyLogPath = ''
      this.logList = []
      this.logListRefreshTs = ''
      this.isShowCopyLogs = false
      this.copyLogStat = this.emptyCopyLogStat()

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

      // refersh list of library models and list of copy model logs
      this.refreshLibModles()
      this.refreshLogList()
    },

    // expand or collapse all tree nodes
    doToogleExpandTree () {
      if (this.isTreeExpanded) {
        this.$refs.theTree.collapseAll()
      } else {
        this.$refs.theTree.expandAll()
      }
      this.isTreeExpanded = !this.isTreeExpanded

      // remove duplicates if expand is result of search
      this.expandedKeys = this.expandedKeys.filter((key, idx, arr) => arr.indexOf(key) === idx)
    },
    // toggle model tree sort order
    doToogleTreeSort () {
      this.dispatchSortModelTree({ isSort: true, isDesc: !this.isDescModelTree })
    },
    // filter by model name (label) or model description
    doTreeFilter (node, filter) {
      return this.treeWalk.isAnyFound && !!this.treeWalk.keysFound[node.key]
    },
    // update filtered nodes key list, include all children if group match the filter
    updateTreeWalk () {
      this.treeWalk.isAnyFound = false
      this.treeWalk.keysFound = {}

      if (!this.treeFilter) return // filter is empty

      const flt = this.treeFilter.toLowerCase()

      // walk the tree and check every node by filter match
      const td = []
      for (const g of this.treeData) {
        td.push(g)
      }
      while (td.length > 0) {
        const t = td.pop()

        let isFound = (t.label && t.label.toLowerCase().indexOf(flt) > -1) ||
          ((t.descr || '') !== '' && t.descr.toLowerCase().indexOf(flt) > -1)

        if (!isFound) isFound = this.treeWalk.keysFound[t.key] === true
        if (isFound && !this.treeWalk.keysFound[t.key]) this.treeWalk.keysFound[t.key] = true

        // if current node match filter then add all children to matched keys list
        for (const c of t.children) {
          td.push(c)
          if (isFound) this.treeWalk.keysFound[c.key] = true
        }
        if (!this.treeWalk.isAnyFound) this.treeWalk.isAnyFound = isFound
      }

      // if any node match the filter then expand the tree
      if (this.treeWalk.isAnyFound && !this.isTreeExpanded) {
        this.$nextTick(() => { this.doToogleExpandTree() })
      }
    },
    // clear filter value
    resetFilter () {
      this.treeFilter = ''
      this.treeWalk.isAnyFound = false
      this.treeWalk.keysFound = {}
      this.$refs.filterInput.focus()
    },

    // show model notes dialog
    doShowModelNote (dgst) {
      const m = Mdf.modelByDigest(dgst, this.modelCopyList)
      if (!Mdf.isModel(m)) {
        console.warn('Model not found:', dgst)
        this.$q.notify({ type: 'negative', message: this.$t('Model not found') })
        return
      }
      this.modelInfo = m
      const u = Mdf.modelDocLinkByDigest(dgst, this.modelCopyList, this.uiLang, this.modelLanguage)
      this.modelInfoDocLink = u || ''
      this.modelInfoTickle = !this.modelInfoTickle
    },

     // is model doc link not empty
    isModelDocLink (dgst) {
      const u = Mdf.modelDocLinkByDigest(dgst, this.modelCopyList, this.uiLang, this.modelLanguage)
      return u && u !== ''
    },
    // show model notes dialog
    doModelDocLink (dgst) {
      const u = Mdf.modelDocLinkByDigest(dgst, this.modelCopyList, this.uiLang, this.modelLanguage)
      if (u) openURL(this.serverConfig.ModelLib.Url + '/doc/' + u)
    },

    // show yes/no dialog to confirm model copy
    onCopyModel (digest, label, ver) {
      if (!digest) {
        console.warn('Invalid (empty) model digest:', digest)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return
      }
      // check if model already exist
      const md = this.modelByDigest(digest)
      this.isModelExist = Mdf.isModel(md)

      this.copyDigest = digest
      this.copyNameVer = label + (ver ? ('-' + ver) : '')
      this.copyLogPath = ''
      this.showCopyModelDialogTickle = !this.showCopyModelDialogTickle
    },
    // user answer Yes to copy all model files
    onYesCopyModel (nameVer, digest, kind) {
      this.showCopyModelDialogTickle = !this.showCopyModelDialogTickle
      this.doCopyModel(digest, nameVer)
    },

    // get model publish.lst path
    publishLst (m) {
      return (!m?.PubLst || m.PubLst === '.' || m.PubLst === '/' || m.PubLst === './') ? '' : m.PubLst
    },

    // return tree of models
    makeTreeData (mLst) {
      this.isAnyModelGroup = false
      this.treeFilter = ''
      const expKeys = Array.from(this.expandedKeys)
      this.expandedKeys = []

      if (!Mdf.isLength(mLst)) return [] // empty model list
      if (!Mdf.isModelList(mLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model list is empty or invalid') })
        return [] // invalid model list
      }

      // make folders tree
      const fm = {}
      const td = []

      for (const md of mLst) {
        if (!md?.Dir || md.Dir === '.' || md.Dir === '/' || md.Dir === './') continue // empty or top-level directory

        // add each folder/sub-folder into the tree
        const fa = md.Dir.split('/')
        let p = '', pp = ''

        for (const fn of fa) {
          if (!fn || fn === '.') continue // empty or top-level folder

          p = pp ? pp + '/' + fn : fn

          if (fm?.[p]) {
            pp = p
            continue // path already exist
          }

          const f = {
            key: 'mf-' + p + '-' + this.nextId++,
            digest: '',
            label: fn,
            descr: '',
            dir: pp,
            children: [],
            disabled: false
          }
          fm[p] = f
          if (fm?.[pp]) fm[pp].children.push(f)
          if (!pp) {
            td.push(f) // add new top-level folder
          }
          if (expKeys.indexOf(f.key) >= 0 && this.expandedKeys.indexOf(f.key) < 0) {
            this.expandedKeys.push(f.key)
          }
          pp = p
        }

        if (fm?.[p]) { // add model to the current folder, if it is not empty or top-level directory
          fm[p].children.push({
            key: 'md-' + md.Model.Digest + '-' + this.nextId++,
            digest: md.Model.Digest,
            label: md.Model.Name,
            descr: Mdf.descrOfDescrNote(md),
            ver: md.Model.Version || '',
            pubLst: this.publishLst(md),
            dir: p,
            children: [],
            disabled: false
          })
        }
      }

      this.isAnyModelGroup = td.length > 0

      // add models which are not included in any group
      for (const md of mLst) {
        if (!md?.Dir || md.Dir === '.' || md.Dir === '/' || md.Dir === './') { // empty or top-level directory
          td.push({
            key: 'md-' + md.Model.Digest + '-' + this.nextId++,
            digest: md.Model.Digest,
            label: md.Model.Name,
            descr: Mdf.descrOfDescrNote(md),
            ver: md.Model.Version || '',
            pubLst: this.publishLst(md),
            dir: '',
            children: [],
            disabled: false
          })
        }
      }

      this.sortTree(td)
      return td
    },

    // sort each tree level by labels custom ascending or descending order, keep folders before models
    sortTree (tData) {
      if (!this.isSortModelTree) return

      // sort tree in alphabetical or in reverse order
      // folders always before models
      // use case-neutral sort,
      // if case-neutral strings are equal then do addtional locale case sensintive comparison
      // example:
      //   Model moDel model model2 one other path RISK Risk riSk RiskA RiskP RiskP two
      let ln = this.uiLang
      if (!ln) ln = this.$q.lang.getLocale()

      const cmpNode = (left, right) => {
        // folder name always before model name
        if (!left.digest && !!right.digest) return -1
        if (!!left.digest && !right.digest) return 1

        // sort by name in custom ascending or descending order
        if (left.label === right.label) return 0

        const lLc = left.label.toLocaleLowerCase(ln)
        const rLc = right.label.toLocaleLowerCase(ln)

        if (lLc < rLc) return !this.isDescModelTree ? -1 : 1
        if (lLc > rLc) return !this.isDescModelTree ? 1 : -1

        const i = left.label.localeCompare(right.label, ln)

        if (i < 0) return !this.isDescModelTree ? 1 : -1
        if (i > 0) return !this.isDescModelTree ? -1 : 1
        return 0
      }

      tData.sort(cmpNode) // sort tree top level

      // walk the tree and sort node children
      const tnc = []
      for (const g of tData) {
        tnc.push(g)
      }
      while (tnc.length > 0) {
        const t = tnc.pop()
        if (Array.isArray(t?.children)) {
          t.children.sort(cmpNode) // sort that node children
          // add all children nodes to the walk list
          for (const c of t.children) {
            tnc.push(c)
          }
        }
      }
    },

    // refersh list of the models in library
    async refreshLibModles () {
      this.loadLibWait = true

      const u = this.serverConfig.ModelLib.Url + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + encodeURIComponent(this.uiLang) : '')
      try {
        const response = await this.$axios.get(u)
        const ml = response.data

        this.modelCopyList = []
        this.treeData = []
        if (Mdf.isModelList(ml)) {
          this.modelCopyList = ml
          this.treeData = this.makeTreeData(ml) // update model list tree
        }
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or no models published', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or no models published') })
      }
      this.loadLibWait = false

      // expand after refresh
      this.$nextTick(() => {
        this.isTreeExpanded = false // toogle to default-expand-all
        this.doToogleExpandTree()
      })
    },

    // copy model from the library
    async doCopyModel (digest, nameVer) {
      if (!digest) {
        console.warn('Invalid (empty) model digest:', digest, ': nameVer:', nameVer)
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) model digest') })
        return
      }
      // find model in the library
      const md = Mdf.modelByDigest(digest, this.modelCopyList)
      if (!Mdf.isModel(md)) {
        console.warn('Model not found:', digest, ': nameVer:', nameVer)
        this.$q.notify({ type: 'negative', message: this.$t('Model not found') + ' ' + digest + ' : ' + nameVer })
        return
      }
      const opts = {
        ModelDigest: digest,
        NameVersion: nameVer,
        PublishLst:  this.publishLst(md),
        BinDir:      md?.Dir || '',
        DocDir:      md?.DocDir || '',
        LogDir:      ''
      }
      this.$q.notify({ type: 'info', message: this.$t('Copy') + ' ' + nameVer})

      this.loadWait = true
      let isOk = false
      this.copyLogPath = ''
      let p = ''
      let msg = ''

      // start model copy
      const u = this.omsUrl + '/api/admin/copy-model' + (this.uiLang !== '' ? '/lang/' + encodeURIComponent(this.uiLang) : '')
      try {
        // send model copy request to the server
        const response = await this.$axios.post(u, opts)
        const rsp = response.data

        // expected json with log file path and optional error message
        if (rsp && rsp.hasOwnProperty('LogFileName') && rsp.hasOwnProperty('IsError') && rsp.hasOwnProperty('ErrorMsg')) {
          isOk = !rsp.IsError
          msg = rsp.ErrorMsg || ''
          p = rsp.LogFileName || ''
        }
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to copy model', msg)
      }

      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to copy model') + (msg ? ('. ' + msg) : '') })
        // return
      }
      if (p) {
        this.$nextTick(() => {
          this.refreshLogList()
          this.refreshCopyLog(p)
        })
      }
      // refresh model tree and refresh disk usage from the server
      setTimeout(() => {
          this.loadWait = false
          this.refreshModelList()
          this.$emit('disk-use-refresh')
        },
        isOk ? 2017 : 1051
      )
    },

    // refresh list of model copy log files
    async refreshLogList() {
      const u = this.omsUrl + '/api/admin/copy-model/log-all'
      this.loadLogListWait = true
      try {
        const response = await this.$axios.get(u)
        this.logList = Array.isArray(response.data) ? response.data : []
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Unable to get list of model copy logs', em)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to get list of model copy logs') })
      }
      this.loadLogListWait = false

      this.logListRefreshTs = Mdf.dtToTimeStamp(new Date())
    },
    // get copy log header from log list item
    getCopyLogHdr (it) {
      return {
        BaseName: it?.BaseName || '',
        LogStamp: it?.LogStamp || '',
        LogFileName: it?.LogFileName || '',
        IsError: it?.IsError || false
      }
    },

    // show or hide model copy log
    async onToggleCopyLog (p) {
      if (!p) return
      if (p === this.copyLogPath) {
        this.copyLogPath = '' // hide selected model copy log
        return
      }
      // else show selected model copy log
      this.copyLogPath = ''
      await this.refreshCopyLog(p)
    },

    // refresh content and status of current model copy log
    async refreshCopyLog(p) {
      if (!p) return

      const u = this.omsUrl + '/api/admin/copy-model/log/' + encodeURIComponent(p)

      this.loadLogWait = true
      try {
        const response = await this.$axios.get(u)
        this.setCopyLogStat(response.data)
        this.copyLogPath = p
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Unable to refresh model copy log content', em)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh model copy log content') })
      }

      this.loadLogWait = false
    },

    // set current copy log state from response data
    setCopyLogStat (fi) {
      this.copyLogStat.BaseName = fi?.BaseName || ''
      this.copyLogStat.LogStamp = fi?.LogStamp || ''
      this.copyLogStat.LogFileName = fi?.LogFileName || ''
      this.copyLogStat.IsError = fi?.IsError || false
      this.copyLogStat.Size = fi?.Size || 0
      this.copyLogStat.BaseModTsName = fi?.ModTs || 0
      this.copyLogStat.Lines = fi?.Lines || []
    },
    // return empty copy log file stat
    emptyCopyLogStat () {
        return {
        BaseName: '',    // base name: db name or model name
        LogStamp: '',    // log file date-time stamp
        LogFileName: '', // copy-model.2022_08_09_23_45_06_777.RiskPaths.console.txt
        IsError: false,  // if true then it is an error log file name: copy-model.2022_08_09_23_45_06_777.RiskPaths.error.txt
        Size: 0,         // bytes, log file size
        ModTs: 0,        // unix milliseconds, log file update time
        Lines: []        // log file content
      }
    },

    // refresh model list after copy
    async refreshModelList() {
      this.loadModelListWait = true

      const u = this.omsUrl + '/api/model-list/text' + (this.uiLang !== '' ? '/lang/' + encodeURIComponent(this.uiLang) : '')
      try {
        const response = await this.$axios.get(u)
        this.dispatchModelList(response.data) // update model list in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or no models published', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or no models published') })
      }
      this.loadModelListWait = false
    }
  },

  mounted () {
    this.doRefresh() // get list of library models and list of copy model logs
  }
}
