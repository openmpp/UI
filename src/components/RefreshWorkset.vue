<!-- reload workset-text by model digest and workset name -->
<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'RefreshWorkset',

  props: {
    modelDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false },
    refreshWorksetTickle: { type: Boolean, default: false },
    isNewRun: { type: Boolean, default: false }
  },

  render () { return {} }, // no html

  data () {
    return {
      loadDone: false,
      loadWait: false
    }
  },

  computed: {
    ...mapState('uiState', {
      worksetNameSelected: state => state.worksetNameSelected,
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    worksetName () { this.doRefresh() },
    refreshTickle () { this.doRefresh() },
    refreshWorksetTickle () { this.doRefresh() }
  },

  methods: {
    // refersh workset-text by workset name
    async doRefresh () {
      if (!this.modelDigest || !this.worksetName) {
        console.warn('Unable to refresh input scenario: model digest or name is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh input scenario: model digest or name is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      const isRun = this.isNewRun
      this.$emit('wait')

      const u = this.omsUrl + '/api/model/' + this.modelDigest + '/workset/' + this.worksetName + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await this.$axios.get(u)
        this.dispatchWorksetText(response.data) // update workset in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or input scenario not found.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or input scenario not found') + ': ' + this.worksetName })
      }

      this.$emit('done', this.loadDone, this.worksetName, isRun)
      this.loadWait = false
    },

    ...mapActions('model', {
      dispatchWorksetText: 'worksetText'
    })
  },

  mounted () {
    // if current workset already loaded then exit
    if (!!this.modelDigest && !!this.worksetName && this.worksetNameSelected === this.worksetName) {
      this.loadDone = true
      this.$emit('done', this.loadDone, this.worksetName)
      return
    }
    this.doRefresh() // load workset
  }
}
</script>
