<!-- update workset readonly status by model digest and workset name -->
<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'UpdateWorksetStatus',

  props: {
    modelDigest: { type: String, default: '' },
    worksetName: { type: String, default: '' },
    isReadonly: { type: Boolean, default: false },
    updateStatusTickle: { type: Boolean, default: false }
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
    updateStatusTickle () { this.doUpdate() }
  },

  methods: {
    // refersh workset list
    async doUpdate () {
      if (!this.modelDigest || !this.worksetName) {
        console.warn('Unable to update input scenario: model digest or name is empty')
        this.$q.notify({ type: 'negative', message: this.$t('Unable to update input scenario: model digest or name is empty') })
        return
      }

      this.loadDone = false
      this.loadWait = true
      this.$emit('wait')

      const u = this.omsUrl +
        '/api/model/' + encodeURIComponent(this.modelDigest) +
        '/workset/' + encodeURIComponent(this.worksetName) +
        '/readonly/' + (this.isReadonly).toString()
      try {
        const response = await this.$axios.post(u)
        const rsp = response.data
        // expected workserRow json, it must be same name as workset requested
        if (rsp && rsp.hasOwnProperty('Name') && rsp.hasOwnProperty('IsReadonly') && rsp.hasOwnProperty('UpdateDateTime') &&
          (rsp.Name || '') === (this.worksetName || '_EMPTY_NAME_')) {
          // update current workset status in store
          this.dispatchWorksetStatus({
            ModelDigest: this.modelDigest,
            Name: this.worksetName,
            IsReadonly: rsp.IsReadonly,
            UpdateDateTime: rsp.UpdateDateTime
          })
        } else {
          console.warn('Unable to update input scenario, response:', rsp)
          this.$q.notify({ type: 'negative', message: this.$t('Server offline or input scenario not found') + ': ' + this.worksetName })
          return
        }
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or input scenario not found.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or input scenario not found') + ': ' + this.worksetName })
      }

      this.$emit('done', this.loadDone, this.worksetName, this.isReadonly)
      this.loadWait = false
    },

    ...mapActions('model', {
      dispatchWorksetStatus: 'worksetStatus'
    })
  },

  mounted () {
  }
}
</script>
