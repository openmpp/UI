<!-- initiate (start) new model run: send request to the server -->
<script>
import { mapState } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'NewRunInit',

  props: {
    modelDigest: { type: String, default: '' },
    runOpts: {
      type: Object,
      default: () => ({
        runName: '',
        worksetName: '',
        baseRunDigest: '',
        runDescr: {}, // run description[language code]
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
        runTmpl: '',
        mpiNpCount: 0,
        mpiOnRoot: false,
        mpiTmpl: ''
      })
    }
  },

  render () { return {} },

  data () {
    return {
      loadDone: false,
      loadWait: false
    }
  },

  computed: {
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    // refresh handlers
  },

  methods: {
    // initiate new model run: send request to the server
    async doNewRunInit () {
      if (!this.modelDigest) {
        this.$emit('done', false, '')
        console.warn('Unable to run the model: model digest is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to run the model: model digest is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      this.$emit('wait')

      // set run options
      const rv = {
        ModelDigest: (this.modelDigest || ''),
        Dir: '',
        Opts: { },
        Mpi: {
          Np: 0
        },
        Template: ''
      }
      if ((this.runOpts.runName || '') !== '') rv.Opts['OpenM.RunName'] = this.runOpts.runName
      if ((this.runOpts.worksetName || '') !== '') rv.Opts['OpenM.SetName'] = this.runOpts.worksetName
      if ((this.runOpts.baseRunDigest || '') !== '') rv.Opts['OpenM.BaseRunDigest'] = this.runOpts.baseRunDigest
      if ((this.runOpts.subCount || 1) !== 1) rv.Opts['OpenM.SubValues'] = this.runOpts.subCount.toString()
      if ((this.runOpts.threadCount || 1) !== 1) rv.Opts['OpenM.Threads'] = this.runOpts.threadCount.toString()
      if ((this.runOpts.workDir || '') !== '') rv.Dir = this.runOpts.workDir
      if ((this.runOpts.progressPercent || 1) !== 1) rv.Opts['OpenM.ProgressPercent'] = this.runOpts.progressPercent.toString()
      if (this.runOpts.progressStep) rv.Opts['OpenM.ProgressStep'] = this.runOpts.progressStep.toString()
      if (this.runOpts.logVersion) rv.Opts['OpenM.Version'] = 'true'
      if ((this.runOpts.csvDir || '') !== '') rv.Opts['OpenM.ParamDir'] = this.runOpts.csvDir
      if (this.runOpts.csvId) rv.Opts['OpenM.IdCsv'] = 'true'
      if ((this.runOpts.profile || '') !== '') rv.Opts['OpenM.Profile'] = this.runOpts.profile
      if (this.runOpts.sparseOutput) rv.Opts['OpenM.SparseOutput'] = 'true'
      if (this.uiLang) rv.Opts['OpenM.MessageLanguage'] = this.uiLang

      const isMpi = (this.runOpts.mpiNpCount || 0) > 0
      if (!isMpi) {
        if (this.runOpts.runTmpl) rv.Template = this.runOpts.runTmpl
      } else {
        rv.Mpi.Np = this.runOpts.mpiNpCount
        if (this.runOpts.mpiTmpl) rv.Template = this.runOpts.mpiTmpl
        if (!this.runOpts.mpiOnRoot) rv.Opts['OpenM.NotOnRoot'] = 'true'
      }

      for (const lcd in this.runOpts.runDescr) {
        if ((lcd || '') !== '' && (this.runOpts.runDescr[lcd] || '') !== '') rv.Opts[lcd + '.RunDescription'] = this.runOpts.runDescr[lcd]
      }

      let rst = Mdf.emptyRunState()
      const u = this.omsUrl + '/api/run'

      try {
        // send model run request to the server, response expected to contain run stamp
        const response = await this.$axios.post(u, rv)
        rst = response.data
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or model run failed to start', em)
        // this.$q.notify({ type: 'negative', message: this.$t('Server offline or model run failed to start') + ': ' + this.modelDigest })
      }
      this.loadWait = false

      // return run status
      if (!Mdf.isRunState(rst)) rst = Mdf.emptyRunState()
      this.$emit('done', this.loadDone, rst.RunStamp)
    }
  },

  mounted () {
    this.doNewRunInit()
  }
}
</script>
