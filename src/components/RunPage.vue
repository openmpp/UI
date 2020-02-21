<template>
<div id="run-page" class="main-container mdc-typography mdc-typography--body1">

  <div v-if="isEmptyRunStep" class="panel-frame mdc-typography--body1">
    <div class="mdc-text-field" :class="{'mdc-text-field--disabled': isWsEdit}">
      <input type="text"
        id="run-name-input"
        ref="runNameInput"
        maxlength="255"
        size="255"
        :disabled="isWsEdit"
        :value="autoNewRunName"
        alt="Name of new model run"
        title="Name of new model run"
        class="mdc-text-field__input" />
      <label for="run-name-input" class="mdc-floating-label mdc-floating-label--float-above">Model Run Name</label>
    </div>
    <div>
      <om-mcw-button
        @click="onModelRun"
        :disabled="isWsEdit"
        class="panel-item mdc-button--raised"
        :alt="'Run the model with input set ' + nameDigest"
        :title="'Run the model with input set ' + nameDigest">
        <i class="material-icons mdc-button__icon">directions_run</i>Run the model</om-mcw-button>
      <input type="number"
        id="sub-count-input" ref="subCountInput" size="4" maxlength="4" min="1" max="9999"
        :value="newRun.subCount"
        :disabled="isWsEdit"
        class="panel-sub-count" alt="Number of sub-values" title="Number of sub-values" />
      <span class="panel-item">Sub-Values</span>
    </div>
  </div>

  <div v-if="isInitRunStep" class="panel-frame mdc-typography--body1">
    <div>
      <span class="medium-wt">Running: </span><span class="mdc-typography--body1">{{newRun.name}}</span>
    </div>
    <div>
      <new-run-init
        :model-digest="digest"
        :new-run-name="newRun.name"
        :workset-name="nameDigest"
        :sub-count="newRun.subCount"
        @done="doneNewRunInit"
        @wait="()=>{}">
      </new-run-init>
    </div>
  </div>

  <div v-if="isProcRunStep || isFinalRunStep" class="panel-frame mdc-typography--body1">

    <div>
      <span
        @click="runRefreshPauseToggle()"
        class="om-cell-icon-link material-icons"
        :alt="!isRefreshPaused ? 'Pause' : 'Refresh'"
        :title="!isRefreshPaused ? 'Pause' : 'Refresh'">{{!isRefreshPaused ? (isRefresh ? 'autorenew' : 'loop') : 'play_circle_outline'}}</span>

      <span class="medium-wt">Run Name: </span><span class="mdc-typography--body1">{{newRun.name}}</span>

      <run-log-refresh
        :model-digest="digest"
        :run-stamp="newRun.state.RunStamp"
        :refresh-tickle="isRefresh"
        :start="newRun.logStart"
        :count="200"
        @done="doneRunLogRefresh"
        @wait="()=>{}">
      </run-log-refresh>

      <run-progress-refresh
        :model-digest="digest"
        :run-stamp="newRun.state.RunStamp"
        :refresh-tickle="isProgressRefresh"
        @done="doneRunProgressRefresh"
        @wait="()=>{}">
      </run-progress-refresh>
    </div>

    <div v-for="pi in newRun.progress" :key="(pi.Status || 'st') + '-' + (pi.CreateDateTime || 'ct')" class="panel-section">
      <table v-if="pi.UpdateDateTime" class="pt-table panel-section">
        <thead>
          <tr>
            <th class="pt-head">Completed</th>
            <th class="pt-head">Status</th>
            <th class="pt-head">Updated</th>
            <th class="pt-head">Digest</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="pt-cell-right">{{pi.SubCompleted}} / {{pi.SubCount}}</td>
            <td class="pt-cell-left">{{statusOfTheRun(pi)}}</td>
            <td class="pt-cell-left">{{pi.UpdateDateTime}}</td>
            <td class="pt-cell-left">{{pi.Digest}}</td>
          </tr>
          <tr v-if="pi.Progress">
            <td class="pt-head">Sub-value</td>
            <td class="pt-head">Status</td>
            <td class="pt-head">Updated</td>
            <td class="pt-head">Progress</td>
          </tr>
          <tr v-for="spi in pi.Progress" :key="(spi.Status || 'st') + '-' + (spi.SubId || 'sub') + '-' + (spi.UpdateDateTime || 'upt')">
            <td class="pt-cell-right">{{spi.SubId}}</td>
            <td class="pt-cell-left">{{statusOfTheRun(spi)}}</td>
            <td class="pt-cell-left">{{spi.UpdateDateTime}}</td>
            <td class="pt-cell-right">{{spi.Count}}% ({{spi.Value}})</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel-section">
      <span class="mono" v-if="newRun.state.UpdateDateTime">{{newRun.state.UpdateDateTime}}</span>
      <span class="mono"><i>[{{modelName}}.{{newRun.state.RunStamp}}.console.log]</i></span>
    </div>
    <div>
      <div v-for="ln in newRun.logLines" :key="ln.key" class="mono mdc-typography--caption">
        {{ln.text}}
      </div>
    </div>

  </div>

</div>
</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import NewRunInit from './NewRunInit'
import RunLogRefresh from './RunLogRefresh'
import RunProgressRefresh from './RunProgressRefresh'
import OmMcwButton from '@/om-mcw/OmMcwButton'

/* eslint-disable no-multi-spaces */
const EMPTY_RUN_STEP = 0      // empty state of new model: undefined
const INIT_RUN_STEP = 1       // initiate new model run: submit request to the server
const PROC_RUN_STEP = 2       // model run in progress
const FINAL_RUN_STEP = 16     // final state of model run: completed or failed
/* eslint-enable no-multi-spaces */

const RUN_PROGRESS_REFRESH_TIME = 1000 // msec, run progress refresh time

export default {
  components: { NewRunInit, RunLogRefresh, RunProgressRefresh, OmMcwButton },

  props: {
    digest: { type: String, default: '' },
    nameDigest: { type: String, default: '' }
  },

  data () {
    return {
      modelName: '',
      isRefreshPaused: false,
      isRefresh: false,
      isProgressRefresh: false,
      refreshInt: '',
      refreshCount: 0,
      // current run (new model run)
      newRun: {
        step: EMPTY_RUN_STEP, // model run step: initial, start new, view progress
        name: '',
        subCount: 1,
        state: Mdf.emptyRunState(),
        progress: [],
        logStart: 0,
        logLines: []
      }
    }
  },

  computed: {
    // make new model run name
    autoNewRunName () {
      return (this.modelName || '') + '_' + (this.nameDigest || '')
    },

    // if true then selected workset edit mode else readonly and model run enabled
    isWsEdit () {
      const ws = this.worksetTextByName(this.nameDigest)
      return Mdf.isNotEmptyWorksetText(ws) && !ws.IsReadonly
    },

    // model new run step: empty, initialize, in progress, final
    isEmptyRunStep () { return this.newRun.step === EMPTY_RUN_STEP },
    isInitRunStep () { return this.newRun.step === INIT_RUN_STEP },
    isProcRunStep () { return this.newRun.step === PROC_RUN_STEP },
    isFinalRunStep () { return this.newRun.step === FINAL_RUN_STEP },

    ...mapGetters({
      theModel: GET.THE_MODEL,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME
    })
  },

  methods: {
    // initialize current page view
    initView () {
      this.modelName = Mdf.modelName(this.theModel)
      this.resetRunStep()
    },
    // clean new run data
    resetRunStep () {
      this.newRun.step = EMPTY_RUN_STEP
      this.newRun.name = ''
      this.newRun.subCount = 1
      this.newRun.state = Mdf.emptyRunState()
      this.newRun.progress = []
      this.newRun.logStart = 0
      this.newRun.logLines = []
      if (this.refreshInt) clearInterval(this.refreshInt)
    },

    // refersh model run progress
    refreshRunProgress () {
      if (this.isRefreshPaused) return
      this.isRefresh = !this.isRefresh
      if ((this.refreshCount++ % 3) === 1) this.isProgressRefresh = !this.isProgressRefresh
    },

    // pause on/off run progress refresh
    runRefreshPauseToggle () { this.isRefreshPaused = !this.isRefreshPaused },

    // return run status text by run status code
    statusOfTheRun (rp) { return Mdf.statusText(rp) },

    // run the model
    onModelRun () {
      // cleanup model run name and sub-count
      let name = this.$refs.runNameInput.value
      name = name.replace(/["'`$}{@\\]/g, ' ').trim()
      if ((name || '') === '') name = this.autoNewRunName

      let sub = this.$refs.subCountInput.value
      sub = sub.replace(/[^0-9]/g, ' ').trim()
      let nSub = ((sub || '') !== '') ? parseInt(sub) : 1

      this.newRun.name = name // actual values after cleanup
      this.newRun.subCount = nSub || 1
      this.newRun.state = Mdf.emptyRunState()
      this.newRun.progress = []

      // start new model run: send request to the server
      this.newRun.step = INIT_RUN_STEP
    },

    // new model run started: response from server
    doneNewRunInit (ok, rst) {
      this.newRun.step = ok ? PROC_RUN_STEP : FINAL_RUN_STEP
      if (!!ok && Mdf.isNotEmptyRunState(rst)) {
        this.newRun.state = rst
        this.newRun.name = rst.RunName
        this.refreshInt = setInterval(this.refreshRunProgress, RUN_PROGRESS_REFRESH_TIME)
      }
      if (!ok) this.$emit('run-list-refresh')
    },

    // model current run log progress: response from server
    doneRunLogRefresh (ok, rlp) {
      if (!ok || !Mdf.isNotEmptyRunStateLog(rlp)) return // empty run state or error

      this.newRun.state = Mdf.toRunStateFromLog(rlp)

      // update log lines
      let nLen = Mdf.lengthOf(rlp.Lines)
      if (nLen > 0) {
        for (let k = 0; k < nLen; k++) {
          this.newRun.logLines.push({
            key: this.digest + '-' + this.newRun.state.RunStamp + '-' + rlp.Offset + k,
            text: rlp.Lines[k]
          })
        }
      }

      // check is it final update: model run completed
      let isDone = (this.newRun.state.IsFinal && rlp.Offset + rlp.Size >= rlp.TotalSize)
      if (!isDone) {
        this.newRun.logStart = rlp.Offset + rlp.Size
      } else {
        clearInterval(this.refreshInt)
        this.isProgressRefresh = !this.isProgressRefresh // last refersh of run progress
        this.newRun.step = FINAL_RUN_STEP
        this.$emit('run-list-refresh')
      }
    },

    // model run status progress: response from server
    doneRunProgressRefresh (ok, rpl) {
      if (!ok || !Mdf.isLength(rpl)) return // empty run status progress or error

      this.newRun.progress = rpl
    }
  },

  mounted () {
    this.initView()
    this.$emit('tab-mounted',
      'run-model',
      { digest: this.digest, runOrSet: 'set', runSetKey: this.nameDigest })
  },
  beforeDestroy () {
    clearInterval(this.refreshInt)
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";
  @import "@material/textfield/mdc-text-field";
  @import "@material/floating-label/mdc-floating-label";
  @import "@/om-mcw.scss";

  /* main container, header row and pivot view container */
  .main-container {
    height: 100%;
    flex: 1 1 auto;
  }

  /* model run panel */
  .panel-border {
    margin-right: 0.5rem;
    border-width: 1px;
    border-style: solid;
    // border-color: rgba(0, 0, 0, 0.12);
    border-color: lightgrey;
  }
  .panel-frame {
    margin-top: 0.5rem;
    margin-right: 0.5rem;
    @extend .panel-border;
  }
  .panel-item {
    margin-right: 0.5rem;
  }
  .panel-value {
    @extend .panel-item;
    @extend .panel-border;
    @extend .mdc-typography--body1;
  }
  .panel-sub-count {
    width: 4rem;
    text-align: right;
    @extend .panel-value;
  }
  .panel-section {
    margin-top: 0.25rem;
  }

  /* run progress table */
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
    @extend .medium-wt;
    @extend .pt-cell;
    text-align: center;
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
