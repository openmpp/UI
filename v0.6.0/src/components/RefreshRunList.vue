<!-- reload run-text-list by digest -->
<template>

<span id="refresh-run-list" v-show="!loadDone" class="mdc-typography--caption">
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
    refreshRunListTickle: { type: Boolean, defaut: false }
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
    refreshTickle () { this.doRefreshRunTextList() },
    refreshRunListTickle () { this.doRefreshRunTextList() },
    digest () { this.doRefreshRunTextList() }
  },

  methods: {
    // refersh run list
    async doRefreshRunTextList () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = 'Loading run list...'
      this.$emit('wait')

      let u = this.omppServerUrl + '/api/model/' + (this.digest || '') + '/run-list/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(u)
        this.dispatchRunTextList(response.data) // update run list in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or no model runs published>'
        console.log('Server offline or no model runs published.', em)
      }
      this.loadWait = false
      this.$emit('done', this.loadDone)
    },

    ...mapActions({
      dispatchRunTextList: DISPATCH.RUN_TEXT_LIST
    })
  },

  mounted () {
    this.doRefreshRunTextList() // reload run list
  }
}
</script>
