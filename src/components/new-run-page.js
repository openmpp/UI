import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import NewRunInit from './NewRunInit'
import RunLogPage from './RunLogPage'
import OmMcwButton from '@/om-mcw/OmMcwButton'
import OmMcwSnackbar from '@/om-mcw/OmMcwSnackbar'

export default {
  components: { NewRunInit, RunLogPage, OmMcwButton, OmMcwSnackbar },

  props: {
    digest: { type: String, default: '' },
    nameOrDigest: { type: String, default: '' } // workset name
  },

  data () {
    return {
      modelName: '',
      isRunOptsShow: true,
      isRunOptsAdvShow: false,
      isRunOptsMpiShow: false,
      isInitRun: false,
      runStamp: '', // new run stamp from server
      mpiDefaultTemplate: '',
      mpiTemplateLst: [],
      profileLst: [],
      // run options
      workDirValue: '',
      isWorkDirEntered: false,
      csvDirValue: '',
      isCsvDirEntered: false,
      csvIdValue: 'false',
      profileValue: '',
      logVersionValue: 'true',
      sparseOutputValue: 'false',
      mpiOnRootValue: 'false',
      mpiTmplValue: '',
      runOpts: {
        runName: '',
        runDescr: '',
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
    // if true then selected workset edit mode else readonly and model run enabled
    isWsEdit () {
      const ws = this.worksetTextByName(this.nameOrDigest)
      return Mdf.isNotEmptyWorksetText(ws) && !ws.IsReadonly
    },

    // is profile list empty
    isEmptyProfileList () { return !Mdf.isLength(this.profileLst) },

    ...mapGetters({
      serverConfig: GET.CONFIG,
      theModel: GET.THE_MODEL,
      modelLang: GET.MODEL_LANG,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  methods: {
    // initialize current page view
    initView () {
      this.modelName = Mdf.modelName(this.theModel)
      this.isInitRun = false
      this.runStamp = ''

      this.runOpts.runName = this.autoNewRunName()
      this.runOpts.csvId = this.csvIdValue === 'true'
      this.runOpts.logVersion = this.logVersionValue === 'true'
      this.runOpts.sparseOutput = this.sparseOutputValue === 'true'
      this.runOpts.mpiNotOnRoot = this.mpiOnRootValue === 'false'

      // get template list and select default template
      this.mpiDefaultTemplate = this.serverConfig.RunCatalog.DefaultMpiTemplate
      this.mpiTemplateLst = this.serverConfig.RunCatalog.MpiTemplates

      if (this.mpiDefaultTemplate && Mdf.isLength(this.mpiTemplateLst)) {
        let isFound = false
        for (let k = 0; !isFound && k < this.mpiTemplateLst.length; k++) {
          isFound = this.mpiTemplateLst[k] === this.mpiDefaultTemplate
        }
        this.mpiTmplValue = isFound ? this.mpiDefaultTemplate : this.mpiTemplateLst[0]
      }

      // get profile list from server
      this.doProfileListRefresh()
    },

    // return run status text by run status code
    statusOfTheRun (rp) { return Mdf.statusText(rp) },

    // run the model
    onModelRun () {
      // set new run options
      this.runOpts.runName = this.parseFileNameInput(this.$refs.runNameInput.value) || this.autoNewRunName()
      this.runOpts.runDescr = this.parseTextInput(this.$refs.runDescrInput.value)
      this.runOpts.subCount = this.parseIntNonNegativeInput(this.$refs.subCountInput.value, 1)
      this.runOpts.threadCount = this.parseIntNonNegativeInput(this.$refs.threadCountInput.value, 1)
      this.runOpts.csvDir = this.parsePathInput(this.csvDirValue)
      this.runOpts.csvId = this.csvIdValue === 'true'
      this.runOpts.logVersion = this.logVersionValue === 'true'
      this.runOpts.sparseOutput = this.sparseOutputValue === 'true'
      this.runOpts.profile = this.parseTextInput(this.profileValue)
      this.runOpts.mpiNpCount = this.parseIntNonNegativeInput(this.$refs.mpiNpCountInput.value, 0)
      this.runOpts.mpiNotOnRoot = this.mpiOnRootValue === 'false'
      this.runOpts.workDir = this.parsePathInput(this.workDirValue)
      this.runOpts.mpiTmpl = this.parseTextInput(this.mpiTmplValue)
      this.runOpts.progressPercent = this.parseIntNonNegativeInput(this.$refs.progressPercentInput.value, 1)
      this.runOpts.progressStep = this.parseFloatInput(this.$refs.progressStepInput.value, 0.0)
      if (this.runOpts.progressStep < 0) this.runOpts.progressStep = 0.0

      // start new model run: send request to the server
      this.isInitRun = true
      this.runStamp = ''
      this.isRunOptsShow = false
    },
    // check MPI process number is valid
    onMpiNpInputBlur () {
      this.runOpts.mpiNpCount = this.parseIntNonNegativeInput(this.$refs.mpiNpCountInput.value, 0)
      if ((this.runOpts.mpiNpCount || 0) < 0) this.runOpts.mpiNpCount = 0
    },
    // check if run name entered and cleanup input to be compatible with file name rules
    onRunNameInputBlur () {
      let { isEntered, name } = this.doFileNameInputBlur(this.runOpts.runName)
      this.runOpts.runName = isEntered ? name : this.autoNewRunName()
    },
    // cleanup run description input
    onRunDescrInputBlur () {
      this.runOpts.runDescr = this.parseTextInput(this.runOpts.runDescr)
    },
    // check if csv directory path entered and cleanup input to be compatible with file paths rules
    onCsvDirInputBlur () {
      let { isEntered, dir } = this.doDirInputBlur(this.csvDirValue)
      this.isCsvDirEntered = isEntered
      this.runOpts.csvDir = dir
      this.csvDirValue = dir
    },
    // check if working directory path entered and cleanup input to be compatible with file path rules
    onWorkDirInputBlur () {
      let { isEntered, dir } = this.doDirInputBlur(this.workDirValue)
      this.isWorkDirEntered = isEntered
      this.runOpts.workDir = dir
      this.workDirValue = dir
    },
    doDirInputBlur (dirValue) {
      return (dirValue || '') ? { isEntered: true, dir: this.parsePathInput(dirValue) } : { isEntered: false, dir: '' }
    },
    doFileNameInputBlur (fnValue) {
      return (fnValue || '') ? { isEntered: true, name: this.parseFileNameInput(fnValue) } : { isEntered: false, name: '' }
    },
    // parse integer non-negative input, ignore + or - sign
    parseIntNonNegativeInput (sValue, nDefault = 0) {
      let sub = sValue.replace(/[^0-9]/g, ' ').trim()
      return (((sub || '') !== '') ? parseInt(sub) : nDefault) || nDefault
    },
    // parse float number input
    parseFloatInput (sValue, fDefault = 0.0) {
      if (sValue === '' || sValue === void 0) return fDefault
      const f = parseFloat(sValue)
      return !isNaN(f) ? f : fDefault
    },
    // parse string input: replace special characters "'`$}{@\ with space and trim
    parseTextInput (sValue) {
      let s = sValue.replace(/["'`$}{@\\]/g, '\xa0').trim()
      return s || ''
    },
    // parse file name input: replace special characters "'`$}{@><:|?*&^;/\ with underscore _ and trim
    parseFileNameInput (sValue) {
      let s = sValue.replace(/["'`$}{@><:|?*&^;/\\]/g, '_').trim()
      return s || ''
    },
    // parse path input: remove special characters "'`$}{@><:|?*&^; and force it to be relative path and use / separator
    parsePathInput (sValue) {
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

    // make default new model run name
    autoNewRunName () {
      return this.modelName + '_' + this.nameOrDigest + '_' + Mdf.dtToUnderscoreTimeStamp(new Date())
    },

    // new model run started: response from server
    doneNewRunInit (ok, rst) {
      this.isInitRun = false
      if (ok) {
        this.runStamp = rst.RunStamp || ''
      } else {
        this.$emit('run-list-refresh')
      }
      this.runOpts.runName = this.autoNewRunName() // new run name for next run
    },
    // pass event from child component to grand parent
    onRunListRefresh () { this.$emit('run-list-refresh') },

    // show message, ex: "invalid profile list"
    doShowSnackbarMessage (msg) {
      if (msg) this.$refs.newRunPageSnackbarMsg.doOpen({ labelText: msg })
    },

    // receive profile list by model digest
    async doProfileListRefresh () {
      let isOk = false

      let u = this.omppServerUrl + '/api/model/' + this.digest + '/profile-list'
      try {
        const response = await axios.get(u)

        // expected string array of profile names
        // append empty '' string first to make default selection == "no profile"
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
        console.log('Server offline or profile list retrive failed.', em)
      }

      if (!isOk) this.doShowSnackbarMessage('Unable to retrive profile list')
    }
  },

  mounted () {
    this.initView()
    this.$emit('tab-mounted',
      'new-run-model',
      { digest: this.digest, runOrSet: 'set', runSetKey: this.nameOrDigest })
  }
}
