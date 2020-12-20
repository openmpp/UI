<!-- reload run-text by model digest and run digest -->
<template>

<span id="refresh-run" v-show="!loadDone" class="mdc-typography--caption">
  <span v-show="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span><span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'

export default {
  props: {
    modelDigest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    refreshTickle: { type: Boolean, defaut: false },
    refreshRunTickle: { type: Boolean, defaut: false }
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
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    // refresh handlers
    refreshTickle () { this.doRefreshRunText() },
    refreshRunTickle () { this.doRefreshRunText() },
    runDigest () { this.doRefreshRunText() }
  },

  methods: {
    // refersh run text
    async doRefreshRunText () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = 'Loading model run...'
      this.$emit('wait')
      const dgst = (this.runDigest || '')

      let u = this.omppServerUrl + '/api/model/' + (this.modelDigest || '') + '/run/' + dgst + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(u)
        this.dispatchRunText(response.data) // update run text in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or model run not found>'
        console.log('Server offline or model run not found.', em)
      }
      this.loadWait = false
      this.$emit('done', this.loadDone, dgst)
    },

    ...mapActions({
      dispatchRunText: DISPATCH.RUN_TEXT
    })
  },

  mounted () {
    this.doRefreshRunText() // reload run
  }
}
</script>
