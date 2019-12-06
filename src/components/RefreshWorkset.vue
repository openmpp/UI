<!-- reload workset-text by model digest and workset name -->
<template>

<span id="refresh-workset" v-show="!loadDone" class="mdc-typography--caption">
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
    worksetName: { type: String, default: '' },
    refreshTickle: { type: Boolean, defaut: false },
    refreshWsTickle: { type: Boolean, defaut: false }
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
    refreshTickle () { this.doRefreshWsText() },
    refreshWsTickle () { this.doRefreshWsText() },
    worksetName () { this.doRefreshWsText() }
  },

  methods: {
    // refersh workset text
    async doRefreshWsText () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = 'Loading workset...'
      this.$emit('wait')
      const name = (this.worksetName || '')

      let u = this.omppServerUrl + '/api/model/' + (this.modelDigest || '') + '/workset/' + name + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(u)
        this.dispatchWorksetText(response.data) // update workset text in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or no model input set not found>'
        console.log('Server offline or no model input set not found.', em)
      }
      this.loadWait = false
      this.$emit('done', this.loadDone, name)
    },

    ...mapActions({
      dispatchWorksetText: DISPATCH.WORKSET_TEXT
    })
  },

  mounted () {
    this.doRefreshWsText() // reload workset
  }
}
</script>
