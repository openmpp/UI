<!-- run info bar: show run info in flex bar -->
<template>
  <div
    class="row items-center"
    >

    <q-btn
      @click="onShowRunNote"
      :disable="!isNotEmptyRun"
      flat
      dense
      class="col-auto text-white rounded-borders q-mr-xs"
      :class="isNowArchive ? 'bg-negative' : ((!isSoonArchive && (isSuccess || isInProgress)) ? 'bg-primary' : 'bg-warning')"
      :icon="isSuccess ? 'mdi-information' : (isInProgress ? 'mdi-run' : 'mdi-alert-circle-outline')"
      :title="(isNowArchive ? $t('Archiving now') : (isSoonArchive ? $t('Archiving soon') : ($t('About')))) + ': ' + runText.Name"
      />

    <div
      class="col-auto"
      >
      <span v-if="isNotEmptyRun">{{ runText.Name }}<br />
      <span class="om-text-descr"><span class="mono">{{ lastDateTimeStr }} </span>{{ descrOfRun }}</span></span>
      <span v-else disabled>{{ $t('Server offline or model run not found') }}</span>
    </div>

  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'

export default {
  name: 'RunBar',

  props: {
    modelDigest: { type: String, default: '' },
    runDigest: { type: String, default: '' },
    refreshRunTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      runText: Mdf.emptyRunText(),
      isNowArchive: false,
      isSoonArchive: false
    }
  },

  computed: {
    isNotEmptyRun () { return Mdf.isNotEmptyRunText(this.runText) },
    isSuccess () { return this.runText.Status === Mdf.RUN_SUCCESS },
    isInProgress () { return this.runText.Status === Mdf.RUN_IN_PROGRESS || this.runText.Status === Mdf.RUN_INITIAL },
    lastDateTimeStr () { return Mdf.dtStr(this.runText.UpdateDateTime) },
    descrOfRun () { return Mdf.descrOfTxt(this.runText) },
    archiveUpdateDateTime () { return (!!this?.serverConfig?.IsArchive && !!this?.archiveState?.IsArchive) ? this.archiveState.UpdateDateTime : '' },

    ...mapState('model', {
      runTextListUpdated: state => state.runTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('serverState', {
      serverConfig: state => state.config,
      archiveState: state => state.archive
    })
  },

  watch: {
    modelDigest () { this.doRefresh() },
    runDigest () { this.doRefresh() },
    refreshRunTickle () { this.doRefresh() },
    runTextListUpdated () { this.doRefresh() },
    archiveUpdateDateTime () { this.doRefresh() }
  },

  methods: {
    doRefresh () {
      this.runText = this.runTextByDigest({ ModelDigest: this.modelDigest, RunDigest: this.runDigest })

      // if archive is enabled then check run archive status
      this.isNowArchive = this.archiveUpdateDateTime !== '' && Mdf.isArchiveNowRun(this.archiveState, this.modelDigest, this.runDigest)
      this.isSoonArchive = this.archiveUpdateDateTime !== '' && Mdf.isArchiveAlertRun(this.archiveState, this.modelDigest, this.runDigest)
    },
    onShowRunNote () {
      this.$emit('run-info-click', this.modelDigest, this.runDigest)
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>

<style lang="scss" scope="local">
</style>
