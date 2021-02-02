<!-- reload array of workset-text by model digest and array of workset names -->
<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'RefreshWorksetArray',

  props: {
    modelDigest: { type: String, default: '' },
    worksetNameArray: { type: Array, default: () => [] },
    refreshTickle: { type: Boolean, default: false },
    refreshAllTickle: { type: Boolean, default: false }
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
    refreshTickle () { this.doRefresh() },
    refreshAllTickle () { this.doRefresh() }
  },

  methods: {
    // refersh array of workset-text by array of worksets names
    async doRefresh () {
      if (!Array.isArray(this.worksetNameArray) || (this.worksetNameArray.length || 0) === 0) return // exit if array of names is empty: nothing to do

      if (!this.modelDigest) {
        console.warn('Unable to refresh input scenario: model digest or name is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh input scenario: model digest or name is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      let count = 0
      this.$emit('wait')

      for (const wsn of this.worksetNameArray) {
        if (!wsn || typeof wsn !== typeof 'string' || wsn === '') {
          console.warn('Unable to refresh input scenario: name is empty')
          continue // skip empty name
        }

        const u = this.omsUrl + '/api/model/' + this.modelDigest + '/workset/' + wsn + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
        try {
          const response = await this.$axios.get(u)
          this.dispatchWorksetText(response.data) // update workset in store
          count++
        } catch (e) {
          let em = ''
          try {
            if (e.response) em = e.response.data || ''
          } finally {}
          console.warn('Server offline or input scenario not found.', em)
          this.$q.notify({ type: 'negative', message: this.$t('Server offline or input scenario not found') + ': ' + wsn })
        }
      }

      this.loadDone = true
      this.loadWait = false
      this.$emit('done', this.loadDone, count)
    },

    ...mapActions('model', {
      dispatchWorksetText: 'worksetText'
    })
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
