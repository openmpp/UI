import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import WorksetParameterList from 'components/WorksetParameterList.vue'
import RunParameterList from 'components/RunParameterList.vue'
import RunBar from 'components/RunBar.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import DeleteWorkset from 'components/DeleteWorkset.vue'
import CreateWorkset from 'components/CreateWorkset.vue'
import EditDiscardDialog from 'components/EditDiscardDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'
import MarkdownEditor from 'components/MarkdownEditor.vue'

export default {
  name: 'WorksetList',
  components: {
    WorksetParameterList,
    RunParameterList,
    RunBar,
    RunInfoDialog,
    WorksetInfoDialog,
    ParameterInfoDialog,
    GroupInfoDialog,
    DeleteWorkset,
    CreateWorkset,
    EditDiscardDialog,
    DeleteConfirmDialog,
    MarkdownEditor
  },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      loadWait: false,
      worksetCurrent: Mdf.emptyWorksetText(), // currently selected workset
      isTreeCollapsed: false,
      isAnyGroup: false,
      treeData: [],
      treeFilter: '',
      isParamTreeShow: false,
      worksetInfoTickle: false,
      worksetInfoName: '',
      groupInfoTickle: false,
      groupInfoName: '',
      paramInfoTickle: false,
      paramInfoName: '',
      nextId: 100,
      worksetNameToDelete: ',',
      showDeleteDialogTickle: false,
      showEditDiscardTickle: false,
      runCurrent: Mdf.emptyRunText(), // currently selected run
      paramRunInfoTickle: false,
      worksetDeleteName: '',
      deleteWorksetNow: false,
      loadWorksetDelete: false,
      //
      // create new or edit existing workset
      //
      isNewWorksetShow: false,
      createWorksetNow: false,
      loadWorksetCreate: false,
      nameOfNewWorkset: '',
      paramWsCopyLst: [],
      paramRunCopyLst: [],
      useBaseRun: false,
      runInfoTickle: false,
      txtNewWorkset: [], // workset description and notes
      newDescrNotes: [], // new workset description and notes
      noteEditorNewWorksetTickle: false
    }
  },

  computed: {
    isNotEmptyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) },
    descrWorksetCurrent () { return Mdf.descrOfTxt(this.worksetCurrent) },
    paramCountWorksetCurrent () { return Mdf.worksetParamCount(this.worksetCurrent) },
    isNotEmptyLanguageList () { return Mdf.isLangList(this.langList) },

    // if true then selected workset in edit mode else read-only and model run enabled
    isReadonlyWorksetCurrent () {
      return Mdf.isNotEmptyWorksetText(this.worksetCurrent) && this.worksetCurrent.IsReadonly
    },
    // retrun true if current run is completed: success, error or exit
    // if run not successfully completed then it we don't know is it possible to use as base run
    isCompletedRunCurrent () {
      return this.runDigestSelected ? Mdf.isRunSuccess(this.runCurrent) : false
    },
    // return true if name of new workset is empty after cleanup
    isEmptyNameOfNewWorkset () { return (Mdf.cleanFileNameInput(this.nameOfNewWorkset) || '') === '' },

    currentWsCopyChangeKey () { return this.worksetNameSelected + '-' + this.paramWsCopyLst.length.toString() },
    currentRunCopyChangeKey () { return this.runDigestSelected + '-' + this.paramRunCopyLst.length.toString() },

    ...mapState('model', {
      theModel: state => state.theModel,
      worksetTextList: state => state.worksetTextList,
      worksetTextListUpdated: state => state.worksetTextListUpdated,
      langList: state => state.langList
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest',
      worksetTextByName: 'worksetTextByName',
      modelLanguage: 'modelLanguage'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected
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
    worksetNameSelected () {
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
      this.paramWsCopyLst = []
    }
  },

  methods: {
    dateTimeStr (dt) { return Mdf.dtStr(dt) },

    // update page view
    doRefresh () {
      this.treeData = this.makeWorksetTreeData(this.worksetTextList)
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: this.runDigestSelected })

      // make list of model languages, description and notes for workset editor
      this.txtNewWorkset = []
      if (Mdf.isLangList(this.langList)) {
        for (const lcn of this.langList) {
          this.txtNewWorkset.push({
            LangCode: lcn.LangCode,
            LangName: lcn.Name,
            Descr: '',
            Note: ''
          })
        }
      } else {
        if (!this.txtNewWorkset.length) {
          this.txtNewWorkset.push({
            LangCode: this.modelLanguage.LangCode,
            LangName: this.modelLanguage.Name,
            Descr: '',
            Note: ''
          })
        }
      }
    },

    // expand or collapse all workset tree nodes
    doToogleExpandTree () {
      if (this.isTreeCollapsed) {
        this.$refs.worksetTree.expandAll()
      } else {
        this.$refs.worksetTree.collapseAll()
      }
      this.isTreeCollapsed = !this.isTreeCollapsed
    },
    // filter workset tree nodes by name (label), update date-time or description
    doTreeFilter (node, filter) {
      const flt = filter.toLowerCase()
      return (node.label && node.label.toLowerCase().indexOf(flt) > -1) ||
        ((node.lastTime || '') !== '' && node.lastTime.indexOf(flt) > -1) ||
        ((node.descr || '') !== '' && node.descr.toLowerCase().indexOf(flt) > -1)
    },
    // clear workset tree filter value
    resetFilter () {
      this.treeFilter = ''
      this.$refs.filterInput.focus()
    },
    // click on workset: select this workset as current workset
    onWorksetLeafClick (name) {
      this.$emit('set-select', name)
    },
    // show workset notes dialog
    doShowWorksetNote (name) {
      this.worksetInfoName = name
      this.worksetInfoTickle = !this.worksetInfoTickle
    },
    // show current run info dialog
    doShowRunNote (modelDgst, runDgst) {
      if (modelDgst !== this.digest || runDgst !== this.runDigestSelected) {
        console.warn('invlaid model digest or run digest:', modelDgst, runDgst)
        return
      }
      this.runInfoTickle = !this.runInfoTickle
    },

    // show yes/no dialog to confirm workset delete
    onShowWorksetDelete (name) {
      this.worksetNameToDelete = name
      this.showDeleteDialogTickle = !this.showDeleteDialogTickle
    },
    // user answer yes to confirm delete model workset
    onYesWorksetDelete (name) {
      this.worksetDeleteName = name
      this.deleteWorksetNow = true
    },
    // workset delete request completed
    doneWorksetDelete (isSuccess, dgst, name) {
      this.worksetDeleteName = ''
      this.deleteWorksetNow = false
      this.loadWorksetDelete = false
      //
      // if success and if the same model then refresh workset list from the server
      if (isSuccess && dgst && name && dgst === this.digest) {
        this.$emit('set-list-refresh')
      }
    },

    // click on  workset download: start workset download and show download list page
    doDownloadWorkset (name) {
      // if name is empty or workset is not read-only then do not show rn download page
      if (!name) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario, it is not a read-only') })
        return
      }
      const wt = this.worksetTextByName({ ModelDigest: this.digest, Name: name })
      if (!wt || !wt.IsReadonly) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario, it is not a read-only') })
        return
      }

      this.startWorksetDownload(name) // start workset download and show download page on success
    },

    // new model run using current workset name: open model run tab
    onNewRunClick () {
      this.$emit('new-run-select')
    },
    // toggle current workset readonly status: pass event from child up to the next level
    onWorksetEditToggle () {
      this.$emit('set-update-readonly', !this.worksetCurrent.IsReadonly)
    },

    // show or hide parameters tree
    onToogleShowParamTree () {
      this.isParamTreeShow = !this.isParamTreeShow
    },
    // click on parameter: open current workset parameter values tab
    onParamLeafClick (key, name) {
      this.$emit('set-parameter-select', name)
    },
    // show workset parameter notes dialog
    doShowParamNote (key, name) {
      this.paramInfoName = name
      this.paramInfoTickle = !this.paramInfoTickle
    },
    // show run parameter notes dialog
    doShowParamRunNote (key, name) {
      this.paramInfoName = name
      this.paramRunInfoTickle = !this.paramRunInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (key, name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },

    // return tree of model worksets
    makeWorksetTreeData (wLst) {
      this.isAnyGroup = false
      this.treeFilter = ''

      if (!Mdf.isLength(wLst)) return [] // empty workset list
      if (!Mdf.isWorksetTextList(wLst)) {
        this.$q.notify({ type: 'negative', message: this.$t('Input scenarios list is empty or invalid') })
        return [] // invalid workset list
      }

      // add worksets which are not included in any group
      const td = []

      for (const wt of wLst) {
        td.push({
          key: 'wtl-' + wt.Name + '-' + this.nextId++,
          label: wt.Name,
          isReadonly: wt.IsReadonly,
          lastTime: Mdf.dtStr(wt.UpdateDateTime),
          descr: Mdf.descrOfTxt(wt),
          children: [],
          disabled: false
        })
      }
      return td
    },

    // toggle: create new workset or cancel new workset editing
    doNewWorksetOrCancel () {
      if (!this.isNewWorksetShow) {
        this.onNewWorkset()
      } else {
        this.onCancelNewWorkset()
      }
    },
    // clean new workset info
    resetNewWorkset () {
      this.nameOfNewWorkset = ''
      this.useBaseRun = false
      this.paramWsCopyLst = []
      this.paramRunCopyLst = []
      for (const t of this.txtNewWorkset) {
        t.Descr = ''
        t.Note = ''
      }
      this.newDescrNotes = []
    },
    // create new workset
    onNewWorkset () {
      this.resetNewWorkset()
      this.isNewWorksetShow = true
      this.noteEditorNewWorksetTickle = !this.noteEditorNewWorksetTickle
    },
    // discard new workset
    onCancelNewWorkset () {
      if ((this.nameOfNewWorkset || '') !== '') { // redirect to dialog to confirm "discard changes?"
        this.showEditDiscardTickle = !this.showEditDiscardTickle
        return
      }
      // else: close new workset editor (no changes in data)
      this.nameOfNewWorkset = ''
      this.isNewWorksetShow = false
    },
    // on user selecting "Yes" from "discard changes?" pop-up alert
    onYesDiscardNewWorkset () {
      this.resetNewWorkset()
      this.isNewWorksetShow = false
    },
    // set default name of new workset
    onNewNameFocus (e) {
      if (typeof this.nameOfNewWorkset !== typeof 'string' || (this.nameOfNewWorkset || '') === '') {
        this.nameOfNewWorkset = 'New_' + this.worksetNameSelected + '_' + Mdf.dtToUnderscoreTimeStamp(new Date())
      }
    },
    // check if new workset name entered and cleanup input to be compatible with file name rules
    onNewNameBlur (e) {
      const { isEntered, name } = Mdf.doFileNameClean(this.nameOfNewWorkset)
      this.nameOfNewWorkset = isEntered ? name : ''
    },
    // add workset parameter into parameters copy list
    onParamWorksetCopy (name) {
      this.addParamOrGroupFromWorksetCopy(name, false)
    },
    // add workset paramters group into parameters copy list
    onParamGroupWorksetCopy (name) {
      this.addParamOrGroupFromWorksetCopy(name, true)
    },
    // add workset parameter or paramters group into parameters copy list
    addParamOrGroupFromWorksetCopy (name, isGroup) {
      if (!Mdf.isNotEmptyWorksetText(this.worksetCurrent)) {
        console.warn('Invalid (empty) workset to copy parameter from', name)
        return
      }
      this.addParamToCopyList(name, isGroup, this.paramWsCopyLst, this.paramRunCopyLst)
    },
    // add run parameter into parameters copy list
    onParamRunCopy (name) {
      this.addParamOrGroupFromRunCopy(name, false)
    },
    // add run paramters group into parameters copy list
    onParamGroupRunCopy (name) {
      this.addParamOrGroupFromRunCopy(name, true)
    },
    // add run parameter or paramters group into parameters copy list
    addParamOrGroupFromRunCopy (name, isGroup) {
      if (!Mdf.isNotEmptyRunText(this.runCurrent)) {
        console.warn('Invalid (empty) run to copy parameter from', name)
        return
      }
      this.addParamToCopyList(name, isGroup, this.paramRunCopyLst, this.paramWsCopyLst)
    },
    // add parameter name or parameters group name into parameters copy list
    // and remove from other copy list if present
    // for example: remove from run copy list if added into workset copy list
    addParamToCopyList (name, isGroup, copyLst, removeLst) {
      if (!name) {
        console.warn('Invalid (empty) parameter name to copy', name)
        return
      }
      // find parameter name or parameters group in the model
      let pg = {}

      if (!isGroup) {
        pg = Mdf.paramTextByName(this.theModel, name)
        if (!Mdf.isNotEmptyParamText(pg)) {
          console.warn('Invalid parameter to copy, not found in model parameters list:', name)
          return
        }
      } else {
        pg = Mdf.groupTextByName(this.theModel, name)
        if (!Mdf.isGroupText(pg) || !pg?.Group?.IsParam) {
          console.warn('Invalid parameters group to copy, not found in parameter groups list:', name)
          return
        }
      }

      // find index where to insert parameter name, if it is not already in the copy list
      const insPos = copyLst.findIndex((pn) => { return pn.name >= name })

      if (insPos >= 0 && insPos < copyLst.length && copyLst[insPos].name === name) return // parameter already in the list

      const pIns = {
        name: name,
        isGroup: isGroup,
        descr: Mdf.descrOfDescrNote(pg) || name
      }
      if (insPos >= 0 && insPos < copyLst.length) {
        copyLst.splice(insPos, 0, pIns)
      } else {
        copyLst.push(pIns)
      }

      this.removeParamFromCopyList(name, removeLst)
    },
    // remove workset parameter name or group name from parameters copy list
    onRemoveWsFromNewWorkset (name) {
      this.removeParamFromCopyList(name, this.paramWsCopyLst)
    },
    // remove run parameter name from parameters copy list
    onRemoveRunFromNewWorkset (name) {
      this.removeParamFromCopyList(name, this.paramRunCopyLst)
    },
    // remove parameter name or group name from parameters copy list
    removeParamFromCopyList (name, copyLst) {
      if (!name || !copyLst) return

      const rmPos = copyLst.findIndex((pn) => { return pn.name === name })
      if (rmPos >= 0 && rmPos < copyLst.length) {
        copyLst.splice(rmPos, 1)
      }
    },
    // validate and save new workset
    onSaveNewWorkset () {
      const name = Mdf.cleanFileNameInput(this.nameOfNewWorkset)
      if (name === '') {
        this.$q.notify({ type: 'negative', message: this.$t('Invalid (empty) delta input name') + ((name || '') !== '' ? ': ' + (name || '') : '') })
        return
      }

      // collect description and notes for each language
      this.newDescrNotes = []

      for (const t of this.txtNewWorkset) {
        const refKey = 'new-ws-note-editor-' + t.LangCode
        if (!Mdf.isLength(this.$refs[refKey]) || !this.$refs[refKey][0]) continue

        const udn = this.$refs[refKey][0].getDescrNote()
        if ((udn.descr || udn.note || '') !== '') {
          this.newDescrNotes.push({
            LangCode: t.LangCode,
            Descr: udn.descr,
            Note: udn.note
          })
        }
      }

      // send request to create new workset
      this.createWorksetNow = true
      this.isNewWorksetShow = false
    },
    // request to create workset completed
    doneWorksetCreate  (isSuccess, dgst, name) {
      this.createWorksetNow = false
      this.loadWorksetCreate = false
      this.nameOfNewWorkset = ''

      this.resetNewWorkset()

      // if success and if the same model then refresh workset list from the server
      if (isSuccess && dgst && name && dgst === this.digest) {
        this.$emit('set-list-refresh')
      }
    },

    // start workset download
    async startWorksetDownload (name) {
      let isOk = false
      let msg = ''

      const u = this.omsUrl + '/api/download/model/' + this.digest + '/workset/' + (name || '')
      try {
        // send download request to the server, response expected to be empty on success
        await this.$axios.post(u)
        isOk = true
      } catch (e) {
        try {
          if (e.response) msg = e.response.data || ''
        } finally {}
        console.warn('Unable to download model workset', msg)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to download input scenario') + (msg ? (': ' + msg) : '') })
        return
      }

      this.$emit('download-select', this.digest) // download started: show download list page
      this.$q.notify({ type: 'info', message: this.$t('Model input scenario download started') })
    }
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'set-list', { digest: this.digest })
  }
}
