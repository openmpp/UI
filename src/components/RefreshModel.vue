<!-- reload current model by digest -->
<template>

<span id="refresh-model" v-show="!loadDone" class="mdc-typography--caption">
  <span v-show="loadWait" class="material-icons om-mcw-spin">hourglass_empty</span><span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters, mapActions } from 'vuex'
import { GET, SET } from '@/store'
import * as Mdf from '@/modelCommon'

export default {
  props: {
    digest: '',
    refreshTickle: false
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
    // refresh button handler
    refreshTickle () {
      this.doRefreshModel() // reload current model
    }
  },

  methods: {
    // refersh current model
    async doRefreshModel () {
      this.loadDone = false
      this.msgLoad = 'Loading model...'
      this.loadWait = true
      this.$emit('wait')

      // refresh model text rows
      let u = this.omppServerUrl + '/api/model/' + (this.digest || '') + '/text' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(u)
        this.setTheModel(response.data) // update current model in store
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or model not found>'
        console.log('Server offline or model not found', em)
      }
      this.loadWait = false
      this.$emit('done', this.loadDone)

      // refresh model "words" language-specific strings
      let uw = this.omppServerUrl + '/api/model/' + (this.digest || '') + '/word-list' + (this.uiLang !== '' ? '/lang/' + this.uiLang : '')
      try {
        const response = await axios.get(uw)
        this.setWordList(response.data) // update model words list in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.log('Model words refresh failed', em)
      }
    },

    ...mapActions({
      setTheModel: SET.THE_MODEL,
      setWordList: SET.WORD_LIST
    })
  },

  mounted () {
    // if model already loaded then exit
    if (Mdf.modelDigest(this.theModel) === this.digest) {
      this.loadDone = true
      this.$emit('done')
      return
    }
    this.doRefreshModel() // reload current model
  }
}
</script>
