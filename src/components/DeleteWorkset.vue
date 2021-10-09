<!-- delete workset by model digest and workset name -->
<script>
import { mapState } from 'vuex'

export default {
  name: 'DeleteWorkset',

  props: {
    modelDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' },
    deleteNow: { type: Boolean, default: false }
  },

  render () { return {} }, // no html

  data () {
    return {
      loadDone: false,
      loadWait: false
    }
  },

  computed: {
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl
    })
  },

  watch: {
    deleteNow () { if (this.deleteNow) this.doDelete() }
  },

  methods: {
    // delete workset by model digest and workset name
    async doDelete () {
      if (!this.modelDigest || !this.worksetName) {
        console.warn('Unable to delete model input: model digest or input name is empty')
        this.$emit('done', false, this.modelDigest, this.worksetName)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete model input: model digest or input name is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      this.$emit('wait')
      this.$q.notify({ type: 'info', message: this.$t('Deleting') + ': ' + this.worksetName })

      const u = this.omsUrl + '/api/model/' + this.modelDigest + '/workset/' + (this.worksetName || '')
      try {
        await this.$axios.delete(u) // response expected to be empty on success
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Error at delete workset', this.worksetName, em)
      }
      this.loadWait = false

      if (this.loadDone) {
        this.$q.notify({ type: 'info', message: this.$t('Deleted') + ': ' + this.worksetName })
      } else {
        this.$q.notify({ type: 'negative', message: this.$t('Unable to delete') + ': ' + this.worksetName })
      }

      this.$emit('done', this.loadDone, this.modelDigest, this.worksetName)
    }
  },

  mounted () {
  }
}
</script>
