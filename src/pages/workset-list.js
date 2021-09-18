import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import WorksetParameterList from 'components/WorksetParameterList.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import ParameterInfoDialog from 'components/ParameterInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import EditDiscardDialog from 'components/EditDiscardDialog.vue'
import DeleteConfirmDialog from 'components/DeleteConfirmDialog.vue'

export default {
  name: 'WorksetList',
  components: { WorksetParameterList, WorksetInfoDialog, ParameterInfoDialog, GroupInfoDialog, EditDiscardDialog, DeleteConfirmDialog },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
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
      showDeleteDialog: false,
      showEditDiscardTickle: false,
      //
      isNewWorksetShow: false,
      nameOfNewWorkset: ''
    }
  },

  computed: {
    isNotEmptyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) },
    descrWorksetCurrent () { return Mdf.descrOfTxt(this.worksetCurrent) },
    paramCountWorksetCurrent () { return Mdf.worksetParamCount(this.worksetCurrent) },

    // if true then selected workset in edit mode else read-only and model run enabled
    isReadonlyWorksetCurrent () {
      return Mdf.isNotEmptyWorksetText(this.worksetCurrent) && this.worksetCurrent.IsReadonly
    },
    // return true if name of new workset is valid
    isValidNameOfNewWorkset () {
      return Mdf.cleanFileNameInput(this.nameOfNewWorkset) !== ''
    },

    ...mapState('model', {
      theModel: state => state.theModel,
      worksetTextList: state => state.worksetTextList,
      worksetTextListUpdated: state => state.worksetTextListUpdated
    }),
    ...mapGetters('model', {
      worksetTextByName: 'worksetTextByName'
    }),
    ...mapState('uiState', {
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
    }
  },

  methods: {
    dateTimeStr (dt) { return Mdf.dtStr(dt) },

    // update page view
    doRefresh () {
      this.treeData = this.makeWorksetTreeData(this.worksetTextList)
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: this.worksetNameSelected })
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

    // show yes/no dialog to confirm workset delete
    onShowWorksetDelete (name) {
      this.worksetNameToDelete = name
      this.showDeleteDialog = !this.showDeleteDialog
    },
    // user answer yes to confirm delete model workset
    onYesWorksetDelete (name) {
      this.doWorksetDelete(name)
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

    // create new workset
    onNewWorkset () {
      this.isNewWorksetShow = true
    },
    // validate and save new workset
    onSaveNewWorkset () {
      const name = Mdf.cleanFileNameInput(this.nameOfNewWorkset)
      this.doCreateNewWorkset(name)
      //
      this.nameOfNewWorkset = ''
      this.isNewWorksetShow = false
    },
    // discard new workset
    onCancelNewWorkset () {
      if (this.isNewWorksetUpdated()) { // redirect to dialog to confirm "discard changes?"
        this.showEditDiscardTickle = !this.showEditDiscardTickle
        return
      }
      // else: close new workset editor (no changes in data)
      this.nameOfNewWorkset = ''
      this.isNewWorksetShow = false
    },
    // on user selecting "Yes" from "discard changes?" pop-up alert
    onYesDiscardNewWorkset () {
      this.nameOfNewWorkset = ''
      this.isNewWorksetShow = false
    },
    // return true if new workset info is entered
    isNewWorksetUpdated () {
      return (this.nameOfNewWorkset || '') !== ''
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

    // create new workset
    async doCreateNewWorkset (name) {
      // workset name must be valid and cannot be longer than db column
      if (typeof name !== typeof 'string' || !name || Mdf.cleanFileNameInput(name) !== name || name.length > 255) {
        console.warn('Invalid (empty) workset name:', name)
        this.$q.notify({ type: 'info', message: this.$t('Invalid (or empty) input scenario name') + ((name || '') !== '' ? ': ' + (name || '') : '') })
        return
      }

      const ws = { ModelDigest: this.digest, Name: name }

      let isOk = false
      let nm = ''
      const u = this.omsUrl + '/api/workset-create'
      try {
        const response = await this.$axios.put(u, ws)
        nm = response.data?.Name
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at cretae workset', name, em)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to create input scenario') + ': ' + name })
        return
      }

      // refresh workset list from the server
      this.$emit('set-list-refresh')
      this.$q.notify({ type: 'info', message: this.$t('Created') + ': ' + nm })
    },

    // delete workset
    async doWorksetDelete (name) {
      if (!name) {
        console.warn('Unable to delete: invalid (empty) workset name')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + name })

      let isOk = false
      const u = this.omsUrl + '/api/model/' + this.digest + '/workset/' + (name || '')
      try {
        await this.$axios.delete(u) // response expected to be empty on success
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at delete workset', name, em)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete') + ': ' + name })
        return
      }

      // refresh workset list from the server
      this.$emit('set-list-refresh')
      this.$q.notify({ type: 'info', message: this.$t('Deleted') + ': ' + name })
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
