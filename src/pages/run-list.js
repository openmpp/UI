import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import RunParameterList from 'components/RunParameterList.vue'
import TableList from 'components/TableList.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import TableInfoDialog from 'components/TableInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'
import MarkdownEditor from 'components/MarkdownEditor.vue'

export default {
  name: 'RunList',
  components: {
    RunParameterList, TableList, RunInfoDialog, ParameterInfoDialog, TableInfoDialog, GroupInfoDialog, DeleteConfirmDialog, MarkdownEditor
  },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadWait: false,
      runCurrent: Mdf.emptyRunText(), // currently selected run
      isRunTreeCollapsed: false,
      isAnyRunGroup: false,
      runTreeData: [],
      runFilter: '',
      isParamTreeShow: false,
      paramTreeCount: 0,
      isTableTreeShow: false,
      tableTreeCount: 0,
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
      showDeleteDialogTickle: false,
      noteEditorShow: false,
      noteEditorLangCode: ''
    }
  },

  computed: {
    isNotEmptyRunCurrent () { return Mdf.isNotEmptyRunText(this.runCurrent) },
    descrRunCurrent () { return Mdf.descrOfTxt(this.runCurrent) },

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
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    runTextListUpdated () { this.doRefresh() },
    runDigestSelected () {
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
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
      this.runTreeData = this.makeRunTreeData(this.runTextList)
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })
      this.paramTreeCount = Mdf.paramCount(this.theModel)
      this.tableTreeCount = Mdf.tableCount(this.theModel)
    },

    // click on run: select this run as current run
    onRunLeafClick (dgst) {
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
    onParamTreeUpdated  (cnt) { this.paramTreeCount = cnt || 0 },
    onTableTreeUpdated (cnt) { this.tableTreeCount = cnt || 0 },

    // show run description and notes dialog WORKING HERE
    onEditRunNote (dgst) {
      this.noteEditorShow = true
      this.noteEditorLangCode = this.uiLang || this.$q.lang.getLocale() || ''
    },
    // save run notes editor content
    onSaveRunNote (descr, note, isUpd, lc) {
      this.doSaveRunNote(this.runDigestSelected, lc, descr, note)
      this.noteEditorShow = false
    },
    onCancelRunNote (dgst) {
      this.noteEditorShow = false
    },

    // show yes/no dialog to confirm run delete
    onShowRunDelete (runName, dgst) {
      this.runNameToDelete = runName
      this.runDigestToDelete = dgst
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // user answer yes to confirm delete model run
    onYesRunDelete (runName, dgst) {
      this.doRunDelete(dgst, runName)
    },

    // click on run download: start run download and show download list page
    doDownloadRun (dgst) {
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
    onParamLeafClick (key, name) {
      this.$emit('run-parameter-select', name)
    },
    // show run parameter notes dialog
    doShowParamNote (key, name) {
      this.paramInfoName = name
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (key, name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    // show or hide output tables tree
    onToogleShowTableTree () {
      this.isTableTreeShow = !this.isTableTreeShow
      this.isParamTreeShow = false
    },
    // click on output table: open current run output table values tab
    onTableLeafClick (key, name) {
      this.$emit('table-select', name)
    },
    // show run output table notes dialog
    doShowTableNote (key, name) {
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
      const u = this.omsUrl + '/api/model/' + this.digest + '/run/' + (dgst || '')
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

      const u = this.omsUrl + '/api/download/model/' + this.digest + '/run/' + (dgst || '')
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.post(u)
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
        // send download request to the server, response expected to be empty on success
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
      this.$q.notify({ type: 'info', message: this.$t('Model run description and notes saved, language: ' + langCode) })
    }
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'run-list', { digest: this.digest })
  }
}
