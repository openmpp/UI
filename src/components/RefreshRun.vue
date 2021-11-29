<!-- reload run-text by model digest and run digest -->
<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'RefreshRun',

  props: {
    modelDigest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false },
    refreshRunTickle: { type: Boolean, default: false }
  },

  render () { return {} }, // no html

  data () {
    return {
      loadDone: false,
      loadWait: false
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected,
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    runDigest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    refreshRunTickle () { this.doRefresh() }
  },

  methods: {
    // refersh run text
    async doRefresh () {
      if (!this.runDigest) return // exit on empty run digest

      if (!this.modelDigest) {
        console.warn('Unable to refresh model run: model digest or run digest is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh model run: digest is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      this.$emit('wait')

      const u = this.omsUrl + '/api/model/' + this.modelDigest + '/run/' + this.runDigest + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await this.$axios.get(u)
        this.dispatchRunText(response.data) // update run in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or model run not found', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or model run not found') + ': ' + this.runDigest })
      }

      this.$emit('done', this.loadDone, this.runDigest)
      this.loadWait = false
    },

    ...mapActions('model', {
      dispatchRunText: 'runText'
    })
  },

  mounted () {
    if (!!this.modelDigest && !!this.runDigest) {
      // if run completed and run parameters list loaded then exit
      const rt = this.runTextByDigest({ ModelDigest: this.modelDigest, RunDigest: this.runDigest })
      if (Mdf.isNotEmptyRunText(rt) && Mdf.isRunCompletedStatus(rt?.Status) && Array.isArray(rt?.Param) && (rt?.Param?.length || 0) === Mdf.paramCount(this.theModel)) {
        this.loadDone = true
        this.$emit('done', this.loadDone, this.runDigest)
        return
      }
      this.doRefresh() // else load run
    }
  }
}
</script>
