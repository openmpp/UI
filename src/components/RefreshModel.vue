<!-- reload current model by digest -->
<script>
import { mapState, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'RefershModel',

  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, default: false }
  },

  render () { return {} },

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
    ...mapState('uiState', {
      uiLang: state => state.uiLang
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    refreshTickle () { this.doRefresh() }
  },

  methods: {
    // refersh current model
    async doRefresh () {
      if (!this.digest) {
        console.warn('Unable to refresh model: digest is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to refresh model: digest is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      this.$emit('wait')

      const u = this.omsUrl + '/api/model/' + this.digest + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await this.$axios.get(u)
        this.dispatchTheModel(response.data) // update current model in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or model not found.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or model not found') + ': ' + this.digest })
      }
      this.$emit('done', this.loadDone)

      // refresh model "words" language-specific strings
      const uw = this.omsUrl + '/api/model/' + this.digest + '/word-list' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await this.$axios.get(uw)
        this.dispatchWordList(response.data) // update model words list in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or model words refresh failed', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or model words refresh failed') })
      }

      this.loadWait = false

      // refresh list of model languages
      const ul = this.omsUrl + '/api/model/' + this.digest + '/lang-list'
      try {
        const response = await this.$axios.get(ul)
        this.dispatchLangList(response.data) // update list of maodel languages in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or languages list refresh failed', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or languages list refresh failed') })
      }

      this.loadWait = false
    },

    ...mapActions('model', {
      dispatchTheModel: 'theModel',
      dispatchWordList: 'wordList',
      dispatchLangList: 'langList'
    })
  },

  mounted () {
    // if model already loaded then exit
    if (!!this.digest && Mdf.modelDigest(this.theModel) === this.digest) {
      this.loadDone = true
      this.$emit('done', this.loadDone)
      return
    }
    this.doRefresh() // else load new model
  }
}
</script>
