<template>
<div id="new-run-page" class="main-container mdc-typography mdc-typography--body1">

  <div class="panel-option-frame mdc-typography--body1">

    <template v-if="isWsEdit">
      <div class="panel-first-header">
        <om-mcw-button
          :disabled="isWsEdit"
          class="panel-item mdc-button--raised"
          :alt="'Run the model with input set ' + nameOrDigest"
          :title="'Run the model with input set ' + nameOrDigest">
          <i class="material-icons mdc-button__icon">directions_run</i>Run the model</om-mcw-button>
        <div
          class="panel-first-table-header om-note-empty">
          <span class="om-cell-icon-empty material-icons">{{isRunOptsShow ? 'arrow_drop_up' : 'arrow_drop_down'}}</span>
          <span>Model Run Options</span>
        </div>
      </div>
    </template>
    <template v-else>

      <div class="panel-first-header">
        <om-mcw-button
          @click="onModelRun"
          :disabled="isWsEdit || isInitRun"
          class="panel-item mdc-button--raised"
          :alt="'Run the model with input set ' + nameOrDigest"
          :title="'Run the model with input set ' + nameOrDigest">
          <i class="material-icons mdc-button__icon">directions_run</i>Run the model</om-mcw-button>
        <div
          @click="isRunOptsShow = !isRunOptsShow"
          class="panel-first-table-header om-note-link">
          <span class="om-cell-icon-link material-icons">{{isRunOptsShow ? 'arrow_drop_up' : 'arrow_drop_down'}}</span>
          <span>Model Run Options</span>
        </div>
      </div>
      <div v-show="isRunOptsShow" class="panel-table">
        <div class="panel-row">
          <label for="sub-count-input" class="panel-cell">Sub-Values (SubSamples):</label>
          <input type="number"
            id="sub-count-input" ref="subCountInput" size="4" maxlength="4" min="1" max="9999"
            v-model="runOpts.subCount"
            class="panel-cell panel-num-value" alt="Number of sub-values (a.k.a. members or replicas or sub-samples)" title="Number of sub-values (a.k.a. members or replicas or sub-samples)"/>
        </div>
        <div class="panel-row">
          <label for="thread-count-input" class="panel-cell">Modelling Threads:</label>
          <input type="number"
            id="thread-count-input" ref="threadCountInput" size="4" maxlength="4" min="1" max="9999"
            v-model="runOpts.threadCount"
            class="panel-cell panel-num-value" alt="Number of modelling threads" title="Number of modelling threads"/>
        </div>
        <div class="panel-row">
          <label for="run-name-input" class="panel-cell">Run Name:</label>
          <input type="text"
            id="run-name-input" ref="runNameInput" maxlength="255" size="80"
            v-model="runOpts.runName"
            @blur="onRunNameInputBlur"
            alt="Name of the new model run"
            title="Name of the new model run"
            class="panel-cell panel-value"/>
        </div>
        <div v-show="modelLang" class="panel-row">
          <label for="run-descr-input" class="panel-cell">Description:</label>
          <input type="text"
            id="run-descr-input" ref="runDescrInput" maxlength="255" size="80"
            v-model="runOpts.runDescr"
            @blur="onRunDescrInputBlur"
            alt="Model run description"
            title="Model run description"
            class="panel-cell panel-value"/>
        </div>
      </div>

      <div
        @click="isRunOptsAdvShow = !isRunOptsAdvShow"
        class="panel-table-header om-note-link">
        <span class="om-cell-icon-link material-icons">{{isRunOptsAdvShow ? 'arrow_drop_up' : 'arrow_drop_down'}}</span>
        <span>Advanced Run Options</span>
      </div>
      <div v-show="isRunOptsAdvShow" class="panel-table">
        <div class="panel-row">
          <label for="progress-percent-input" class="panel-cell">Log Progress Percent:</label>
          <input type="number"
            id="progress-percent-input" ref="progressPercentInput" size="4" maxlength="3" min="1" max="100"
            v-model="runOpts.progressPercent"
            class="panel-cell panel-num-value" alt="Percent completed to log model progress" title="Percent completed to log model progress"/>
        </div>
        <div class="panel-row">
          <label for="progress-step-input" class="panel-cell">Log Progress Step:</label>
          <input type="number"
            id="progress-step-input" ref="progressStepInput" size="4" maxlength="8" step="any"
            v-model="runOpts.progressStep"
            class="panel-cell panel-num-value" alt="Step to log model progress: number of cases or time passed" title="Step to log model progress: number of cases or time passed"/>
        </div>
        <div class="panel-row">
          <span class="panel-cell">Log Model Version:</span>
          <span class="panel-cell-radio">
            <span class="panel-border-radio">
              <input type="radio"
                id="yes-log-version-input" name="log-version-input" value="true" v-model="logVersionValue"
                alt="Log model version"
                title="Log model version"
                class="panel-item"/>
              <label for="yes-log-version-input" class="panel-item">Yes</label>
              <input type="radio"
                id="no-log-version-input" name="log-version-input" value="false" v-model="logVersionValue"
                alt="Do not log model version"
                title="Do not log model version"
                class="panel-item"/>
              <label for="no-log-version-input" class="panel-item">No</label>
            </span>
          </span>
        </div>
        <div class="panel-row">
          <label for="profile-name-input" class="panel-cell">Profile Name:</label>
          <select
            :disabled="isEmptyProfileList"
            ref="profileNameInput"
            v-model.lazy="profileValue"
            alt="Profile name in database to get model run options"
            title="Profile name in database to get model run options"
            class="panel-cell panel-value panel-cell-min-width">
              <option v-for="opt in profileLst" :key="opt" :value="opt">{{opt}}</option>
          </select>
        </div>
        <div class="panel-row">
          <label for="work-dir-input" class="panel-cell">Working Directory:</label>
          <input type="text"
            id="work-dir-input" ref="workDirInput" maxlength="2048" size="80" v-model="workDirValue"
            @blur="onWorkDirInputBlur"
            :placeholder="!isWorkDirEntered ? 'relative path to working directory to run the model' : 'working directory path must be relative and cannot go .. up'"
            alt="Path to working directory to run the model"
            title="Path to working directory to run the model"
            class="panel-cell panel-value"/>
        </div>
        <div class="panel-row">
          <label for="csv-dir-input" class="panel-cell">CSV Directory:</label>
          <input type="text"
            id="csv-dir-input" ref="csvDirInput" maxlength="2048" size="80" v-model="csvDirValue"
            @blur="onCsvDirInputBlur"
            :placeholder="!isCsvDirEntered ? 'relative path to parameters.csv directory' : 'CSV path must be relative and cannot go .. up'"
            alt="Path to parameters.csv directory"
            title="Path to parameters.csv directory"
            class="panel-cell panel-value"/>
        </div>
        <div class="panel-row">
          <span class="panel-cell">CSV file(s) contain:</span>
          <span class="panel-cell-radio" :class="!runOpts.csvDir ? 'panel-cell-disabled' : ''">
            <span class="panel-border-radio">
              <input type="radio"
                :disabled="!runOpts.csvDir"
                id="csv-code-use-input" name="csv-use-input" value="false" v-model="csvIdValue"
                alt="CSV files contain enum code"
                title="CSV files contain enum code"
                class="panel-item"/>
              <label for="csv-code-use-input" class="panel-item">Enum Code</label>
              <input type="radio"
                :disabled="!runOpts.csvDir"
                id="csv-id-use-input" name="csv-use-input" value="true" v-model="csvIdValue"
                alt="CSV files contain enum id"
                title="CSV files contain enum id"
                class="panel-item"/>
              <label for="csv-id-use-input" class="panel-item">Enum Id</label>
            </span>
          </span>
        </div>
        <div class="panel-row">
          <span class="panel-cell">Sparse Output Tables:</span>
          <span class="panel-cell-radio">
            <span class="panel-border-radio">
              <input type="radio"
                id="yes-sparse-output-input" name="sparse-output-input" value="true" v-model="sparseOutputValue"
                alt="Use sparse output tables: do not store small values and zeros"
                title="Use sparse output tables: do not store small values and zeros"
                class="panel-item"/>
              <label for="yes-sparse-output-input" class="panel-item">Yes</label>
              <input type="radio"
                id="no-sparse-output-input" name="sparse-output-input" value="false" v-model="sparseOutputValue"
                alt="No sparse output tables: store all values"
                title="No sparse output tables: store all values"
                class="panel-item"/>
              <label for="no-sparse-output-input" class="panel-item">No</label>
            </span>
          </span>
        </div>
        <div class="panel-row">
          <label for="run-tmpl-input" class="panel-cell">Model Run Template:</label>
          <select
            :disabled="isEmptyRunTemplateList || runOpts.mpiNpCount > 0"
            ref="runTmplInput"
            v-model.lazy="runTmplValue"
            alt="Template to run the model"
            title="Template to run the model"
            class="panel-cell panel-value panel-cell-min-width">
              <option v-for="opt in runTemplateLst" :key="opt" :value="opt">{{opt}}</option>
          </select>
        </div>
      </div>

      <div
        @click="isRunOptsMpiShow = !isRunOptsMpiShow"
        class="panel-table-header om-note-link">
        <span class="om-cell-icon-link material-icons">{{isRunOptsMpiShow ? 'arrow_drop_up' : 'arrow_drop_down'}}</span>
        <span>Cluster Run Options</span>
      </div>
      <div v-show="isRunOptsMpiShow" class="panel-table">
        <div class="panel-row">
          <label for="mpi-np-count-input" class="panel-cell">MPI Number of Processes:</label>
          <input type="number"
            id="mpi-np-count-input" ref="mpiNpCountInput" size="4" maxlength="4" min="0" max="9999"
            v-model="runOpts.mpiNpCount"
            @blur="onMpiNpInputBlur"
            class="panel-cell panel-num-value" alt="Number of parallel processes to run" title="Number of parallel processes to run"/>
        </div>
        <div class="panel-row">
          <span class="panel-cell">Use MPI Root for Modelling:</span>
          <span class="panel-cell-radio" :class="!runOpts.csvDir ? 'panel-cell-disabled' : ''">
            <span class="panel-border-radio">
              <input type="radio"
                :disabled="runOpts.mpiNpCount <= 0"
                id="yes-mpi-on-root-input" name="mpi-on-root-input" value="true" v-model="mpiOnRootValue"
                alt="Use MPI root process to run the model"
                title="Use MPI root process to run the model"
                class="panel-item"/>
              <label for="yes-mpi-on-root-input" class="panel-item">Yes</label>
              <input type="radio"
                :disabled="runOpts.mpiNpCount <= 0"
                id="no-mpi-on-root-input" name="mpi-on-root-input" value="false" v-model="mpiOnRootValue"
                alt="Do not use MPI root process to run the model"
                title="Do not use MPI root process to run the model"
                class="panel-item"/>
              <label for="no-mpi-on-root-input" class="panel-item">No</label>
            </span>
          </span>
        </div>
        <div class="panel-row">
          <label for="mpi-tmpl-input" class="panel-cell">MPI Model Run Template:</label>
          <select
            :disabled="runOpts.mpiNpCount <= 0"
            ref="mpiTmplInput"
            v-model.lazy="mpiTmplValue"
            alt="Template to run the model on MPI cluster"
            title="Template to run the model on MPI cluster"
            class="panel-cell panel-value">
              <option v-for="opt in mpiTemplateLst" :key="opt" :value="opt">{{opt}}</option>
          </select>
        </div>
      </div>

    </template>

  </div>

  <div v-if="isInitRun" class="panel-frame mdc-typography--body1">
    <div>
      <span class="medium-wt">Starting: </span><span class="mdc-typography--body1">{{runOpts.runName}}</span>
    </div>
    <div>
      <new-run-init
        :model-digest="digest"
        :workset-name="nameOrDigest"
        :run-opts="runOpts"
        @done="doneNewRunInit"
        @wait="()=>{}">
      </new-run-init>
    </div>
  </div>

  <run-log-page v-if="runStamp"
    :digest="digest"
    :runStamp="runStamp"
    @run-list-refresh="onRunListRefresh"
    class="panel-frame mdc-typography--body1"></run-log-page>

  <om-mcw-snackbar id="new-run-page-snackbar-msg" ref="newRunPageSnackbarMsg" labelText="..."></om-mcw-snackbar>

</div>
</template>

<script src="./new-run-page.js"></script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";
  @import "@/om-mcw.scss";

  .main-container {
    height: 100%;
    flex: 1 1 auto;
  }

  /* model run panel */
  .panel-border {
    border-width: 1px;
    border-style: solid;
    border-color: lightgrey;
  }
  .panel-frame {
    margin-top: 0.5rem;
    margin-right: 0.5rem;
    // @extend .panel-border;
  }
  .panel-option-frame {
    // padding: 0.25rem;
    @extend .panel-frame;
  }
  .panel-item {
    margin-right: 0.5rem;
  }
  .panel-value {
    @extend .panel-border;
    @extend .mdc-typography--body1;
  }
  .panel-num-value {
    text-align: right;
    width: 4rem;
    @extend .panel-value;
  }
  .panel-sub-count {
    margin-right: 0.5rem;
    @extend .panel-num-value;
  }
  .panel-first-header {
    display: flex;
  }
  .panel-first-table-header {
    flex-grow: 1;
    display: inline-flex;
    align-items: center;
    margin: 0;
  }
  .panel-table-header {
    margin: 0.25rem 0 0 0;
  }
  .panel-table {
    display: table;
  }
  .panel-row {
    display: table-row;
  }
  .panel-cell {
    display: table-cell;
    margin-top: 0.25rem;
    &:first-child {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
  }
  .panel-cell-radio {
    padding-top: 0.3125rem;
    padding-bottom: 0.125rem;
    @extend .panel-cell;
  }
  .panel-border-radio {
    padding-top: 0.1875rem;
    padding-bottom: 0.125rem;
    @extend .panel-border;
  }
  .panel-cell-disabled {
    color: GrayText;
    // background-color: ThreeDLightShadow;
    cursor: unset;
  }
  .panel-cell-min-width {
    min-width: 8rem;;
  }
</style>
