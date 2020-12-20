<!-- reload run-text by model digest and run digest -->
<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'RefershRun',

  props: {
    modelDigest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    refreshTickle: { type: Boolean, defaut: false }
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
      runDigestSelected: state => state.runDigestSelected,
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    runDigest () { this.doRefresh() },
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // refersh run text
    async doRefresh () {
      if (!this.modelDigest || !this.runDigest) {
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
    // if current run already loaded then exit
    if (!!this.modelDigest && !!this.runDigest && this.runDigestSelected === this.runDigest) {
      this.loadDone = true
      this.$emit('done', this.loadDone, this.runDigest)
      return
    }
    this.doRefresh() // else load run
  }
}
</script>
