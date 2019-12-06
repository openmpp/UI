<!-- reload workset-text-list by digest -->
<template>

<span id="refresh-workset-list" v-show="!loadDone" class="mdc-typography--caption">
  <span v-show="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span><span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters, mapActions } from 'vuex'
import { GET, DISPATCH } from '@/store'

export default {
  props: {
    digest: { type: String, default: '' },
    refreshTickle: { type: Boolean, defaut: false },
    refreshWsListTickle: { type: Boolean, defaut: false }
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
    refreshTickle () { this.doRefreshWsTextList() },
    refreshWsListTickle () { this.doRefreshWsTextList() },
    digest () { this.doRefreshWsTextList() }
  },

  methods: {
    // refersh workset list
    async doRefreshWsTextList () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = 'Loading workset list...'
      this.$emit('wait')

      let u = this.omppServerUrl + '/api/model/' + (this.digest || '') + '/workset-list/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(u)
        this.dispatchWorksetTextList(response.data) // update workset list in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or no model input sets published>'
        console.log('Server offline or no model input sets published.', em)
      }
      this.loadWait = false
      this.$emit('done', this.loadDone)
    },

    ...mapActions({
      dispatchWorksetTextList: DISPATCH.WORKSET_TEXT_LIST
    })
  },

  mounted () {
    this.doRefreshWsTextList() // reload workset list
  }
}
</script>
