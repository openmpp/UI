<!-- update workset readonly status by model digest and workset name -->
<template>

<span id="update-workset-status" v-show="!loadDone" class="mdc-typography--caption">
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
    enableEdit: { type: Boolean, defaut: false },
    saveWsStatusTickle: { type: Boolean, defaut: false }
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
    // start status update handler
    saveWsStatusTickle () { this.doUpdateWsStatus() }
  },

  methods: {
    // update workset readonly status
    async doUpdateWsStatus () {
      this.loadDone = false
      this.loadWait = true
      this.msgLoad = 'Updating workset...'
      this.$emit('wait')
      const name = (this.worksetName || '')

      const u = this.omppServerUrl +
        '/api/model/' + (this.modelDigest || '') +
        '/workset/' + name +
        '/readonly/' + (!this.enableEdit).toString()
      try {
        const response = await axios.post(u)
        const rsp = response.data
        // expected workserRow json, it must be same name as workset requested
        if (rsp && rsp.hasOwnProperty('Name') && rsp.hasOwnProperty('IsReadonly')) {
          if ((rsp.Name || '') === (this.worksetName || '_EMPTY_NAME_')) {
            this.dispatchWorksetStatus(rsp) // update current workset status in store
          }
        }
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
      dispatchWorksetStatus: DISPATCH.WORKSET_STATUS
    })
  },

  mounted () {
  }
}
</script>
