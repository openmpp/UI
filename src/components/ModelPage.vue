<template>

<div id="model-page" class="main-container mdc-typography">

  <div class="hdr-row mdc-typography--body1">

    <span v-if="loadDone">

      <span v-if="!isWsView"
        @click="showRunInfoDlg()"
        class="cell-icon-link material-icons"
        alt="Description and notes" title="Description and notes">
          <span v-if="isSuccessTheRun">notes</span>
          <span v-else>error_outline</span>
      </span>
      <!-- isWsView -->
      <span v-else>

        <span
          @click="showWsInfoDlg()"
          class="cell-icon-link material-icons"
          alt="Description and notes" title="Description and notes">notes</span>

        <span v-if="!isWsEdit">
          <span
            @click="doWsEditToggle()"
            class="cell-icon-link material-icons"
            alt="Edit input set of parameters" title="Edit input set of parameters">mode_edit</span>
          <span v-if="!isRunPanel"
            @click="showRunPanel()"
            class="cell-icon-link material-icons"
            alt="Run the model" title="Run the model">directions_run</span>
          <span v-else
            class="cell-icon-empty material-icons"
            alt="Run the model" title="Run the model">directions_run</span>
        </span>
        <!-- isWsEdit -->
        <span v-else>
          <span
            @click="doWsEditToggle()"
            class="cell-icon-link material-icons"
            alt="Save input set of parameters" title="Save input set of parameters">save</span>
          <span
            class="cell-icon-empty material-icons"
            alt="Run the model" title="Run the model">directions_run</span>
        </span>

      </span>
    </span>

    <!-- !loadDone -->
    <span v-else
      class="cell-icon-empty material-icons"
      title="Information not available" alt="Information not available" aria-hidden="true">notes</span>

    <span v-if="loadDone" class="hdr-text">
      <span v-if="isNotEmptyHdr">
        <span v-if="!isWsView && !isSuccessTheRun" class="cell-status medium-wt">{{statusOfTheRun}}</span>
        <span class="mono">{{lastTimeOfHdr}}&nbsp;</span><span class="medium-wt">{{nameOfHdr}}</span>
        <span>{{ descrOfHdr }}</span>
      </span>
      <span v-else>
        <span class="medium-wt">{{emptyHdrMsg}}</span>
      </span>
    </span>

    <span class="hdr-text medium-wt">
      <refresh-model
        :digest="digest"
        :refresh-tickle="refreshTickle"
        @done="doneModelLoad"
        @wait="()=>{}">
      </refresh-model>
      <refresh-run v-if="(runDigest || '') !== ''"
        :model-digest="digest"
        :run-digest="runDigest"
        :refresh-tickle="refreshTickle"
        :refresh-run-tickle="refreshRunTickle"
        @done="doneRunLoad"
        @wait="()=>{}">
      </refresh-run>
      <refresh-run-list
        :digest="digest"
        :refresh-tickle="refreshTickle"
        :refresh-run-list-tickle="refreshRunListTickle"
        @done="doneRunListLoad"
        @wait="()=>{}">
      </refresh-run-list>
      <refresh-workset v-if="(wsName || '') !== ''"
        :model-digest="digest"
        :workset-name="wsName"
        :refresh-tickle="refreshTickle"
        :refresh-ws-tickle="refreshWsTickle"
        @done="doneWsLoad"
        @wait="()=>{}">
      </refresh-workset>
      <refresh-workset-list
        :digest="digest"
        :refresh-tickle="refreshTickle"
        :refresh-ws-list-tickle="refreshWsListTickle"
        @done="doneWsListLoad"
        @wait="()=>{}">
      </refresh-workset-list>
      <update-workset-status v-if="(wsName || '') !== ''"
        :model-digest="digest"
        :workset-name="wsName"
        :enable-edit="!isWsEdit"
        :save-ws-status-tickle="saveWsStatusTickle"
        @done="doneWsStatusUpdate"
        @wait="()=>{}">
      </update-workset-status>
    </span>

  </div>

  <template v-if="isRunPanel">

    <div v-if="isEmptyRunStep" class="panel-frame mdc-typography--body1">
      <div>
        <span
          @click="hideRunPanel()"
          class="cell-icon-link material-icons"
          alt="Close" title="Close">close</span>
        <span class="panel-item">Enter the name for new model run:</span>
      </div>
      <div>
        <span
          :class="{'mdc-text-field--disabled': isWsEdit}"
          class="mdc-text-field mdc-text-field--box mdc-text-field--fullwidth">
          <input type="text"
            id="run-name-input"
            ref="runNameInput"
            maxlength="255"
            :disabled="isWsEdit"
            :value="autoNewRunName"
            alt="Name of new model run"
            title="Name of new model run"
            class="mdc-text-field__input" />
        </span>
      </div>
      <div>
        <om-mcw-button
          @click="doModelRun"
          :disabled="isWsEdit"
          class="panel-item mdc-button--raised"
          :alt="'Run the model with input set ' + wsName"
          :title="'Run the model with input set ' + wsName">
          <i class="material-icons mdc-button__icon">directions_run</i>Run the model</om-mcw-button>
        <input type="number"
          id="sub-count-input" ref="subCountInput" size="4" maxlength="4" min="1" max="9999"
          :value="newRunSubCount"
          :disabled="isWsEdit"
          class="panel-sub-count" alt="Number of sub-values" title="Number of sub-values" />
        <span class="panel-item">Sub-Values</span>
      </div>
    </div>

    <div v-if="isInitRunStep" class="panel-frame mdc-typography--body1">
      <div>
        <span
          @click="hideRunPanel()"
          class="cell-icon-link material-icons"
          alt="Close" title="Close">close</span>
        <span class="medium-wt">Running: </span><span class="mdc-typography--body1">{{newRunName}}</span>
      </div>
      <div>
        <new-run-init
          :model-digest="digest"
          :new-run-name="newRunName"
          :workset-name="wsName"
          :sub-count="newRunSubCount"
          @done="doneNewRunInit"
          @wait="()=>{}">
        </new-run-init>
      </div>
    </div>

    <div v-if="isProcRunStep || isFinalRunStep" class="panel-frame mdc-typography--body1">
      <div>
        <span
          @click="hideRunPanel()"
          class="cell-icon-link material-icons"
          alt="Close" title="Close">close</span>
        <span class="mdc-typography--body1">{{newRunName}}</span>
      </div>
      <div class="panel-line">
        <new-run-progress  v-if="!isFinalRunStep"
          :model-digest="digest"
          :new-run-stamp="newRunState.RunStamp"
          :start="newRunLogStart"
          :count="newRunLogSize"
          @done="doneNewRunProgress"
          @wait="()=>{}">
        </new-run-progress>
        <span class="mono" v-if="newRunState.UpdateDateTime">{{newRunState.UpdateDateTime}}</span>
        <span class="mono"><i>[{{modelName}}.{{newRunState.RunStamp}}.log]</i></span>
      </div>
      <div>
        <div v-for="ln in newRunLineLst" :key="ln.offset" class="mono mdc-typography--caption">{{ln.text}}</div>
      </div>
    </div>

  <!-- isRunPanel -->
  </template>

  <nav class="tab-container medium-wt">
    <div
      v-for="t in tabLst" :key="t.key" :id="t.id"
      :class="t.active ? 'tab-item-active' : 'tab-item-inactive'" class="tab-item">

        <router-link
          :to="t.path"
          @click.native="doTabLink(t.id)"
          :alt="t.title"
          :title="t.title"
          class="tab-link">{{t.title}}</router-link>

        <button
          @click="doTabClose(t.id)"
          class="mdc-button mdc-button-dense tab-close-button"
          :alt="'Close ' + t.title"
          :title="'Close ' + t.title"><i class="tab-close-icon material-icons mdc-button__icon">close</i>
        </button>

    </div>
  </nav>

  <main class="main-container">
    <router-view
      @tab-mounted="doTabMounted"
      @run-select="doRunSelect"
      @workset-select="doWsSelect"></router-view>
  </main>

  <run-info-dialog ref="theRunInfoDlg" id="the-run-info-dlg"></run-info-dialog>
  <workset-info-dialog ref="theWsInfoDlg" id="the-ws-info-dlg"></workset-info-dialog>

</div>

</template>

<script src="./model-page.js"></script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@material/typography/mdc-typography";
  @import "@material/textfield/mdc-text-field";
  @import "@/om-mcw.scss";

  /* page and tab container content body */
  .main-container {
    height: 100%;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  /* tab bar: tab items with link and close button */
  .tab-container {
    display: flex;
    flex-direction: row;
    overflow: hidden;
    margin-top: .5rem;
  }
  .tab-item {
    display: inline-flex;
    flex-grow: 0;
    flex-shrink: 1;
    overflow: hidden;
    align-items: center;
    padding-left: .5rem;
    margin-right: 1px;
    border-top-right-radius: 1rem;
  }
  .tab-item-inactive {
    @extend .tab-item;
    @extend .om-theme-primary-light-bg;
  }
  .tab-item-active {
    @extend .tab-item;
    @extend .mdc-theme--primary-bg;
  }
  .tab-link {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
    outline: none;
    @extend .mdc-theme--on-primary;
  }
  .tab-close-button {
    border: 0;
    padding: 0 0 0 .5rem;
    min-width: 1rem;
  }
  .tab-close-icon {
    @extend .mdc-theme--on-primary;
  }

  /* header row of model, run, workset properties */
  .hdr-row {
    flex-grow: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    margin-top: .5rem;
  }
  .hdr-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-left: .5rem;
  }

  /* model run panel */
  .panel-border {
    margin-top: .5rem;
    margin-right: 2rem;
    border-width: 1px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.12);
  }
  .panel-frame {
    margin-top: .5rem;
    margin-right: 2rem;
    @extend .panel-border;
  }
  .panel-item {
    margin-right: .5rem;
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
  .panel-line {
    margin-top: .25rem;
  }

  /* cell material icon: a link or empty (non-link) */
  .cell-icon {
    vertical-align: middle;
    margin: 0;
    padding-left: 0;
    padding-right: 0;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .cell-icon-link {
    @extend .cell-icon;
    &:hover {
      cursor: pointer;
    }
    @extend .mdc-theme--on-primary;
    @extend .mdc-theme--primary-bg;
  }
  .cell-icon-empty {
    @extend .cell-icon;
    cursor: default;
    @extend .mdc-theme--on-primary;
    @extend .om-theme-primary-light-bg;
  }
  .cell-status {
    text-transform: uppercase;
  }
</style>
