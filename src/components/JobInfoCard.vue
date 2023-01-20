<template>
<q-card>

  <template v-if="!isNotEmptyJob()">
    <q-card-section>{{ $t('None') }}</q-card-section>
  </template>
  <template v-else>

    <q-card-section>
      <table class="pt-table">
        <tbody>
          <tr v-if="jobInfo.ModelVersion">
            <td class="pt-head-left text-weight-medium">{{ $t('Model Version') }}</td>
            <td class="pt-cell-left">{{ jobInfo.ModelVersion }}</td>
          </tr>
          <tr v-if="jobInfo.ModelCreateDateTime">
            <td class="pt-head-left text-weight-medium">{{ $t('Model Created') }}</td>
            <td class="pt-cell-left">{{ jobInfo.ModelCreateDateTime }}</td>
          </tr>
          <tr>
            <td class="pt-head-left text-weight-medium">{{ $t('Model Digest') }}</td>
            <td class="pt-cell-left">{{ jobItem.ModelDigest }}</td>
          </tr>
          <tr v-if="jobInfo.OptRunName">
            <td class="pt-head-left text-weight-medium">{{ $t('Run Name') }}</td>
            <td class="pt-cell-left">{{ jobInfo.OptRunName }}</td>
          </tr>
          <tr v-if="jobItem.RunStamp">
            <td class="pt-head-left text-weight-medium">{{ $t('Run Stamp') }}</td>
            <td class="pt-cell-left">{{ jobItem.RunStamp }}</td>
          </tr>
          <tr>
            <td class="pt-head-left text-weight-medium">{{ $t('Submit Stamp') }}</td>
            <td class="pt-cell-left">{{ jobItem.SubmitStamp }}</td>
          </tr>
          <tr v-if="jobInfo.OptSubValues && jobInfo.OptSubValues !== '0'">
            <td class="pt-head-left text-weight-medium">{{ $t('Sub-values Count') }}</td>
            <td class="pt-cell-left">{{ jobInfo.OptSubValues }}</td>
          </tr>
          <tr v-if="jobInfo.OptSetName">
            <td class="pt-head-left text-weight-medium">{{ $t('Input Scenario') }}</td>
            <td class="pt-cell-left">{{ jobInfo.OptSetName }}</td>
          </tr>
          <tr v-if="jobInfo.OptBaseRunDigest">
            <td class="pt-head-left text-weight-medium">{{ $t('Base Run Digest') }}</td>
            <td class="pt-cell-left">{{ jobInfo.OptBaseRunDigest }}</td>
          </tr>
          <tr v-if="jobItem.Tables.length > 0">
            <td class="pt-head-left text-weight-medium">{{ $t('Output Tables') }}</td>
            <td class="pt-cell-left">{{ jobItem.Tables.join(', ') }}</td>
          </tr>
          <tr v-if="jobInfo.nProc > 1 || jobItem.Threads > 1">
            <td class="pt-head-left text-weight-medium">{{ $t('Processes / Threads') }}</td>
            <td class="pt-cell-left">{{ jobInfo.nProc }} / {{ jobItem.Threads }}</td>
          </tr>
          <tr v-if="!!jobItem.IsMpi || jobItem.Res.Cpu >= 1">
            <td class="pt-head-left text-weight-medium">{{ $t('CPU Cores') }}</td>
            <td class="pt-cell-left">{{ jobItem.Res.Cpu }} {{ jobItem.IsMpi ? 'MPI' : '' }}</td>
          </tr>
          <tr v-if="jobItem.Template">
            <td class="pt-head-left text-weight-medium">{{ $t('Model Run Template') }}</td>
            <td class="pt-cell-left">{{ jobItem.Template }}</td>
          </tr>
          <tr v-if="jobItem.LogFileName">
            <td class="pt-head-left text-weight-medium">{{ $t('Run Log') }}</td>
            <td class="pt-cell-left">{{ jobItem.LogFileName }}</td>
          </tr>
          <tr v-if="jobInfo.runDescr.length > 0">
            <td class="pt-head-left text-weight-medium">{{ $t('Run Description') }}</td>
            <td class="pt-cell-left">
              <div v-for="(rd, ird) of jobInfo.runDescr" :key="'h-' + rd.key + '-' + ird.toString()">
                {{ rd.descr }}
                <q-separator v-if="ird < jobInfo.runDescr.length - 1"/>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </q-card-section>

    <q-card-section
      v-for="rsp in jobItem.RunStatus" :key="rsp.RunDigest + '-' + (rsp.Status || 'st')"
      >
      <table v-if="rsp.UpdateDateTime" class="pt-table">
        <tbody>
          <tr>
            <td colspan="4" class="pt-head text-weight-medium">{{ rsp.Name }}</td>
          </tr>
          <tr>
            <td colspan="2" class="pt-head-left text-weight-medium">{{ $t('Run Started') }}</td>
            <td colspan="2" class="pt-cell-left">{{ dtRoundStr(rsp.CreateDateTime) }}</td>
          </tr>
          <tr>
            <td colspan="2" class="pt-head-left text-weight-medium">{{ $t('Duration') }}</td>
            <td colspan="2" class="pt-cell-left">{{ durationStr(rsp.CreateDateTime, rsp.UpdateDateTime) }}</td>
          </tr>
          <tr v-if="rsp.RunDigest">
            <td colspan="2" class="pt-head-left text-weight-medium">{{ $t('Run Digest') }}</td>
            <td colspan="2" class="pt-cell-left">{{ rsp.RunDigest }}</td>
          </tr>
          <tr>
            <td class="pt-head text-weight-medium">{{ rsp.SubCompleted > 0 ? $t('Completed') : $t('Sub-values') }}</td>
            <td class="pt-head text-weight-medium">{{ $t('Status') }}</td>
            <td class="pt-head text-weight-medium">{{ $t('Updated') }}</td>
            <td class="pt-head text-weight-medium">{{ $t('Value Digest') }}</td>
          </tr>
          <tr>
            <td class="pt-cell-right"><span v-if="rsp.SubCompleted > 0">{{ rsp.SubCompleted }} / </span>{{ rsp.SubCount }}</td>
            <td class="pt-cell-left">{{ $t(runStatusDescr(rsp.Status)) }}</td>
            <td class="pt-cell-left">{{ rsp.UpdateDateTime }}</td>
            <td class="pt-cell-left">{{ rsp.ValueDigest }}</td>
          </tr>
          <tr v-if="rsp.Progress">
            <td class="pt-head text-weight-medium">{{ $t('Sub-value') }}</td>
            <td class="pt-head text-weight-medium">{{ $t('Status') }}</td>
            <td class="pt-head text-weight-medium">{{ $t('Updated') }}</td>
            <td class="pt-head text-weight-medium">{{ $t('Progress') }}</td>
          </tr>
          <tr v-for="pi in rsp.Progress" :key="(pi.Status || 'st') + '-' + (pi.SubId || 'sub') + '-' + (pi.UpdateDateTime || 'upt')">
            <td class="pt-cell-right">{{ pi.SubId }}</td>
            <td class="pt-cell-left">{{ $t(runStatusDescr(pi.Status)) }}</td>
            <td class="pt-cell-left">{{ pi.UpdateDateTime }}</td>
            <td class="pt-cell-right">{{ pi.Count }}% ({{ pi.Value }})</td>
          </tr>
        </tbody>
      </table>
    </q-card-section>

    <q-card-section
      v-if="jobItem.LogFileName"
      >
      <span class="mono"><i>{{ jobItem.LogFileName }}:</i></span>
      <div v-if="jobItem.Lines.length <= 0">
        <span class="mono q-pt-md q-pl-md">{{ $t('Log file not found or empty') }}</span>
      </div>
      <div v-else>
        <pre>{{jobItem.Lines.join('\n')}}</pre>
      </div>
    </q-card-section>

  </template>

</q-card>
</template>

<script>
import * as Mdf from 'src/model-common'

export default {
  name: 'JobInfoCard',

  props: {
    jobItem: {
      type: Object,
      default: Mdf.emptyJobItem()
    }
  },

  data () {
    return {
    }
  },

  computed: {

    // return run job info and model info from job control item and first run status
    jobInfo () {
      const rji = {
        ModelVersion: '',
        ModelCreateDateTime: '',
        opts: [],
        runDescr: [],
        OptRunName: '',
        OptSubValues: '',
        OptSetName: '',
        OptBaseRunDigest: '',
        nProc: 1,
        RunNotes: []
      }
      if (!Mdf.isNotEmptyJobItem(this.jobItem)) return rji

      if (this.jobItem.RunStatus.length > 0) {
        rji.ModelVersion = this.jobItem.RunStatus[0]?.ModelVersion || ''
        rji.ModelCreateDateTime = this.jobItem.RunStatus[0]?.ModelCreateDateTime || ''
      }

      for (const iKey in this.jobItem.Opts) {
        if (!iKey || (this.jobItem.Opts[iKey] || '') === '') continue

        const v = this.jobItem.Opts[iKey]
        rji.opts.push({ key: iKey, val: v })

        const klc = iKey.toLowerCase()

        if (klc.endsWith('.RunDescription'.toLowerCase())) {
          rji.runDescr.push({ key: 'rd-' + iKey, descr: v })
        }
        if (klc.endsWith('OpenM.RunName'.toLowerCase())) rji.OptRunName = v
        if (klc.endsWith('OpenM.SubValues'.toLowerCase())) rji.OptSubValues = v
        if (klc.endsWith('OpenM.SetName'.toLowerCase())) rji.OptSetName = v
        if (klc.endsWith('OpenM.BaseRunDigest'.toLowerCase())) rji.OptBaseRunDigest = v
      }

      if (this.jobItem.Mpi.Np > 1) rji.nProc = this.jobItem.Mpi.Np

      // run notes: sanitize and convert from markdown to html
      // rji.RunNotes = jc.RunNotes || []

      return rji
    }
  },

  watch: {
  },

  methods: {
    isNotEmptyJob () { return Mdf.isNotEmptyJobItem(this.jobItem) },
    dtRoundStr (dt) { return Mdf.dtStr(dt) },
    durationStr (startDt, lastDt) { return Mdf.toIntervalStr(Mdf.dtStr(startDt), Mdf.dtStr(lastDt)) },
    runStatusDescr (status) { return Mdf.statusText(status) }
  },

  mounted () {
  }
}
</script>

<style lang="scss" scope="local">
  .pt-table {
    text-align: left;
    border-collapse: collapse;
  }
  .pt-cell {
    padding: 0.25rem;
    border: 1px solid lightgrey;
    font-size: 0.875rem;
  }
  .pt-head {
    @extend .pt-cell;
    text-align: center;
    background-color: whitesmoke;
  }
  .pt-head-left {
    @extend .pt-cell;
    text-align: left;
    background-color: whitesmoke;
  }
  .pt-cell-left {
    text-align: left;
    @extend .pt-cell;
  }
  .pt-cell-right {
    text-align: right;
    @extend .pt-cell;
  }
  .pt-cell-center {
    text-align: center;
    @extend .pt-cell;
  }
</style>
