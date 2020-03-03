<!-- receive model run server configuration -->
<template>

<span id="refresh-run-config">
  <span>{{msgLoad}}</span>
</span>

</template>

<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'

export default {
  props: {
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
      omppServerUrl: GET.OMPP_SRV_URL
    })
  },

  watch: {
    // refresh handlers
  },

  methods: {
    // receive model run server configuration: return only MPI template list from configuartion
    async doRunProgressRefresh () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = ''
      this.$emit('wait')

      let cfg = { MpiTemplates: [] } // set config to empty value initially

      let u = this.omppServerUrl + '/api/run/catalog/state'
      try {
        // send request to the server, response body expected to be empty
        const response = await axios.get(u)
        cfg = response.data
        this.loadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        this.msgLoad = '<Server offline or run status retrive failed>'
        console.log('Server offline or run status retrive failed.', em)
      }
      this.loadWait = false

      // return file names of model run mpi templates
      let tpl = []
      if (!!cfg && cfg.hasOwnProperty('MpiTemplates') && Mdf.isLength(cfg.MpiTemplates)) { // at least one mpi template name expected
        tpl = cfg.MpiTemplates
      }
      this.$emit('done-run-config', this.loadDone, tpl)
    }
  },

  mounted () {
    this.doRunProgressRefresh()
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
</style>
