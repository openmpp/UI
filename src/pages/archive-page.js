import { mapState, mapActions } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'ArchivePage',

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      nowRunCount: 0,
      alertRunCount: 0,
      nowWorksetCount: 0,
      alertWorksetCount: 0,
      loadArchiveDone: false
    }
  },

  computed: {
    isArchive () { return !!this?.archiveState?.IsArchive },
    archiveUpdateDateTime () { return this?.archiveState?.UpdateDateTime || '' },
    loadWait () {
      return !this.loadArchiveDone
    },

    ...mapState('serverState', {
      omsUrl: state => state.omsUrl,
      archiveState: state => state.archive
    })
  },

  watch: {
    refreshTickle () { this.doRefresh() },
    isArchive () { this.updateArchiveCounts() },
    archiveUpdateDateTime () { this.updateArchiveCounts() }
  },

  methods: {
    // update page view
    doRefresh () {
      if (!this.isArchive) {
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or archive state retrieve failed.') })
        return
      }
      this.doArchiveRefresh()
    },

    // update archive summary counts
    updateArchiveCounts () {
      this.nowRunCount = 0
      this.alertRunCount = 0
      this.nowWorksetCount = 0
      this.alertWorksetCount = 0

      if (!Mdf.isArchiveState(this.archiveState)) {
        return
      }

      for (const m of this.archiveState.Model) {
        this.nowRunCount = this.nowRunCount + m.Run.length
        this.alertRunCount = this.alertRunCount + m.RunAlert.length
        this.nowWorksetCount = this.nowWorksetCount + m.Set.length
        this.alertWorksetCount = this.alertWorksetCount + m.SetAlert.length
      }
    },

    // receive archive state from server
    async doArchiveRefresh () {
      this.loadArchiveDone = false

      const u = this.omsUrl + '/api/archive/state'
      try {
        // send request to the server
        const response = await this.$axios.get(u)
        this.dispatchArchiveState(response.data) // update archive state in store
      } catch (e) {
        let em = ''
        try {
          if (e.response) em = e.response.data || ''
        } finally {}
        console.warn('Server offline or archive state retrieve failed.', em)
        this.$q.notify({ type: 'negative', message: this.$t('Server offline or archive state retrieve failed.') })
      }
      this.loadArchiveDone = true

      this.updateArchiveCounts() // update counts to notify user
    },

    ...mapActions('serverState', {
      dispatchArchiveState: 'archiveState'
    })
  },

  mounted () {
    this.doRefresh()
  }
}
