import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'
import NewRunInit from 'components/NewRunInit.vue'
import RunBar from 'components/RunBar.vue'
import WorksetBar from 'components/WorksetBar.vue'
import TableList from 'components/TableList.vue'
import EntityList from 'components/EntityList.vue'
import RunInfoDialog from 'components/RunInfoDialog.vue'
import WorksetInfoDialog from 'components/WorksetInfoDialog.vue'
import TableInfoDialog from 'components/TableInfoDialog.vue'
import GroupInfoDialog from 'components/GroupInfoDialog.vue'
import EntityInfoDialog from 'components/EntityInfoDialog.vue'
import EntityAttrInfoDialog from 'components/EntityAttrInfoDialog.vue'
import MarkdownEditor from 'components/MarkdownEditor.vue'

export default {
  name: 'NewRun',
  components: {
    NewRunInit,
    RunBar,
    WorksetBar,
    TableList,
    EntityList,
    RunInfoDialog,
    WorksetInfoDialog,
    TableInfoDialog,
    GroupInfoDialog,
    EntityInfoDialog,
    EntityAttrInfoDialog,
    MarkdownEditor
  },

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false },
    runRequest: { type: Object, default: () => { return Mdf.emptyRunRequest() } }
  },

  data () {
    return {
      isInitRun: false,
      runCurrent: Mdf.emptyRunText(), // currently selected run
      worksetCurrent: Mdf.emptyWorksetText(), // currently selected workset
      useWorkset: false,
      useBaseRun: false,
      runTemplateLst: [],
      mpiTemplateLst: [],
      presetLst: [],
      profileLst: [],
      enableIni: false,
      enableIniAnyKey: false,
      csvCodeId: 'enumCode',
      runOpts: {
        runName: '',
        worksetName: '',
        baseRunDigest: '',
        runDescr: {}, // run description[language code]
        subCount: 1,
        threadCount: 1,
        progressPercent: 1,
        progressStep: 0,
        workDir: '',
        csvDir: '',
        csvId: false,
        iniName: '',
        useIni: false,
        iniAnyKey: false,
        profile: '',
        sparseOutput: false,
        runTmpl: '',
        mpiNpCount: 0,
        mpiUseJobs: false,
        mpiOnRoot: false,
        mpiTmpl: ''
      },
      microOpts: Mdf.emptyRunRequestMicrodata(),
      advOptsExpanded: false,
      mpiOptsExpanded: false,
      langOptsExpanded: false,
      retainTablesGroups: [], // if not empty then names of tables and groups to retain
      tablesRetain: [],
      refreshTableTreeTickle: false,
      tableCount: 0,
      tableInfoName: '',
      tableInfoTickle: false,
      groupInfoName: '',
      groupInfoTickle: false,
      entityAttrCount: 0, // total number of attributes of all entities
      entityAttrsUse: [], // entity.attribute names included selected for model run
      refreshEntityTreeTickle: false,
      entityInfoName: '',
      attrInfoName: '',
      entityInfoTickle: false,
      attrInfoTickle: false,
      newRunNotes: {
        type: Object,
        default: () => ({})
      },
      loadWait: false,
      loadConfig: false,
      isDiskOver: false,
      loadDiskUse: false,
      isRunOptsShow: true,
      runInfoTickle: false,
      worksetInfoTickle: false,
      txtNewRun: [] // array for run description and notes
    }
  },

  computed: {
    isNotEmptyRunCurrent () { return Mdf.isNotEmptyRunText(this.runCurrent) },
    isNotEmptyWorksetCurrent () { return Mdf.isNotEmptyWorksetText(this.worksetCurrent) },
    isNotEmptyLanguageList () { return Mdf.isLangList(this.langList) },
    isEmptyProfileList () { return !Mdf.isLength(this.profileLst) },
    isEmptyRunTemplateList () { return !Mdf.isLength(this.runTemplateLst) },
    // return true if current can be used for model run: if workset in read-only state
    isReadonlyWorksetCurrent () {
      return this.worksetCurrent?.Name && this.worksetCurrent?.IsReadonly
    },
    // return true if current run is completed: success, error or exit
    // if run not successfully completed then it we don't know is it possible or not to use it as base run
    isCompletedRunCurrent () {
      return this.runCurrent?.RunDigest && Mdf.isRunCompleted(this.runCurrent)
    },
    isRunDeleted () { return Mdf.isNotEmptyRunText(this.runCurrent) && Mdf.isRunDeletedStatus(this.runCurrent.Status, this.runCurrent.Name) },
    isNoTables () { return !this.tablesRetain || this.tablesRetain.length <= 0 },
    isMicrodata () { return !!this.serverConfig.AllowMicrodata && Mdf.entityCount(this.theModel) > 0 },
    isNoEntityAttrsUse () { return !this.entityAttrsUse || this.entityAttrsUse.length <= 0 },

    ...mapState('model', {
      theModel: state => state.theModel,
      groupTableLeafs: state => state.groupTableLeafs,
      langList: state => state.langList
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest',
      isExistInRunTextList: 'isExistInRunTextList',
      worksetTextByName: 'worksetTextByName',
      modelLanguage: 'modelLanguage'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      worksetNameSelected: state => state.worksetNameSelected,
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config,
      diskUseState: state => state.diskUse
    })
  },

  watch: {
    digest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // update page view
    doRefresh () {
      // refersh server config and disk usage
      this.doConfigRefresh()
      this.doGetDiskUse()

      // use selected run digest as base run digest or previous run digest if user resubmitting the run
      // use selected workset name or previous run workset name if user resubmitting the run
      let rDgst = this.runDigestSelected
      let wsName = this.worksetNameSelected
      if (Mdf.isNotEmptyRunRequest(this.runRequest)) {
        wsName = Mdf.getRunOption(this.runRequest.Opts, 'OpenM.SetName') || wsName
        rDgst = Mdf.getRunOption(this.runRequest.Opts, 'OpenM.BaseRunDigest') || rDgst
      }
      this.runCurrent = this.runTextByDigest({ ModelDigest: this.digest, RunDigest: rDgst })
      this.worksetCurrent = this.worksetTextByName({ ModelDigest: this.digest, Name: wsName })
      this.tableCount = Mdf.tableCount(this.theModel)

      // reset run options and state
      this.isInitRun = false

      this.runOpts.runName = ''
      this.runOpts.worksetName = ''
      this.runOpts.baseRunDigest = ''
      this.useWorkset = this.isReadonlyWorksetCurrent
      this.useBaseRun = this.isUseCurrentAsBaseRun() && !this.isRunDeleted
      this.runOpts.sparseOutput = false
      this.mpiNpCount = 0
      this.runOpts.mpiUseJobs = false // this.serverConfig.IsJobControl
      this.runOpts.mpiOnRoot = false

      // get model run template list
      // append empty '' string first to allow model run without template
      // if default run template exist then select it
      this.runTemplateLst = []
      const cfgDefaultTmpl = Mdf.configEnvValue(this.serverConfig, 'OM_CFG_DEFAULT_RUN_TMPL')

      if (Mdf.isLength(this.serverConfig.RunCatalog.RunTemplates)) {
        let isFound = false

        this.runTemplateLst.push('')
        for (const p of this.serverConfig.RunCatalog.RunTemplates) {
          this.runTemplateLst.push(p)
          if (!isFound) isFound = p === cfgDefaultTmpl
        }
        this.runOpts.runTmpl = isFound ? cfgDefaultTmpl : this.runTemplateLst[0]
      }

      // get MPI run template list and select default template
      this.runOpts.mpiTmpl = ''
      this.mpiTemplateLst = this.serverConfig.RunCatalog.MpiTemplates

      if (Mdf.isLength(this.mpiTemplateLst)) {
        let isFound = false
        const dMpiTmpl = this.serverConfig.RunCatalog.DefaultMpiTemplate

        for (let k = 0; !isFound && k < this.mpiTemplateLst.length; k++) {
          isFound = this.mpiTemplateLst[k] === cfgDefaultTmpl
        }
        if (isFound) this.runOpts.mpiTmpl = cfgDefaultTmpl

        if (!isFound && dMpiTmpl) {
          for (let k = 0; !isFound && k < this.mpiTemplateLst.length; k++) {
            isFound = this.mpiTemplateLst[k] === dMpiTmpl
          }
          if (isFound) this.runOpts.mpiTmpl = dMpiTmpl
        }
        if (!isFound) this.runOpts.mpiTmpl = this.mpiTemplateLst[0]
      }

      // check if usage of ini-file options allowed by server
      const cfgIni = Mdf.configEnvValue(this.serverConfig, 'OM_CFG_INI_ALLOW').toLowerCase()
      this.enableIni = cfgIni === 'true' || cfgIni === '1' || cfgIni === 'yes'
      this.runOpts.iniName = this.enableIni ? this.theModel.Model.Name + '.ini' : ''

      const cfgAnyIni = Mdf.configEnvValue(this.serverConfig, 'OM_CFG_INI_ANY_KEY').toLowerCase()
      this.enableIniAnyKey = this.enableIni && (cfgAnyIni === 'true' || cfgAnyIni === '1' || cfgAnyIni === 'yes')

      if (!this.enableIni) this.runOpts.useIni = false
      if (!this.enableIniAnyKey) this.runOpts.iniAnyKey = false

      // get profile list from server
      this.runOpts.profile = ''
      this.doProfileListRefresh()

      // init retain tables list from existing base run
      this.tablesRetain = []
      if (Mdf.isNotEmptyRunText(this.runCurrent)) {
        for (const t of this.runCurrent.Table) {
          if (t?.Name) this.tablesRetain.push(t?.Name)
        }
      }

      // entity microdata for that model run
      this.entityAttrCount = 0
      this.entityAttrsUse = []
      this.microOpts = Mdf.emptyRunRequestMicrodata()

      if (this.isMicrodata) {
        for (const et of this.theModel.EntityTxt) {
          this.entityAttrCount += Mdf.entityAttrCount(et)
        }

        // init microdata list from existing base run
        if (Mdf.isNotEmptyRunText(this.runCurrent)) {
          for (const e of this.runCurrent.Entity) {
            if (e?.Name && Array.isArray(e?.Attr)) {
              for (const a of e.Attr) {
                this.entityAttrsUse.push(e.Name + '.' + a)
              }
            }
          }
        }
      }

      // make list of model languages, description and notes for workset editor
      this.newRunNotes = {}

      this.txtNewRun = []
      if (Mdf.isLangList(this.langList)) {
        for (const lcn of this.langList) {
          this.txtNewRun.push({
            LangCode: lcn.LangCode,
            LangName: lcn.Name,
            Descr: '',
            Note: ''
          })
        }
      } else {
        if (!this.txtNewRun.length) {
          this.txtNewRun.push({
            LangCode: this.modelLanguage.LangCode,
            LangName: this.modelLanguage.Name,
            Descr: '',
            Note: ''
          })
        }
      }

      // get run options presets as array of { name, label, descr, opts{....} }
      this.presetLst = Mdf.configRunOptsPresets(this.serverConfig, this.theModel.Model.Name, this.uiLang, this.modelLanguage.LangCode)

      // if previous run request resubmitted then apply settings from run request
      // else if first preset starts with "current-model-name." then apply preset
      if (Mdf.isNotEmptyRunRequest(this.runRequest)) {
        this.applyRunRequest(this.runRequest)
      } else {
        if (Array.isArray(this.presetLst) && this.presetLst.length > 0) {
          if (this.presetLst[0].name?.startsWith(this.theModel.Model.Name + '.')) this.doPresetSelected(this.presetLst[0])
        }
      }
    },

    // use current run as base base run if:
    //   current run is compeleted and
    //   current workset not readonly
    //   or current workset not is full and current workset not based on run
    isUseCurrentAsBaseRun () {
      return this.isCompletedRunCurrent && (!this.isReadonlyWorksetCurrent || this.isPartialWorkset())
    },
    // current workset not is full and current workset not based on run
    isPartialWorkset () {
      return (Mdf.worksetParamCount(this.worksetCurrent) !== Mdf.paramCount(this.theModel)) &&
          (!this.worksetCurrent?.BaseRunDigest || !this.isExistInRunTextList({ ModelDigest: this.digest, RunDigest: this.worksetCurrent?.BaseRunDigest }))
    },
    // if use base run un-checked then user must supply full set of input parameters
    onUseBaseRunClick () {
      if (!this.useBaseRun && !this.runOpts.csvDir && this.isUseCurrentAsBaseRun()) {
        this.$q.notify({ type: 'warning', message: this.$t('Input scenario should include all parameters otherwise model run may fail') })
      }
    },

    // click on MPI use job control: set number of processes at least 1
    onMpiUseJobs () {
      if (!this.serverConfig.IsJobControl) {
        this.$q.notify({ type: 'warning', message: this.$t('Model run Jobs disabled on the server') })
        return
      }
      if (this.runOpts.mpiUseJobs && this.runOpts.mpiNpCount <= 0) this.runOpts.mpiNpCount = 1
    },
    // change MPI number of processes: set job control usage flag as it is on the server
    onMpiNpCount () {
      if (this.runOpts.mpiNpCount <= 0) {
        this.runOpts.mpiUseJobs = false
      } else {
        this.runOpts.mpiUseJobs = this.serverConfig.IsJobControl
      }
    },

    // show current run info dialog
    doShowRunNote (modelDgst, runDgst) {
      if (modelDgst !== this.digest || runDgst !== this.runCurrent?.RunDigest) {
        console.warn('invlaid model digest or run digest:', modelDgst, runDgst)
        return
      }
      this.runInfoTickle = !this.runInfoTickle
    },
    // show current workset notes dialog
    doShowWorksetNote (modelDgst, name) {
      if (modelDgst !== this.digest || name !== this.worksetCurrent?.Name) {
        console.warn('invlaid model digest or workset name:', modelDgst, name)
        return
      }
      this.worksetInfoTickle = !this.worksetInfoTickle
    },
    // show output table notes dialog
    doShowTableNote (name) {
      this.tableInfoName = name
      this.tableInfoTickle = !this.tableInfoTickle
    },
    // show group notes dialog
    doShowGroupNote (name) {
      this.groupInfoName = name
      this.groupInfoTickle = !this.groupInfoTickle
    },
    // show entity attribute notes dialog
    doShowEntityAttrNote (attrName, entName) {
      this.attrInfoName = attrName
      this.entityInfoName = entName
      this.attrInfoTickle = !this.attrInfoTickle
    },
    // show entity attribute notes dialog
    doShowEntityNote (entName) {
      this.entityInfoName = entName
      this.entityInfoTickle = !this.entityInfoTickle
    },

    // click on clear filter: retain all output tables and groups
    onRetainAllTables () {
      this.tablesRetain = []
      this.tablesRetain.length = this.theModel.TableTxt.length
      let k = 0
      for (const t of this.theModel.TableTxt) {
        this.tablesRetain[k++] = t.Table.Name
      }
      this.refreshTableTreeTickle = !this.refreshTableTreeTickle
      this.$q.notify({ type: 'info', message: this.$t('Retain all output tables') })
    },

    // add output table into the retain tables list
    onTableAdd (name) {
      if (this.tablesRetain.length >= this.tableCount) return // all tables already in the retain list
      if (!name) {
        console.warn('Unable to add table into retain list, table name is empty')
        return
      }
      // add into tables retain list if not in the list already
      let isAdded = false
      if (this.tablesRetain.indexOf(name) < 0) {
        this.tablesRetain.push(name)
        isAdded = true
      }

      if (isAdded) {
        this.$q.notify({
          type: 'info',
          message: (this.tablesRetain.length < this.tableCount) ? this.$t('Retain output table: ') + ' ' + name : this.$t('Retain all output tables')
        })
        this.refreshTableTreeTickle = !this.refreshTableTreeTickle
      }
    },

    // add group of output tables into the retain tables list
    onTableGroupAdd (groupName) {
      if (!this.tablesRetain.length >= this.tableCount) return // all tables already in the retain list
      if (!groupName) {
        console.warn('Unable to add table group into retain list, group name is empty')
        return
      }
      // add each table from the group tables retain list if not in the list already
      const gt = this.groupTableLeafs[groupName]
      let isAdded = false
      if (gt) {
        for (const tn in gt?.leafs) {
          if (this.tablesRetain.indexOf(tn) < 0) {
            this.tablesRetain.push(tn)
            isAdded = true
          }
        }
      }

      if (isAdded) {
        this.$q.notify({
          type: 'info',
          message: (this.tablesRetain.length < this.tableCount) ? this.$t('Retain group of output tables: ') + groupName : this.$t('Retain all output tables')
        })
        this.refreshTableTreeTickle = !this.refreshTableTreeTickle
      }
    },

    // remove output table from the retain tables list
    onTableRemove (name) {
      if (this.tablesRetain.length <= 0) return // retain tables list already empty
      if (!name) {
        console.warn('Unable to remove table from retain list, table name is empty')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Suppress output table: ') + name })

      this.tablesRetain = this.tablesRetain.filter(tn => tn !== name)
      this.refreshTableTreeTickle = !this.refreshTableTreeTickle
    },

    // remove group of output tables from the retain tables list
    onTableGroupRemove (groupName) {
      if (this.tablesRetain.length <= 0) return // retain tables list already empty
      if (!groupName) {
        console.warn('Unable to remove table group from retain list, group name is empty')
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Suppress group of output tables: ') + groupName })

      // remove tables group from the list
      const gt = this.groupTableLeafs[groupName]
      if (gt) {
        this.tablesRetain = this.tablesRetain.filter(tn => !gt?.leafs[tn])
        this.refreshTableTreeTickle = !this.refreshTableTreeTickle
      }
    },

    // click on clear microdata attributes list: do not use any microdata for that model run
    onClearEntityAttrs () {
      this.entityAttrsUse = []
      this.refreshEntityTreeTickle = !this.refreshEntityTreeTickle
    },

    // add entity attribute into the microdata list
    onAttrAdd (attrName, entName, isAllowHidden) {
      if (this.entityAttrsUse.length >= this.entityAttrCount) return // all attributes already in microdata list
      if (!attrName || !entName) {
        console.warn('Unable to add microdata, attribute or entity name is empty:', attrName, entName)
        return
      }

      // add into microdata list if entity.attribute not in the list already
      const name = entName + '.' + attrName
      let isAdded = false
      if (this.entityAttrsUse.indexOf(name) < 0) {
        this.entityAttrsUse.push(name)
        isAdded = true
      }

      if (isAdded) {
        this.$q.notify({
          type: 'info',
          message: this.entityAttrsUse.length < this.entityAttrCount ? this.$t('Add to microdata: ') + name : this.$t('All entity attributes included into microdata')
        })
        this.refreshEntityTreeTickle = !this.refreshEntityTreeTickle
      }
    },

    // add all entity attributes into the microdata list
    onEntityAdd (entName, parts, isAllowHidden) {
      if (this.entityAttrsUse.length >= this.entityAttrCount) return // all attributes already in microdata list
      if (!entName) {
        console.warn('Unable to add microdata, entity name is empty:', entName)
        return
      }

      // add each attribute of the entity into microdata if not already in the list
      const ent = Mdf.entityTextByName(this.theModel, entName)
      let isAdded = false

      if (Mdf.isNotEmptyEntityText(ent)) {
        for (const ea of ent.EntityAttrTxt) {
          if (!isAllowHidden && ea.Attr.IsInternal) continue // internal attributes disabled

          const name = entName + '.' + ea.Attr.Name
          if (this.entityAttrsUse.indexOf(name) < 0) {
            this.entityAttrsUse.push(name)
            isAdded = true
          }
        }
      }

      if (isAdded) {
        this.$q.notify({
          type: 'info',
          message: (this.entityAttrsUse.length < this.entityAttrCount) ? this.$t('Add to microdata: ') + entName : this.$t('All entity attributes included into microdata')
        })
        this.refreshEntityTreeTickle = !this.refreshEntityTreeTickle
      }
    },

    // remove entity attribute from microdata list
    onAttrRemove (attrName, entName) {
      if (this.entityAttrsUse.length <= 0) return // microdata list already empty
      if (!attrName || !entName) {
        console.warn('Unable to remove from microdata list, attribute or entity name is empty:', attrName, entName)
        return
      }
      const name = entName + '.' + attrName
      this.$q.notify({ type: 'info', message: this.$t('Exclude from microdata: ') + name })

      this.entityAttrsUse = this.entityAttrsUse.filter(ean => ean !== name)
      this.refreshEntityTreeTickle = !this.refreshEntityTreeTickle
    },

    // remove all attributes of the entity from microdata list
    onEntityRemove (entName) {
      if (this.entityAttrsUse.length <= 0) return // microdata list already empty
      if (!entName) {
        console.warn('Unable to remove entity form microdata, entity name is empty:', entName)
        return
      }
      this.$q.notify({ type: 'info', message: this.$t('Exclude from microdata: ') + entName })

      // remove each entity.attribute from microdata list
      const ent = Mdf.entityTextByName(this.theModel, entName)
      if (Mdf.isNotEmptyEntityText(ent)) {
        for (const ea of ent.EntityAttrTxt) {
          const name = entName + '.' + ea.Attr.Name
          this.entityAttrsUse = this.entityAttrsUse.filter(ean => ean !== name)
        }
      }
      this.refreshEntityTreeTickle = !this.refreshEntityTreeTickle
    },

    // set default name of new model run
    onRunNameFocus (e) {
      if (typeof this.runOpts.runName !== typeof 'string' || (this.runOpts.runName || '') === '') {
        this.runOpts.runName = this.theModel.Model.Name + '_' + (this.isReadonlyWorksetCurrent ? this.worksetCurrent?.Name + '_' : '') + Mdf.dtToUnderscoreTimeStamp(new Date())
      }
    },
    // check if run name entered and cleanup input to be compatible with file name rules
    onRunNameBlur (e) {
      const { isEntered, name } = Mdf.doFileNameClean(this.runOpts.runName)
      if (isEntered && name !== this.runOpts.runName) {
        this.$q.notify({ type: 'warning', message: this.$t('Run name should not contain any of: ') + Mdf.invalidFileNameChars })
      }
      this.runOpts.runName = isEntered ? name : ''
    },
    // cleanup run description input
    onRunDescrBlur (e) {
      for (const lcd in this.runOpts.runDescr) {
        const descr = Mdf.cleanTextInput((this.runOpts.runDescr[lcd] || ''))
        this.runOpts.runDescr[lcd] = descr
      }
    },
    // check if working directory path entered and cleanup input to be compatible with file path rules
    onWorkDirBlur (e) {
      const { isEntered, dir } = this.doDirClean(this.runOpts.workDir)
      this.runOpts.workDir = isEntered ? dir : ''
    },
    // check if csv directory path entered and cleanup input to be compatible with file paths rules
    onCsvDirBlur () {
      const { isEntered, dir } = this.doDirClean(this.runOpts.csvDir)
      this.runOpts.csvDir = isEntered ? dir : ''
    },
    doDirClean (dirValue) {
      return (dirValue || '') ? { isEntered: true, dir: this.cleanPathInput(dirValue) } : { isEntered: false, dir: '' }
    },
    // clean path input: remove special characters "'`$}{@><:|?*&^; and force it to be relative path and use / separator
    cleanPathInput (sValue) {
      if (sValue === '' || sValue === void 0) return ''

      // remove special characters and replace all \ with /
      let s = sValue.replace(/["'`$}{@><:|?*&^;]/g, '').replace(/\\/g, '/').trim()

      // replace repeated // with single / and remove all ..
      let n = s.length
      let nPrev = n
      do {
        nPrev = n
        s = s.replace('//', '/').replace(/\.\./g, '')
        n = s.length
      } while (n > 0 && nPrev !== n)

      // remove leading /
      s = s.replace(/^\//, '')
      return s || ''
    },

    // apply preset to run options
    doPresetSelected (preset) {
      if (!preset || !preset?.opts) {
        this.$q.notify({ type: 'warning', message: this.$t('Invalid run options') })
        console.warn('Invalid run options:', preset)
        return
      }
      // merge preset with run options
      const ps = preset.opts

      this.runOpts.subCount = ps.subCount ?? this.runOpts.subCount
      if (this.runOpts.subCount < 1) {
        this.runOpts.subCount = 1
      }
      this.runOpts.threadCount = ps.threadCount ?? this.runOpts.threadCount
      if (this.runOpts.threadCount < 1) {
        this.runOpts.threadCount = 1
      }
      this.runOpts.progressPercent = ps.progressPercent ?? this.runOpts.progressPercent
      if (this.runOpts.progressPercent < 1) {
        this.runOpts.progressPercent = 1
      }
      this.runOpts.progressStep = ps.progressStep ?? this.runOpts.progressStep
      if (this.runOpts.progressStep < 0) {
        this.runOpts.progressStep = 0
      }
      this.runOpts.workDir = ps.workDir ?? this.runOpts.workDir
      this.runOpts.csvDir = ps.csvDir ?? this.runOpts.csvDir
      this.csvCodeId = ps.csvCodeId ?? this.csvCodeId
      if (this.enableIni) {
        this.runOpts.useIni = ps.useIni ?? this.runOpts.useIni
        if (this.enableIniAnyKey && this.runOpts.useIni) this.runOpts.iniAnyKey = ps.iniAnyKey ?? this.runOpts.iniAnyKey
      }
      this.runOpts.profile = ps.profile ?? this.runOpts.profile
      this.runOpts.sparseOutput = ps.sparseOutput ?? this.runOpts.sparseOutput
      this.runOpts.runTmpl = ps.runTmpl ?? this.runOpts.runTmpl
      this.runOpts.mpiNpCount = ps.mpiNpCount ?? this.runOpts.mpiNpCount
      if (this.runOpts.mpiNpCount < 0) {
        this.runOpts.mpiNpCount = 0
      }
      this.runOpts.mpiOnRoot = ps.mpiOnRoot ?? this.runOpts.mpiOnRoot
      this.runOpts.mpiUseJobs = this.serverConfig.IsJobControl && (ps.mpiUseJobs ?? (this.serverConfig.IsJobControl && this.runOpts.mpiNpCount > 0))
      this.runOpts.mpiTmpl = ps.mpiTmpl ?? this.runOpts.mpiTmpl

      // expand sections if preset options supplied with non-default values
      this.mpiOptsExpanded = (ps.mpiNpCount || 0) !== 0 || (ps.mpiTmpl || '') !== ''

      this.advOptsExpanded = (ps.threadCount || 0) > 1 ||
        (ps.workDir || '') !== '' ||
        (ps.csvDir || '') !== '' ||
        (ps.csvCodeId || 'enumCode') !== 'enumCode' ||
        !!ps.useIni ||
        !!ps.iniAnyKey ||
        (ps.profile || '') !== '' ||
        !!ps.sparseOutput ||
        (ps.runTmpl || '') !== ''

      this.$q.notify({
        type: 'info',
        message: preset?.descr || preset?.label || (this.$t('Using Run Options: ') + preset?.name || '')
      })
    },

    // if previous run request resubmitted then apply settings from run request
    applyRunRequest (rReq) {
      if (!Mdf.isNotEmptyRunRequest(rReq)) {
        console.warn('Invalid (empty) run request', rReq)
        return
      }

      // merge preset with run options
      this.runOpts.runName = Mdf.getRunOption(rReq.Opts, 'OpenM.RunName') || this.runOpts.runName
      this.runOpts.worksetName = Mdf.getRunOption(rReq.Opts, 'OpenM.SetName') || this.runOpts.worksetName
      this.runOpts.baseRunDigest = Mdf.getRunOption(rReq.Opts, 'OpenM.BaseRunDigest') || this.runOpts.baseRunDigest

      this.runOpts.subCount = Mdf.getIntRunOption(rReq.Opts, 'OpenM.SubValues', 0) || this.runOpts.subCount
      if (this.runOpts.subCount < 1) {
        this.runOpts.subCount = 1
      }
      this.runOpts.threadCount = rReq.Threads ?? this.runOpts.threadCount
      if (this.runOpts.threadCount < 1) {
        this.runOpts.threadCount = 1
      }
      this.runOpts.progressPercent = Mdf.getIntRunOption(rReq.Opts, 'OpenM.ProgressPercent', 0) || this.runOpts.progressPercent
      if (this.runOpts.progressPercent < 1) {
        this.runOpts.progressPercent = 1
      }
      this.runOpts.progressStep = Mdf.getIntRunOption(rReq.Opts, 'OpenM.ProgressStep', 0) || this.runOpts.progressStep
      if (this.runOpts.progressStep < 0) {
        this.runOpts.progressStep = 0
      }

      this.runOpts.workDir = rReq.Dir ?? this.runOpts.workDir
      this.runOpts.csvDir = Mdf.getRunOption(rReq.Opts, 'OpenM.ParamDir') || this.runOpts.csvDir
      this.runOpts.csvId = Mdf.getBoolRunOption(rReq.Opts, 'OpenM.IdCsv')
      if (this.runOpts.csvId) {
        this.csvCodeId = 'enumId'
      }

      if (this.enableIni) {
        this.runOpts.iniName = Mdf.getRunOption(rReq.Opts, 'OpenM.IniFile')
        this.runOpts.useIni = this.runOpts.iniName !== ''
        if (this.enableIniAnyKey && this.runOpts.useIni) {
          this.runOpts.iniAnyKey = Mdf.getBoolRunOption(rReq.Opts, 'OpenM.IniAnyKey') || this.runOpts.iniAnyKey
        }
      }

      this.runOpts.profile = Mdf.getRunOption(rReq.Opts, 'OpenM.Profile') || this.runOpts.profile
      this.runOpts.sparseOutput = Mdf.getBoolRunOption(rReq.Opts, 'OpenM.SparseOutput') || this.runOpts.sparseOutput

      if (!rReq?.IsMpi && (rReq?.Mpi?.Np || 0) <= 0) {
        this.runOpts.mpiNpCount = 0
        this.runOpts.runTmpl = rReq.Template ?? this.runOpts.runTmpl
      } else {
        this.runOpts.mpiNpCount = rReq.Mpi.Np ?? this.runOpts.mpiNpCount
        if (this.runOpts.mpiNpCount <= 0) {
          this.runOpts.mpiNpCount = 1
        }
        this.runOpts.mpiUseJobs = this.serverConfig.IsJobControl && (!rReq.Mpi.IsNotByJob ?? this.serverConfig.IsJobControl)
        this.runOpts.mpiOnRoot = !rReq.Mpi.IsNotOnRoot ?? this.runOpts.mpiOnRoot
        this.runOpts.mpiTmpl = rReq.Template ?? this.runOpts.mpiTmpl
      }

      // expand tables retained groups into leafs
      if (rReq.Tables.length > 0) {
        this.tablesRetain = [] // clear existing tables retain

        for (const name of rReq.Tables) {
          if (!name) continue

          // if this is not a group then add table name
          if (!Mdf.isGroupName(this.theModel, name)) {
            if (this.tablesRetain.indexOf(name) < 0) this.tablesRetain.push(name)
          } else {
            // expand group into leafs retained
            const gt = this.groupTableLeafs[name]
            if (gt) {
              for (const tn in gt?.leafs) {
                if (this.tablesRetain.indexOf(tn) < 0) {
                  this.tablesRetain.push(tn)
                }
              }
            }
          }
        }
      }

      // restore microdata run options
      if (this.isMicrodata && rReq?.Microdata) {
        // clear existing microdata state
        this.entityAttrsUse = []
        this.microOpts = Mdf.emptyRunRequestMicrodata()

        if (Array.isArray(rReq.Microdata?.Entity)) {
          for (const e of rReq.Microdata?.Entity) {
            if (e?.Name && Array.isArray(e?.Attr)) {
              for (const a of e.Attr) {
                this.entityAttrsUse.push(e.Name + '.' + a)
              }
            }
          }
        }
      }

      // use existing run description and notes
      for (let k = 0; k < this.txtNewRun.length; k++) {
        const descr = Mdf.getRunOption(rReq.Opts, this.txtNewRun[k].LangCode + '.RunDescription')
        if (descr !== '') this.txtNewRun[k].Descr = descr

        for (let j = 0; j < rReq.RunNotes.length; j++) {
          if ((rReq.RunNotes[j]?.LangCode || '') === this.txtNewRun[k].LangCode) {
            const note = (rReq.RunNotes[j]?.Note || '')
            if (note !== '') this.txtNewRun[k].Note = note
          }
        }
      }

      // expand sections if run options supplied with non-default values
      this.mpiOptsExpanded = (this.runOpts.mpiNpCount || 0) !== 0 || !!rReq.IsMpi

      this.advOptsExpanded = (rReq.Threads || 0) > 1 ||
        (rReq.Dir || '') !== '' ||
        (this.runOpts.csvDir || '') !== '' ||
        (this.csvCodeId || 'enumCode') !== 'enumCode' ||
        !!this.runOpts.useIni ||
        !!this.runOpts.iniAnyKey ||
        (this.runOpts.profile || '') !== '' ||
        !!this.runOpts.sparseOutput ||
        (this.runOpts.runTmpl || '') !== ''

      for (let k = 0; !this.langOptsExpanded && k < this.txtNewRun.length; k++) {
        this.langOptsExpanded = this.txtNewRun[k].Descr !== '' || this.txtNewRun[k].Note !== ''
      }
    },

    // on model run click: if workset partial and no base run and no csv directory then do not run the model
    onModelRunClick () {
      const dgst = (this.useBaseRun && this.isCompletedRunCurrent) ? this.runCurrent?.RunDigest || '' : ''
      const wsName = (this.useWorkset && this.isReadonlyWorksetCurrent) ? this.worksetCurrent?.Name || '' : ''

      if (!dgst && !this.runOpts.csvDir) {
        if (!wsName) {
          this.$q.notify({ type: 'warning', message: this.$t('Please use input scenario or base model run or CSV files to specifiy input parameters') })
          return
        }
        if (wsName && this.isPartialWorkset()) {
          this.$q.notify({ type: 'warning', message: this.$t('Input scenario should include all parameters otherwise model run may fail: ') + wsName })
          return
        }
      }
      // else do run the model
      this.doModelRun()
    },

    // run the model
    doModelRun () {
      // set new run options
      this.runOpts.runName = Mdf.cleanFileNameInput(this.runOpts.runName)
      this.runOpts.subCount = Mdf.cleanIntNonNegativeInput(this.runOpts.subCount, 1)
      this.runOpts.threadCount = Mdf.cleanIntNonNegativeInput(this.runOpts.threadCount, 1)
      this.runOpts.workDir = this.cleanPathInput(this.runOpts.workDir)
      this.runOpts.csvDir = this.cleanPathInput(this.runOpts.csvDir)
      this.runOpts.csvId = (this.csvCodeId || '') !== 'enumCode'
      this.runOpts.useIni = (this.enableIni && this.runOpts.useIni) || false
      this.runOpts.iniAnyKey = (this.enableIniAnyKey && this.runOpts.useIni && this.runOpts.iniAnyKey) || false
      this.runOpts.profile = Mdf.cleanTextInput(this.runOpts.profile)
      this.runOpts.sparseOutput = this.runOpts.sparseOutput || false
      this.runOpts.runTmpl = Mdf.cleanTextInput(this.runOpts.runTmpl)
      this.runOpts.mpiNpCount = Mdf.cleanIntNonNegativeInput(this.runOpts.mpiNpCount, 0)
      this.runOpts.mpiUseJobs = this.serverConfig.IsJobControl && (this.runOpts.mpiUseJobs || false)
      this.runOpts.mpiOnRoot = this.runOpts.mpiOnRoot || false
      this.runOpts.mpiTmpl = Mdf.cleanTextInput(this.runOpts.mpiTmpl)
      this.runOpts.progressPercent = Mdf.cleanIntNonNegativeInput(this.runOpts.progressPercent, 1)

      this.runOpts.progressStep = Mdf.cleanFloatInput(this.runOpts.progressStep, 0.0)
      if (this.runOpts.progressStep < 0) this.runOpts.progressStep = 0.0

      this.runOpts.worksetName = (this.useWorkset && this.isReadonlyWorksetCurrent) ? this.worksetCurrent?.Name || '' : ''
      this.runOpts.baseRunDigest = (this.useBaseRun && this.isCompletedRunCurrent) ? this.runCurrent?.RunDigest || '' : ''

      // reduce tables retain list by using table groups
      this.retainTablesGroups = [] // retain all tables

      if (this.tablesRetain.length > 0 && this.tablesRetain.length < this.tableCount) {
        let tLst = Array.from(this.tablesRetain)

        // make output tables groups list sorted by group size
        const gLst = []
        for (const gName in this.groupTableLeafs) {
          gLst.push({
            name: gName,
            size: this.groupTableLeafs[gName].size
          })
        }
        gLst.sort((left, right) => { return left.size - right.size })

        // replace table names with group name
        let isAny = false
        do {
          isAny = false

          for (const gs of gLst) {
            const gt = this.groupTableLeafs[gs.name]

            let isAll = true
            for (const tn in gt?.leafs) {
              isAll = tLst.indexOf(tn) >= 0
              if (!isAll) break
            }
            if (!isAll) continue

            tLst = tLst.filter(tn => !gt?.leafs[tn])
            tLst.push(gs.name)
            isAny = true
          }
        } while (isAny)

        this.retainTablesGroups = tLst
      }

      // create microdata entity attributes array
      if (this.isMicrodata && this.entityAttrsUse.length > 0) {
        const mdLst = []

        for (const eau of this.entityAttrsUse) {
          const n = eau.indexOf('.')
          if (n <= 0 || n >= eau.length - 1) continue // skip: expected entity.attribute

          const eName = eau.substring(0, n)
          const aName = eau.substring(n + 1)

          // check if entity attribute exist and if it is an internal attribute
          const a = Mdf.entityAttrTextByName(this.theModel, eName, aName)

          if (a.Attr.Name !== aName) continue // entity attribute not found
          if (a.Attr.IsInternal) this.microOpts.IsInternal = true // allow use of internal attributes

          let isFound = false
          for (const md of mdLst) {
            if (md.Name !== eName) continue
            isFound = true
            md.Attr.push(aName) // entity already found, append another attribute
            break
          }
          if (!isFound) { // entity not found, add new entity and attribute to the list
            mdLst.push({
              Name: eName,
              Attr: []
            })
            mdLst[mdLst.length - 1].Attr.push(aName)
          }
        }

        this.microOpts.IsToDb = mdLst.length > 0
        this.microOpts.Entity = mdLst
      }

      // collect description and notes for each language
      this.newRunNotes = {}
      for (const t of this.txtNewRun) {
        const refKey = 'new-run-note-editor-' + t.LangCode
        if (!Mdf.isLength(this.$refs[refKey]) || !this.$refs[refKey][0]) continue

        const udn = this.$refs[refKey][0].getDescrNote()
        if ((udn.descr || udn.note || '') !== '') {
          this.runOpts.runDescr[t.LangCode] = udn.descr
          this.newRunNotes[t.LangCode] = udn.note
        }
      }

      // start new model run: send request to the server
      this.isInitRun = true
      this.loadWait = true
    },

    // new model run started: response from server
    doneNewRunInit (ok, runStamp, submitStamp) {
      this.isInitRun = false
      this.loadWait = false

      if (!ok || !submitStamp) {
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or model run failed to start') })
        return
      }

      // model wait in the queue
      if (!runStamp) {
        this.$q.notify({ type: 'info', message: this.$t('Model run wait in the queue: ' + Mdf.fromUnderscoreTimeStamp(submitStamp)) })

        if (this.serverConfig.IsJobControl) {
          this.$emit('run-job-select', submitStamp) // show service state and job control page
        } else {
          this.$emit('run-log-select', submitStamp) // no job control: show run log page
        }
      } else {
        // else: model started
        this.$q.notify({ type: 'info', message: this.$t('Model run started: ' + Mdf.fromUnderscoreTimeStamp(runStamp)) })
        this.$emit('run-list-refresh')
        this.$emit('run-log-select', runStamp)
      }
    },

    // receive server configuration, including configuration of model catalog and run catalog
    async doConfigRefresh () {
      this.loadConfig = true

      const u = this.omsUrl + '/api/service/config'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchServerConfig(response.data) // update server config in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or configuration retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or configuration retrieve failed.') })
      }
      this.loadConfig = false
    },

    // receive disk space usage from server
    async doGetDiskUse () {
      this.loadDiskUse = true
      let isOk = false

      const u = this.omsUrl + '/api/service/disk-use'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchDiskUse(response.data) // update disk space usage in store
        isOk = Mdf.isDiskUseState(response.data) // validate disk usage info
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or disk usage retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or disk space usage retrieve failed.') })
      }
      this.loadDiskUse = false

      // update disk space usage to notify user
      if (isOk) {
        this.isDiskOver = this.diskUseState?.DiskUse?.IsOver
      } else {
        this.isDiskOver = true
        console.warn('Disk usage retrieve failed:', this.nDdiskUseErr)
        this.$q.notify({ type: 'negative', message: this.$t('Disk space usage retrieve failed') })
      }
    },

    // receive profile list by model digest
    async doProfileListRefresh () {
      let isOk = false
      this.loadWait = true

      const u = this.omsUrl + '/api/model/' + encodeURIComponent(this.digest) + '/profile-list'
      try {
        const response = await this.$axios.get(u)

        // expected string array of profile names
        // append empty '' string first to make default selection === "no profile"
        this.profileLst = []
        if (Mdf.isLength(response.data)) {
          this.profileLst.push('')
          for (const p of response.data) {
            this.profileLst.push(p)
          }
        }
        isOk = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or profile list retrieve failed.', em)
      }
      if (!isOk) {
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or profile list retrieve failed: ') + this.digest })
      }
      this.loadWait = false
    },

    ...mapActions('serverState', {
      dispatchServerConfig: 'serverConfig',
      dispatchDiskUse: 'diskUse'
    })
  },

  mounted () {
    this.doRefresh()
    this.$emit('tab-mounted', 'new-run', { digest: this.digest })
  }
}
