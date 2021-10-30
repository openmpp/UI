import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import WorksetParameterList from 'components/WorksetParameterList.vue'
import RunParameterList from 'components/RunParameterList.vue'
import RunBar from 'components/RunBar.vue'
import WorksetBar from 'components/WorksetBar.vue'
import RefreshWorkset from 'components/RefreshWorkset.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import ConfirmDialog from 'components/ConfirmDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'
import MarkdownEditor from 'components/MarkdownEditor.vue'

export default {
  name: 'WorksetEdit',
  components: {
    WorksetParameterList,
    RunParameterList,
    RunBar,
    WorksetBar,
    RefreshWorkset,
    RunInfoDialog,
    WorksetInfoDialog,
    ParameterInfoDialog,
    GroupInfoDialog,
    ConfirmDialog,
    DeleteConfirmDialog,
    MarkdownEditor
  },

  props: {
    digest: { type: String, default: '' },
    worksetName: { type: String, required: true },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadWait: false,
      loadWsWait: false,
      refreshWsTickle: false,
      refreshWsTreeTickle: false,
      worksetCurrent: Mdf.emptyWorksetText(), // current workset
      worksetSelected: Mdf.emptyWorksetText(), // selected workset
      isParamTreeShow: false,
      paramTreeCount: 0,
      worksetInfoTickle: false,
      worksetInfoName: '',
      groupInfoTickle: false,
      groupInfoName: '',
      paramInfoTickle: false,
      paramInfoName: '',
      showDeleteDialogTickle: false,
      runCurrent: Mdf.emptyRunText(), // selected run
      paramRunInfoTickle: false,
      useBaseRun: false,
      baseDigest: '',
      runInfoTickle: false,
      showReplaceDialogTickle: false,
      sourceParamReplace: '',
      kindParamReplace: '',
      isShowNoteEditor: false,
      noteEditorLangCode: '',
      descrCurrent: '',
      noteCurrent: ''
    }
  },

  computed: {
    isNotEmptyWorksetSelected () { return Mdf.isNotEmptyWorksetText(this.worksetSelected) },
    isReadonlyWorksetSelected () { return Mdf.isNotEmptyWorksetText(this.worksetSelected) && this.worksetSelected.IsReadonly },
    isReadonlyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) && this.worksetCurrent.IsReadonly },

    // retrun true if current run is completed: success, error or exit
    // if run not successfully completed then it we don't know is it possible to use as base run
    isCompletedRunCurrent () {
      return this.baseDigest ? Mdf.isRunSuccess(this.runCurrent) : false
    },

    ...mapState('model', {
      theModel: state => state.theModel,
      worksetTextList: state => state.worksetTextList,
      worksetTextListUpdated: state => state.worksetTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest',
      worksetTextByName: 'worksetTextByName'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected,
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
    worksetTextListUpdated () { this.doRefresh() },
    worksetNameSelected () { this.worksetSelected = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected }) }
  },

  methods: {
    dateTimeStr (dt) { return Mdf.dtStr(dt) },

    // update page view
    doRefresh () {
      this.worksetSelected = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetName })
      this.paramTreeCount = Mdf.worksetParamCount(this.worksetCurrent)

      this.useBaseRun = (this.worksetCurrent?.BaseRunDigest || '') !== ''

      if ((this.baseDigest || '') === '') {
        this.baseDigest = this.worksetCurrent?.BaseRunDigest || this.runDigestSelected || ''
      }
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.baseDigest })
    },

    doneWsLoad (isSuccess, name) {
      this.loadWsWait = false
      if (isSuccess && (name || '') !== '') this.refreshWsTreeTickle = !this.refreshWsTreeTickle
    },

    // show workset notes dialog
    doShowWorksetNote (name) {
      this.worksetInfoName = name
      this.worksetInfoTickle = !this.worksetInfoTickle
    },
    // show current run info dialog
    doShowRunNote (modelDgst, runDgst) {
      if (modelDgst !== this.digest) {
        console.warn('invlaid model digest or run digest:', modelDgst, runDgst)
        return
      }
      this.runInfoTickle = !this.runInfoTickle
    },
    // show currently edited workset parameter notes dialog
    doShowParamNoteCurrent (name) {
      this.paramInfoName = name
      this.worksetInfoName = this.worksetName
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show workset parameter notes dialog
    doShowParamNoteSelected (name) {
      this.paramInfoName = name
      this.worksetInfoName = this.worksetNameSelected
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show run parameter notes dialog
    doShowParamRunNote (name) {
      this.paramInfoName = name
      this.paramRunInfoTickle = !this.paramRunInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    // use base run toggle: update base run of workset
    onBaseRunToggle (val, e) {
      this.useBaseRun = !!val || false
      this.doSaveBaseRun(this.worksetName, !this.useBaseRun, (this.useBaseRun ? this.baseDigest : ''))
    },

    // show or hide parameters tree
    onToogleShowParamTree () {
      this.isParamTreeShow = !this.isParamTreeShow
    },
    // parameters tree updated and leafs counted
    onParamTreeUpdated (cnt) {
      this.paramTreeCount = cnt || 0
    },

    // copy parameter from selected workset
    onParamWorksetCopy (name) {
      if (!name) {
        console.warn('Unable to copy parameter from workset, parameter name is empty')
        return
      }
      // if parameter already exist in workset then ask user to confirm overwrite existing parameter
      const prs = Mdf.paramRunSetByName(this.worksetCurrent, name)
      if (Mdf.isNotEmptyParamRunSet(prs)) {
        this.paramInfoName = name
        this.sourceParamReplace = this.worksetNameSelected
        this.kindParamReplace = 'set'
        this.showReplaceDialogTickle = !this.showReplaceDialogTickle
        return
      }
      // else copy parameter from workset
      this.doCopyFromWorkset(false, this.worksetName, name, this.worksetNameSelected)
    },
    // copy parameter from selected run
    onParamRunCopy (name) {
      if (!name) {
        console.warn('Unable to copy parameter from run, parameter name is empty')
        return
      }
      // if parameter already exist in workset then ask user to confirm overwrite existing parameter
      const prs = Mdf.paramRunSetByName(this.worksetCurrent, name)
      if (Mdf.isNotEmptyParamRunSet(prs)) {
        this.paramInfoName = name
        this.sourceParamReplace = this.runDigestSelected
        this.kindParamReplace = 'run'
        this.showReplaceDialogTickle = !this.showReplaceDialogTickle
        return
      }
      // else copy parameter from run
      this.doCopyFromRun(false, this.worksetName, name, this.runDigestSelected)
    },
    // user answer yes to replace exsiting parameter: do copy from run or selected workset
    onYesReplace (name, from, kind) {
      if (kind === 'run') {
        this.doCopyFromRun(true, this.worksetName, name, from)
      } else {
        this.doCopyFromWorkset(true, this.worksetName, name, from)
      }
    },

    // delete parameter from current workset: ask user confirmation to delete paramater values
    onParamWorksetDelete (name) {
      this.paramInfoName = name
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // user answer yes to delete parameter from currentd workset
    onYesDeleteParameter (name) {
      this.doDeleteFromWorkset(this.worksetName, name)
    },

    // save description and notes editor content
    onShowNoteEditor () {
      this.descrCurrent = Mdf.descrOfTxt(this.worksetCurrent)
      this.noteEditorLangCode = this.uiLang || this.$q.lang.getLocale() || ''
      this.noteCurrent = Mdf.noteOfTxt(this.worksetCurrent)
      this.isShowNoteEditor = true
    },
    // save description and notes editor content
    onSaveNoteEditor (descr, note, isUpd, lc) {
      this.doSaveNote(this.worksetName, lc, descr, note)
      this.isShowNoteEditor = false
    },
    // reset note editor to current workset values
    onCancelNoteEditor (name) {
      this.isShowNoteEditor = false
    },

    // copy parameter from selected run
    async doCopyFromRun (isReplace, wsName, paramName, runDgst) {
      let isOk = false
      let msg = ''

      // validate current current workset is not read-only
      if (!wsName || !Mdf.isNotEmptyWorksetText(this.worksetCurrent) || this.worksetCurrent.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to copy parameter into input scenario, it is read-only (or undefined)') })
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Copy') + ': ' + paramName })
      this.loadWait = true

      const u = isReplace
        ? this.omsUrl + '/api/model/' + this.digest + '/workset/' + wsName + '/merge/parameter/' + paramName + '/from-run/' + runDgst
        : this.omsUrl + '/api/model/' + this.digest + '/workset/' + wsName + '/copy/parameter/' + paramName + '/from-run/' + runDgst
      try {
        // copy parameter from model run, response is empty on success
        if (isReplace) {
          await this.$axios.patch(u)
        } else {
          await this.$axios.put(u)
        }
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to copy parameter', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to copy parameter') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Copy completed') + ': ' + paramName })
      this.refreshWsTickle = !this.refreshWsTickle
    },

    // copy parameter from selected workset
    async doCopyFromWorkset (isReplace, wsName, paramName, srcWsName) {
      let isOk = false
      let msg = ''

      // validate current current workset is not read-only
      if (!wsName || !Mdf.isNotEmptyWorksetText(this.worksetCurrent) || this.worksetCurrent.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to copy parameter into input scenario, it is read-only (or undefined)') })
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Copy') + ': ' + paramName })
      this.loadWait = true

      const u = isReplace
        ? this.omsUrl + '/api/model/' + this.digest + '/workset/' + wsName + '/merge/parameter/' + paramName + '/from-workset/' + srcWsName
        : this.omsUrl + '/api/model/' + this.digest + '/workset/' + wsName + '/copy/parameter/' + paramName + '/from-workset/' + srcWsName
      try {
        // copy parameter from other workset, response is empty on success
        if (isReplace) {
          await this.$axios.patch(u)
        } else {
          await this.$axios.put(u)
        }
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to copy parameter', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to copy parameter') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Copy completed') + ': ' + paramName })
      this.refreshWsTickle = !this.refreshWsTickle
    },

    // delete parameter from current workset
    async doDeleteFromWorkset (wsName, paramName) {
      let isOk = false
      let msg = ''

      // validate current current workset is not read-only
      if (!wsName || !Mdf.isNotEmptyWorksetText(this.worksetCurrent) || this.worksetCurrent.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete from input scenario, it is read-only (or undefined)') })
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + paramName })
      this.loadWait = true

      const u = this.omsUrl + '/api/model/' + this.digest + '/workset/' + wsName + '/parameter/' + paramName
      try {
        // delete workset parameter, response is empty on success
        await this.$axios.delete(u)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to delete parameter from input scenario', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete parameter from input scenario') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Deleted') + ': ' + paramName })
      this.refreshWsTickle = !this.refreshWsTickle
    },

    // save workset base run digest
    async doSaveBaseRun (name, isClean, baseDgst) {
      let isOk = false
      let msg = ''

      // validate current current workset is not read-only
      if (!Mdf.isNotEmptyWorksetText(this.worksetCurrent) || this.worksetCurrent.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to update input scenario, it is read-only (or undefined)') })
        return
      }
      this.loadWait = true

      const u = this.omsUrl + '/api/workset-merge'
      const wt = {
        ModelDigest: this.digest,
        Name: name,
        BaseRunDigest: baseDgst,
        IsCleanBaseRun: isClean
      }
      const fd = new FormData()
      fd.append('workset', JSON.stringify(wt))
      try {
        // send new base run digest (or empty digest), drop response on success
        await this.$axios.patch(u, fd)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to update input scenario', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to update input scenario') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Input scenario updated') })
      this.refreshWsTickle = !this.refreshWsTickle
    },

    // save workset description and notes
    async doSaveNote (name, langCode, descr, note) {
      let isOk = false
      let msg = ''

      // validate current current workset is not read-only and has a language
      if (!Mdf.isNotEmptyWorksetText(this.worksetCurrent) || this.worksetCurrent.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save description and notes, input scenario is read-only (or undefined)') })
        return
      }
      if (!langCode) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save input scenario description and notes, language is unknown') })
        return
      }
      this.loadWait = true

      const u = this.omsUrl + '/api/workset-merge'
      const wt = {
        ModelDigest: this.digest,
        Name: name,
        Txt: [{
          LangCode: langCode,
          Descr: descr || '',
          Note: note || ''
        }]
      }
      const fd = new FormData()
      fd.append('workset', JSON.stringify(wt))
      try {
        // send run description and notes, drop response on success
        await this.$axios.patch(u, fd)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to save input scenario description and notes', msg)
      }
      this.loadWait = false
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to save input scenario description and notes') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$q.notify({ type: 'info', message: this.$t('Input scenario description and notes saved') + '. ' + this.$t('Language') + ': ' + langCode })
      this.refreshWsTickle = !this.refreshWsTickle
    }
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'set-edit', { digest: this.digest, worksetName: this.worksetName })
  }
}
