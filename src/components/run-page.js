import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import NewRunInit from './NewRunInit'
import RunLogRefresh from './RunLogRefresh'
import RunProgressRefresh from './RunProgressRefresh'
import OmMcwButton from '@/om-mcw/OmMcwButton'

/* eslint-disable no-multi-spaces */
const EMPTY_RUN_STEP = 0      // empty state of new model: undefined
const INIT_RUN_STEP = 1       // initiate new model run: submit request to the server
const PROC_RUN_STEP = 2       // model run in progress
const FINAL_RUN_STEP = 16     // final state of model run: completed or failed
/* eslint-enable no-multi-spaces */

const RUN_PROGRESS_REFRESH_TIME = 1000 // msec, run progress refresh time
const RUN_PROGRESS_SUB_RATIO = 4 // multipler for refresh time to get sub values progress

export default {
  components: { NewRunInit, RunLogRefresh, RunProgressRefresh, OmMcwButton },

  props: {
    digest: { type: String, default: '' },
    nameDigest: { type: String, default: '' }
  },

  data () {
    return {
      modelName: '',
      isRunOptsShow: true,
      isRunOptsAdvShow: false,
      isRunOptsMpiShow: false,
      isRefreshPaused: false,
      isRefresh: false,
      isProgressRefresh: false,
      refreshInt: '',
      refreshCount: 0,
      isInitRunFailed: false,
      mpiDefaultTemplate: '',
      mpiTemplateLst: [],
      // current run (new model run)
      newRun: {
        step: EMPTY_RUN_STEP, // model run step: initial, start new, view progress
        state: Mdf.emptyRunState(),
        progress: [],
        logStart: 0,
        logLines: []
      },
      // run options
      workDirValue: '',
      isWorkDirEntered: false,
      csvDirValue: '',
      isCsvDirEntered: false,
      csvIdValue: 'false',
      logVersionValue: 'true',
      sparseOutputValue: 'false',
      mpiOnRootValue: 'false',
      mpiTmplValue: '',
      runOpts: {
        runName: '',
        subCount: 1,
        threadCount: 1,
        progressPercent: 1,
        progressStep: 0,
        logVersion: true,
        workDir: '',
        csvDir: '',
        csvId: false,
        profile: '',
        sparseOutput: false,
        mpiNpCount: 0,
        mpiNotOnRoot: true,
        mpiTmpl: ''
      }
    }
  },

  computed: {
    // make new model run name
    autoNewRunName () {
      return (this.modelName || '') + '_' + (this.nameDigest || '')
    },

    // if true then selected workset edit mode else readonly and model run enabled
    isWsEdit () {
      const ws = this.worksetTextByName(this.nameDigest)
      return Mdf.isNotEmptyWorksetText(ws) && !ws.IsReadonly
    },

    // model new run step: empty, initialize, in progress, final
    isEmptyRunStep () { return this.newRun.step === EMPTY_RUN_STEP },
    isInitRunStep () { return this.newRun.step === INIT_RUN_STEP },
    isProcRunStep () { return this.newRun.step === PROC_RUN_STEP },
    isFinalRunStep () { return this.newRun.step === FINAL_RUN_STEP },

    ...mapGetters({
      serverConfig: GET.CONFIG,
      theModel: GET.THE_MODEL,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME
    })
  },

  methods: {
    // initialize current page view
    initView () {
      this.modelName = Mdf.modelName(this.theModel)
      this.newRun.step = EMPTY_RUN_STEP
      this.newRun.state = Mdf.emptyRunState()
      this.newRun.progress = []
      this.newRun.logStart = 0
      this.newRun.logLines = []
      this.isInitRunFailed = false

      this.runOpts.runName = this.autoNewRunName
      this.runOpts.csvId = this.csvIdValue === 'true'
      this.runOpts.logVersion = this.logVersionValue === 'true'
      this.runOpts.sparseOutput = this.sparseOutputValue === 'true'
      this.runOpts.mpiNotOnRoot = this.mpiOnRootValue === 'false'

      this.resetRefreshProgress()

      // get template list and select default template
      this.mpiDefaultTemplate = this.serverConfig.RunCatalogState.DefaultMpiTemplate
      this.mpiTemplateLst = this.serverConfig.RunCatalogState.MpiTemplates

      if (this.mpiDefaultTemplate && Mdf.isLength(this.mpiTemplateLst)) {
        let isFound = false
        for (let k = 0; !isFound && k < this.mpiTemplateLst.length; k++) {
          isFound = this.mpiTemplateLst[k] === this.mpiDefaultTemplate
        }
        this.mpiTmplValue = isFound ? this.mpiDefaultTemplate : this.mpiTemplateLst[0]
      }
    },
    resetRefreshProgress () {
      this.refreshCount = 0
      clearInterval(this.refreshInt)
    },

    // refersh model run progress
    refreshRunProgress () {
      if (this.isRefreshPaused) return
      this.isRefresh = !this.isRefresh
      this.refreshCount++
      if (this.refreshCount < RUN_PROGRESS_SUB_RATIO || (this.refreshCount % RUN_PROGRESS_SUB_RATIO) === 1) {
        this.isProgressRefresh = !this.isProgressRefresh
      }
    },
    // pause on/off run progress refresh
    runRefreshPauseToggle () {
      this.isRefreshPaused = !this.isRefreshPaused
    },

    // return run status text by run status code
    statusOfTheRun (rp) { return Mdf.statusText(rp) },

    // run the model
    onModelRun () {
      // set new run options
      this.runOpts.runName = this.parseTextInput(this.$refs.runNameInput.value) || this.autoNewRunName
      this.runOpts.subCount = this.parseIntInput(this.$refs.subCountInput.value, 1)
      this.runOpts.threadCount = this.parseIntInput(this.$refs.threadCountInput.value, 1)
      this.runOpts.csvDir = this.parsePathInput(this.csvDirValue)
      this.runOpts.csvId = this.csvIdValue === 'true'
      this.runOpts.logVersion = this.logVersionValue === 'true'
      this.runOpts.sparseOutput = this.sparseOutputValue === 'true'
      this.runOpts.profile = this.parseTextInput(this.$refs.profileNameInput.value)
      this.runOpts.mpiNpCount = this.parseIntInput(this.$refs.mpiNpCountInput.value, 0)
      this.runOpts.mpiNotOnRoot = this.mpiOnRootValue === 'false'
      this.runOpts.workDir = this.parsePathInput(this.workDirValue)
      this.runOpts.mpiTmpl = this.parseTextInput(this.mpiTmplValue)
      this.runOpts.progressPercent = this.parseIntInput(this.$refs.progressPercentInput.value, 1)
      this.runOpts.progressStep = this.parseFloatInput(this.$refs.progressStepInput.value, 0.0)
      if (this.runOpts.progressStep < 0) this.runOpts.progressStep = 0.0

      // start new model run: send request to the server
      this.newRun.state = Mdf.emptyRunState()
      this.newRun.progress = []
      this.newRun.step = INIT_RUN_STEP
    },
    // check MPI process number is valid
    onMpiNpInputBlur () {
      this.runOpts.mpiNpCount = this.parseIntInput(this.$refs.mpiNpCountInput.value, 0)
      if ((this.runOpts.mpiNpCount || 0) < 0) this.runOpts.mpiNpCount = 0
    },
    // check if csv directory path entered
    onCsvDirInputBlur () {
      let { isEntered, dir } = this.doDirInputBlur(this.csvDirValue)
      this.isCsvDirEntered = isEntered
      this.runOpts.csvDir = dir
      this.csvDirValue = dir
    },
    // check if working directory path entered
    onWorkDirInputBlur () {
      let { isEntered, dir } = this.doDirInputBlur(this.workDirValue)
      this.isWorkDirEntered = isEntered
      this.runOpts.workDir = dir
      this.workDirValue = dir
    },
    doDirInputBlur (dirValue) {
      return (dirValue || '') ? { isEntered: true, dir: this.parsePathInput(dirValue) } : { isEntered: false, dir: '' }
    },
    // parse integer number input
    parseIntInput (sValue, nDefault = 0) {
      let sub = sValue.replace(/[^0-9]/g, ' ').trim()
      return (((sub || '') !== '') ? parseInt(sub) : nDefault) || nDefault
    },
    // parse float number input
    parseFloatInput (sValue, fDefault = 0.0) {
      if (sValue === '' || sValue === void 0) return fDefault
      const f = parseFloat(sValue)
      return !isNaN(f) ? f : fDefault
    },
    // parse string input: remove special characters and trim
    parseTextInput (sValue) {
      let s = sValue.replace(/["'`$}{@\\]/g, ' ').trim()
      return s || ''
    },
    // parse path input: force it to be relative path and use / separator
    parsePathInput (sValue) {
      // remove special characters and replace all \ with /
      let s = sValue.replace(/["'`$}{@><:|?*]/g, '').replace(/\\/g, '/').trim()

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

    // new model run started: response from server
    doneNewRunInit (ok, rst) {
      this.isInitRunFailed = !ok
      this.newRun.step = ok ? PROC_RUN_STEP : FINAL_RUN_STEP
      if (!!ok && Mdf.isNotEmptyRunState(rst)) {
        this.newRun.state = rst
        this.newRun.runName = rst.RunName
        this.refreshInt = setInterval(this.refreshRunProgress, RUN_PROGRESS_REFRESH_TIME)
      }
      if (!ok) this.$emit('run-list-refresh')
    },

    // model current run log progress: response from server
    doneRunLogRefresh (ok, rlp) {
      if (!ok || !Mdf.isNotEmptyRunStateLog(rlp)) return // empty run state or error

      this.newRun.state = Mdf.toRunStateFromLog(rlp)

      // update log lines
      let nLen = Mdf.lengthOf(rlp.Lines)
      if (nLen > 0) {
        for (let k = 0; k < nLen; k++) {
          this.newRun.logLines.push({
            key: this.digest + '-' + this.newRun.state.RunStamp + '-' + rlp.Offset + k,
            text: rlp.Lines[k]
          })
        }
      }

      // check is it final update: model run completed
      let isDone = (this.newRun.state.IsFinal && rlp.Offset + rlp.Size >= rlp.TotalSize)
      if (!isDone) {
        this.newRun.logStart = rlp.Offset + rlp.Size
      } else {
        this.resetRefreshProgress()
        this.isProgressRefresh = !this.isProgressRefresh // last refersh of run progress
        this.newRun.step = FINAL_RUN_STEP
        this.$emit('run-list-refresh')
      }
    },

    // model run status progress: response from server
    doneRunProgressRefresh (ok, rpl) {
      if (ok && Mdf.isLength(rpl)) this.newRun.progress = rpl
    }

  },

  mounted () {
    this.initView()
    this.$emit('tab-mounted',
      'run-model',
      { digest: this.digest, runOrSet: 'set', runSetKey: this.nameDigest })
  },
  beforeDestroy () {
    this.resetRefreshProgress()
  }
}
