<!-- initiate (start) new model run: send request to the server -->
<template>

<span id="new-run-init" v-show="!loadDone" class="mdc-typography--caption">
  <span v-show="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span><span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'

export default {
  props: {
    modelDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' },
    runOpts: {
      type: Object,
      default: () => ({
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
      })
    }
  },

  data () {
    return {
      loadDone: false,
      loadWait: false,
      msgLoad: ''
    }
  },

  computed: {
    ...mapGetters({
      uiLang: GET.UI_LANG,
      modelLang: GET.MODEL_LANG,
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    // refresh handlers
  },

  methods: {
    // initiate new model run: send request to the server
    async doNewRunInit () {
      if ((this.modelDigest || '') === '') return // exit: model digest unknown

      this.loadDone = false
      this.loadWait = true
      this.msgLoad = 'Starting model run...'
      this.$emit('wait')

      // set run options
      let rv = {
        ModelDigest: (this.modelDigest || ''),
        Dir: '',
        Opts: {
          'OpenM.RunName': (this.runOpts.runName || ''),
          'OpenM.SetName': (this.worksetName || '')
        },
        Mpi: {
          Np: 0
        },
        Template: ''
      }
      if ((this.runOpts.subCount || 1) !== 1) rv.Opts['OpenM.SubValues'] = this.runOpts.subCount.toString()
      if ((this.runOpts.threadCount || 1) !== 1) rv.Opts['OpenM.Threads'] = this.runOpts.threadCount.toString()
      if ((this.modelLang || '') !== '' && (this.runOpts.runDescr || '') !== '') rv.Opts[this.modelLang + '.RunDescription'] = this.runOpts.runDescr
      if ((this.runOpts.workDir || '') !== '') rv.Dir = this.runOpts.workDir
      if ((this.runOpts.progressPercent || 1) !== 1) rv.Opts['OpenM.ProgressPercent'] = this.runOpts.progressPercent.toString()
      if (this.runOpts.progressStep) rv.Opts['OpenM.ProgressStep'] = this.runOpts.progressStep.toString()
      if (this.runOpts.logVersion) rv.Opts['OpenM.Version'] = 'true'
      if ((this.runOpts.csvDir || '') !== '') rv.Opts['OpenM.ParamDir'] = this.runOpts.csvDir
      if (this.runOpts.csvId) rv.Opts['OpenM.IdCsv'] = 'true'
      if ((this.runOpts.profile || '') !== '') rv.Opts['OpenM.Profile'] = this.runOpts.profile
      if (this.runOpts.sparseOutput) rv.Opts['OpenM.SparseOutput'] = 'true'
      if (this.uiLang) rv.Opts['OpenM.MessageLanguage'] = this.uiLang

      let isMpi = (this.runOpts.mpiNpCount || 0) > 0
      if (!isMpi) {
        if (this.runOpts.runTmpl) rv.Template = this.runOpts.runTmpl
      } else {
        rv.Mpi.Np = this.runOpts.mpiNpCount
        if (this.runOpts.mpiTmpl) rv.Template = this.runOpts.mpiTmpl
        if (this.runOpts.mpiNotOnRoot) rv.Opts['OpenM.NotOnRoot'] = 'true'
      }

      let rst = Mdf.emptyRunState()
      let u = this.omppServerUrl + '/api/run'

      try {
        // send model run request to the server, response expected to contain run stamp
        const response = await axios.post(u, rv)
        rst = response.data
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or model run failed to start>'
        console.log('Server offline or model run failed to start.', em)
      }
      this.loadWait = false

      // return run status
      if (!Mdf.isRunState(rst)) rst = Mdf.emptyRunState()
      this.$emit('done', this.loadDone, rst)
    }
  },

  mounted () {
    this.doNewRunInit()
  }
}
</script>
