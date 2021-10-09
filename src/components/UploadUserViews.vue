<!-- upload user model views on server to save in home directory model view file -->
<script>
import { mapState } from 'vuex'
import * as Mdf from 'src/model-common'
import * as Idb from 'src/idb/idb'

export default {
  name: 'UploadUserViews',

  props: {
    modelName: { type: String, default: '' },
    uploadViewsTickle: { type: Boolean, default: false }
  },

  render () { return {} }, // no html

  data () {
    return {
      uploadDone: false,
      uploadWait: false
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel
    }),
    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      serverConfig: state => state.config
    })
  },

  watch: {
    uploadViewsTickle () { this.doUpload() }
  },

  methods: {
    // upload model views into user home directory
    async doUpload () {
      // exit if user views not supported by the server
      // exit on empty model name: model not loaded
      if (!this.serverConfig.AllowUserHome || !this.modelName) {
        return
      }

      this.uploadDone = false
      this.uploadWait = true
      this.$emit('wait')

      // select all rows from indexed db by model name and make array of parameter views
      const pvRows = []
      try {
        const dbCon = await Idb.connection()
        const rd = await dbCon.openReadOnly(this.modelName)
        const keyArr = await rd.getAllKeys()

        // if there are any data selected by model name then find parameter views
        if (Mdf.isLength(keyArr)) {
          for (const key of keyArr) {
            const v = await rd.getByKey(key)
            if (v || v === {}) {
              const idx = this.theModel.ParamTxt.findIndex(p => p.Param.Name === key)
              if (idx >= 0) pvRows.push({ name: key, view: v })
            }
          }
        }
      } catch (e) {
        console.warn('Unable to retrieve parameter views', this.modelName, e)
        this.$q.notify({ type: 'negative', message: this.$t('Unable to retrieve parameter views') + ': ' + this.modelName })
        this.$emit('done', this.uploadDone, 0)
        return
      }

      const uv = { model: { name: this.modelName, parameterViews: pvRows } }

      // upload user views to the server, response body expected to be empty
      const u = this.omsUrl + '/api/user/view/model/' + this.modelName
      try {
        const response = await this.$axios.put(u, uv)
        const rsp = response.data
        if ((rsp || '') !== '') console.warn('Server reply on user views save:', rsp)
        this.uploadDone = true
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or upload user views failed:', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or upload user views failed') + ': ' + this.modelName })
      }

      this.$emit('done', this.uploadDone, pvRows.length)
      this.uploadWait = false
    }
  },

  mounted () {
  }
}
</script>
