import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import RunParameterList from 'components/RunParameterList.vue'
import TableList from 'components/TableList.vue'
import RefreshRun from 'components/RefreshRun.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import TableInfoDialog from 'components/TableInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'
import NewWorkset from 'components/NewWorkset.vue'
import CreateWorkset from 'components/CreateWorkset.vue'
import MarkdownEditor from 'components/MarkdownEditor.vue'

export default {
  name: 'RunList',
  components: {
    RunParameterList,
    TableList,
    RefreshRun,
    RunInfoDialog,
    ParameterInfoDialog,
    TableInfoDialog,
    GroupInfoDialog,
    DeleteConfirmDialog,
    NewWorkset,
    CreateWorkset,
    MarkdownEditor
  },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadWait: false,
      loadRunWait: false,
      runCurrent: Mdf.emptyRunText(), // currently selected run
      isRunTreeCollapsed: false,
      isAnyRunGroup: false,
      runTreeData: [],
      runFilter: '',
      runCompare: Mdf.emptyRunText(), // run to compare
      paramDiff: [], // name list of different parameters
      tableDiff: [], // name list of different tables
      isNewWorksetShow: false,
      isCreateWorksetNow: false,
      loadWorksetCreate: false,
      nameOfNewWorkset: '',
      copyParamNewWorkset: [],
      newDescrNotes: [], // new workset description and notes
      refreshParamTreeTickle: false,
      refreshTableTreeTickle: false,
      runDigestRefresh: '',
      refreshRunTickle: false,
      isParamTreeShow: false,
      paramTreeCount: 0,
      paramVisibleCount: 0,
      isTableTreeShow: false,
      tableTreeCount: 0,
      tableVisibleCount: 0,
      runInfoTickle: false,
      runInfoDigest: '',
      groupInfoTickle: false,
      groupInfoName: '',
      paramInfoTickle: false,
      paramInfoName: '',
      tableInfoTickle: false,
      tableInfoName: '',
      nextId: 100,
      runNameToDelete: '',
      runDigestToDelete: '',
      runStatusToDelete: '',
      showDeleteDialogTickle: false,
      uploadFileSelect: false,
      uploadFile: null,
      isShowNoteEditor: false,
      noteEditorLangCode: ''
    }
  },

  computed: {
    isNotEmptyRunCurrent () { return Mdf.isNotEmptyRunText(this.runCurrent) },
    descrRunCurrent () { return Mdf.descrOfTxt(this.runCurrent) },
    isCompare () { return !!this.runCompare && (this.runCompare?.RunDigest || '') !== '' },
    fileSelected () { return !(this.uploadFile === null) },

    ...mapState('model', {
      theModel: state => state.theModel,
      runTextList: state => state.runTextList,
      runTextListUpdated: state => state.runTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      uiLang: state => state.uiLang,
      noAccDownload: state => state.noAccDownload,
      noMicrodataDownload: state => state.noMicrodataDownload
    }),
    ...mapGetters('uiState', {
      modelViewSelected: 'modelViewSelected'
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    runTextListUpdated () { this.onRunTextListUpdated() },
    runDigestSelected () {
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
      this.refreshRunCompare()
    }
  },

  methods: {
    isSuccess (status) { return status === Mdf.RUN_SUCCESS },
    isInProgress (status) { return status === Mdf.RUN_IN_PROGRESS || status === Mdf.RUN_INITIAL },
    dateTimeStr (dt) { return Mdf.dtStr(dt) },
    runCurrentDescr () { return Mdf.descrOfTxt(this.runCurrent) },
    runCurrentNote () { return Mdf.noteOfTxt(this.runCurrent) },

    // update page view
    doRefresh () {
      this.doRunTextListUpdated()
      this.paramTreeCount = Mdf.paramCount(this.theModel)
      this.paramVisibleCount = this.paramTreeCount
      this.tableTreeCount = Mdf.tableCount(this.theModel)
      this.tableVisibleCount = this.tableTreeCount
      this.refreshRunCompare()
    },
    // run list updated: update run list tree and current run
    onRunTextListUpdated () { this.doRunTextListUpdated() },
    doRunTextListUpdated () {
      this.runTreeData = this.makeRunTreeData(this.runTextList)
      if (this.runDigestSelected) this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
    },
    // update run comparison view
    refreshRunCompare () {
      const mv = this.modelViewSelected(this.digest)
      if (!!mv && (mv?.runCompare || '') !== '') this.runDigestRefresh = mv.runCompare
    },

    // click on run: select this run as current run
    onRunLeafClick (dgst) {
      this.clearRunCompare()
      if (this.runDigestSelected !== dgst) this.$emit('run-select', dgst)
    },
    // expand or collapse all run tree nodes
    doToogleExpandRunTree () {
      if (this.isRunTreeCollapsed) {
        this.$refs.runTree.expandAll()
      } else {
        this.$refs.runTree.collapseAll()
      }
      this.isRunTreeCollapsed = !this.isRunTreeCollapsed
    },
    // filter run tree nodes by name (label), update date-time or description
    doRunTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.lastTime || '') !== '' && node.lastTime.indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear run tree filter value
    resetRunFilter () {
      this.runFilter = ''
      this.$refs.runFilterInput.focus()
    },
    // show run notes dialog
    doShowRunNote (dgst) {
      this.runInfoDigest = dgst
      this.runInfoTickle = !this.runInfoTickle
    },
    // click on run log: show run log page
    doRunLogClick (stamp) {
      // if run stamp is empty then log is not available
      if (!stamp) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to show run log: run stamp is empty') })
        return
      }
      this.$emit('run-log-select', stamp)
    },

    // parameters tree updated and leafs counted
    // tables tree updated and leafs counted
    onParamTreeUpdated  (cnt) {
      this.paramTreeCount = cnt || 0
      this.paramVisibleCount = !this.isCompare ? this.paramTreeCount : Mdf.paramCount(this.theModel)
    },
    onTableTreeUpdated (cnt) {
      this.tableTreeCount = cnt || 0
      this.tableVisibleCount = !this.isCompare ? this.tableTreeCount : Mdf.tableCount(this.theModel)
    },

    // show run description and notes dialog
    onEditRunNote (dgst) {
      this.isShowNoteEditor = true
      this.noteEditorLangCode = this.uiLang || this.$q.lang.getLocale() || ''
      this.isParamTreeShow = false
      this.isTableTreeShow = false
    },
    // save run notes editor content
    onSaveRunNote (descr, note, isUpd, lc) {
      this.doSaveRunNote(this.runDigestSelected, lc, descr, note)
      this.isShowNoteEditor = false
    },
    onCancelRunNote (dgst) {
      this.isShowNoteEditor = false
    },

    // run comparison click: set or clear run comparison
    onRunCompareClick (dgst) {
      // if clear run comparison filter
      if (dgst === this.runCompare.RunDigest) {
        this.clearRunCompare()
        return
      }
      // esle: start run comparison by refresh run
      this.runDigestRefresh = dgst
      this.refreshRunTickle = !this.refreshRunTickle
      this.isNewWorksetShow = false // clear new workset create panel
      this.resetNewWorkset()
    },
    // run to compare loaded from the server
    doneRunLoad (isSuccess, dgst) {
      this.loadRunWait = false
      if (!isSuccess) return

      this.runCompare = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: dgst })
      if (!Mdf.isNotEmptyRunText(this.runCompare)) {
        this.runDigestRefresh = ''
        console.warn('Unable to compare run:', dgst, this.runDigestRefresh)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to compare model run') + ' ' + this.runDigestRefresh })
        return
      }

      // compare parameters by value digest: both Param[] arrays must contain all parameters
      const pn = []
      for (let k = 0; k < this.runCurrent.Param.length; k++) {
        if (this.runCurrent.Param[k].ValueDigest !== this.runCompare.Param[k].ValueDigest) pn.push(this.runCurrent.Param[k].Name)
      }

      // compare output tables by value digest:
      // Table[] arrays can contain diffrent tables or both can have full table list
      const tn = []
      const nCur = this.runCurrent.Table.length
      const nCmp = this.runCompare.Table.length

      if (nCur === nCmp && nCur === Mdf.tableCount(this.theModel)) { // both runs contain all output tables
        for (let k = 0; k < this.runCurrent.Table.length; k++) {
          if (this.runCurrent.Table[k].ValueDigest !== this.runCompare.Table[k].ValueDigest) tn.push(this.runCurrent.Table[k].Name)
        }
      } else {
        // at least one table of the Table[] arrays does not contain all model tables
        const tm = nCur > nCmp ? this.runCurrent.Table : this.runCompare.Table
        const ts = nCur > nCmp ? this.runCompare.Table : this.runCurrent.Table

        for (let k = 0; k < tm.length; k++) {
          const j = ts.findIndex((t) => { return t.Name === tm[k].Name })
          if (j >= 0 && ts[j].ValueDigest !== tm[k].ValueDigest) tn.push(tm[k].Name)
        }
      }

      // notify user about results
      if (pn.length) {
        this.paramVisibleCount = Mdf.paramCount(this.theModel)
        this.$q.notify({ type: 'info', message: this.$t('Number of different parameters') + ': ' + pn.length })
      } else {
        this.$q.notify({ type: 'info', message: this.$t('All parameters values identical') })
      }
      if (tn.length) {
        this.tableVisibleCount = Mdf.tableCount(this.theModel)
        this.$q.notify({ type: 'info', message: this.$t('Number of different output tables') + ': ' + tn.length })
      } else {
        this.$q.notify({ type: 'info', message: this.$t('All output tables  values identical') })
      }

      this.paramDiff = Object.freeze(pn)
      this.tableDiff = Object.freeze(tn)
      this.refreshParamTreeTickle = !this.refreshParamTreeTickle
      this.refreshTableTreeTickle = !this.refreshTableTreeTickle
      this.dispatchRunDigestCompare({ digest: this.digest, runCompare: this.runDigestRefresh })
    },
    // clear run comparison
    clearRunCompare () {
      this.runDigestRefresh = ''
      this.runCompare = Mdf.emptyRunText()
      this.paramDiff = []
      this.tableDiff = []
      this.paramVisibleCount = this.paramTreeCount
      this.tableVisibleCount = this.tableTreeCount
      this.refreshParamTreeTickle = !this.refreshParamTreeTickle
      this.refreshTableTreeTickle = !this.refreshTableTreeTickle
      this.dispatchRunDigestCompare({ digest: this.digest, runCompare: '' })
      // clear new workset create panel
      this.isNewWorksetShow = false
      this.resetNewWorkset()
    },

    // create new workset from parameters different between two runs
    //
    // return true to disable new workset create button click
    isNewWorksetDisabled () {
      return !this.isCompare || !Array.isArray(this.paramDiff) || this.paramDiff.length <= 0 || this.isNewWorksetShow || this.isShowNoteEditor
    },
    // start create new workset
    onNewWorksetClick () {
      this.resetNewWorkset()
      this.isNewWorksetShow = true
      this.isParamTreeShow = false
      this.isTableTreeShow = false
    },
    // cancel creation of new workset
    onNewWorksetCancel () {
      this.resetNewWorkset()
      this.isNewWorksetShow = false
    },
    // send request to create new workset
    onNewWorksetSave (dgst, name, txt) {
      this.nameOfNewWorkset = name || ''

      // parameters to copy into the new workset
      const pLst = []
      for (const pn of this.paramDiff) {
        pLst.push({
          name: pn,
          isGroup: false
        })
      }
      this.copyParamNewWorkset = Object.freeze(pLst)

      this.newDescrNotes = txt || []
      this.isCreateWorksetNow = true
    },
    // request to create workset completed
    doneWorksetCreate  (isSuccess, dgst, name) {
      this.loadWorksetCreate = false
      this.resetNewWorkset()

      if (!isSuccess) return // workset not created: keep user input

      this.isNewWorksetShow = false // workset created: close section

      if (dgst && name && dgst === this.digest) { // if the same model then refresh workset from server
        this.$emit('set-select', name)
      }
    },
    // clean new workset data
    resetNewWorkset () {
      this.isCreateWorksetNow = false
      this.nameOfNewWorkset = ''
      this.copyParamNewWorkset = []
      this.newDescrNotes = []
    },
    // end of create new workset
    //

    // show yes/no dialog to confirm run delete
    onRunDelete (runName, dgst, status) {
      this.runNameToDelete = runName
      this.runDigestToDelete = dgst
      this.runStatusToDelete = status
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // user answer yes to confirm delete model run
    onYesRunDelete (runName, dgst) {
      if (dgst === this.runCompare.RunDigest) {
        this.clearRunCompare()
      }
      this.doRunDelete(dgst, runName)
    },

    // click on run download: start run download and show download list page
    onDownloadRun (dgst) {
      // if run digest is empty or run not completed successfully then do not show download page
      if (!dgst || !Mdf.isRunSuccess(
        this.runTextByDigest({ ModelDigest: this.digest, RunDigest: dgst })
      )) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model run, it is not completed successfully') })
        return
      }

      this.startRunDownload(dgst) // start run download and show download page on success
    },

    // show or hide parameters tree
    onToogleShowParamTree () {
      this.isParamTreeShow = !this.isParamTreeShow
      this.isTableTreeShow = false
    },
    // click on parameter: open current run parameter values tab
    onRunParamClick (name) {
      this.$emit('run-parameter-select', name)
    },
    // show run parameter notes dialog
    doShowParamNote (name) {
      this.paramInfoName = name
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    // show or hide output tables tree
    onToogleShowTableTree () {
      this.isTableTreeShow = !this.isTableTreeShow
      this.isParamTreeShow = false
    },
    // click on output table: open current run output table values tab
    onTableLeafClick (name) {
      this.$emit('table-select', name)
    },
    // show run output table notes dialog
    doShowTableNote (name) {
      this.tableInfoName = name
      this.tableInfoTickle = !this.tableInfoTickle
    },

    // return tree of model runs
    makeRunTreeData (rLst) {
      this.isAnyRunGroup = false
      this.runFilter = ''

      if (!Mdf.isLength(rLst)) return [] // empty run list
      if (!Mdf.isRunTextList(rLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model run list is empty or invalid') })
        return [] // invalid run list
      }

      // add runs which are not included in any group
      const td = []

      for (const r of rLst) {
        td.push({
          key: 'rtl-' + r.RunDigest + '-' + this.nextId++,
          digest: r.RunDigest,
          label: r.Name,
          stamp: r.RunStamp,
          status: r.Status,
          lastTime: Mdf.dtStr(r.UpdateDateTime),
          descr: Mdf.descrOfTxt(r),
          children: [],
          disabled: false
        })
      }
      return td
    },

    // delete run
    async doRunDelete (dgst, runName) {
      if (!dgst) {
        console.warn('Unable to delete: invalid (empty) run digest')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + dgst + ' ' + (runName || '') })
      this.loadWait = true

      let isOk = false
      const u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent((dgst || ''))
      try {
        await this.$axios.delete(u) // response expected to be empty on success
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at delete model run', dgst, runName, em)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete') + ': ' + dgst + ' ' + (runName || '') })
        return
      }

      // refresh run list from the server
      this.$emit('run-list-refresh')
      this.$q.notify({ type: 'info', message: this.$t('Deleted') + ': ' + dgst + ' ' + (runName || '') })
    },

    // start run download
    async startRunDownload (dgst) {
      let isOk = false
      let msg = ''

      const opts = {
        NoAccumulatorsCsv: this.noAccDownload,
        NoMicrodataCsv: this.noMicrodataDownload,
        Utf8BomIntoCsv: this.$q.platform.is.win
      }
      const u = this.omsUrl +
        '/api/download/model/' + encodeURIComponent(this.digest) +
        '/run/' + encodeURIComponent((dgst || ''))
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.post(u, opts)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to download model run', msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download model run') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$emit('download-select', this.digest) // download started: show download list page
      this.$q.notify({ type: 'info', message: this.$t('Model run download started') })
    },

    // show model run upload panel
    doShowFileSelect () {
      this.uploadFileSelect = true
    },
    // hides model upload panel
    doCancelFileSelect () {
      this.uploadFileSelect = false
      this.uploadFile = null
    },

    // upload model run zip file
    async onUploadRun () {
      // check file name and notify user
      const fName = this.uploadFile?.name
      if (!fName) {
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) file name') })
        return
      }
      // check if model run with the same name already exist
      for (const rt of this.runTextList) {
        if (Mdf.isRunText(rt) && Mdf.modelName(this.theModel) + '.run.' + rt.Name + '.zip' === fName) {
          this.$q.notify({ type: 'negative', message: this.$t('Model run with the same name already exist' + ': ' + rt.Name) })
          return
        }
      }
      this.$q.notify({ type: 'info', message: this.$t('Uploading') + ': ' + fName + '\u2026' })

      // make upload multipart form
      const fd = new FormData()
      fd.append('run.zip', this.uploadFile, fName) // name and file name are ignored by server

      const u = this.omsUrl + '/api/upload/model/' + encodeURIComponent(this.digest) + '/run'
      try {
        // update run zip, drop response on success
        await this.$axios.post(u, fd)
      } catch (e) {
        let msg = ''
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to upload model run', msg, fName)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to upload model run') + ': ' + fName })
        return
      }

      // notify user and close upload controls
      this.doCancelFileSelect()
      this.$q.notify({ type: 'info', message: this.$t('Uploaded') + ': ' + fName })
      this.$q.notify({ type: 'info', message: this.$t('Import model run') + ': ' + fName + '\u2026' })

      // upload started: show upload list page
      this.$emit('upload-select', this.digest)
      this.$emit('run-list-refresh') // refresh model run list if upload completed fast
    },

    // save run notes
    async doSaveRunNote (dgst, langCode, descr, note) {
      let isOk = false
      let msg = ''

      // validate current run is not empty and has a language
      if (!Mdf.isNotEmptyRunText(this.runCurrent)) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save model run description and notes, current model run is undefined') })
        return
      }
      if (!langCode) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save model run description and notes, language is unknown') })
        return
      }
      this.loadWait = true

      const u = this.omsUrl + '/api/run/text'
      const rt = {
        ModelDigest: this.digest,
        RunDigest: dgst,
        Txt: [{
          LangCode: langCode,
          Descr: descr || '',
          Note: note || ''
        }]
      }
      try {
        // send run description and notes, response expected to be empty on success
        await this.$axios.patch(u, rt)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to save model run description and notes', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save model run description and notes') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$emit('run-select', dgst)
      this.$q.notify({ type: 'info', message: this.$t('Model run description and notes saved') + '. ' + this.$t('Language') + ': ' + langCode })
    },

    ...mapActions('uiState', {
      dispatchRunDigestCompare: 'runDigestCompare'
    })
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'run-list', { digest: this.digest })
  }
}
