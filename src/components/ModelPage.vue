<template>
<div id="model-page" class="main-container mdc-typography">

  <!-- tabs line: links to sub-pages -->
  <nav class="tab-container medium-wt">
    <div
      v-for="t in tabLst" :key="t.key"
      :class="{'tab-item-active': t.active, 'tab-item-inactive': !t.active}"
      class="tab-item">

        <router-link
          :to="t.path"
          :alt="t.title"
          :title="t.title"
          :class="{ 'tab-link-updated': t.updated }"
          class="tab-link">
            <span v-if="t.kind === 'run-list' || t.kind === 'set-list'" class="tab-icon material-icons">folder</span>
            <span v-if="t.kind === 'run-model'" class="tab-icon material-icons">directions_run</span>
            <span v-if="t.kind === 'table-list' || t.kind === 'table'" class="tab-icon material-icons">grid_on</span>
            <span v-if="t.kind === 'parameter-run-list'" class="tab-icon material-icons">input</span>
            <span v-if="t.kind === 'parameter-set-list'" class="tab-icon material-icons">mode_edit</span>
            <template v-if="t.kind === 'parameter'">
              <span v-if="t.runOrSet === 'run'" class="tab-icon material-icons">input</span>
              <span v-if="t.runOrSet === 'set' && !t.updated" class="tab-icon material-icons">mode_edit</span>
              <span v-if="t.runOrSet === 'set' && t.updated" class="tab-icon material-icons">save</span>
            </template>
            <span>{{t.title}}</span>
            <span v-if="t.kind === 'run-list'">: {{runTextCount}}</span>
            <span v-if="t.kind === 'set-list'">: {{worksetTextCount}}</span>
            <span v-if="t.kind === 'parameter-run-list' || t.kind === 'parameter-set-list'">: {{modelParamCount}}</span>
            <span v-if="t.kind === 'table-list'">: {{modelTableCount}}</span>
          </router-link>
        <button
          v-if="!t.updated"
          @click="onTabClose(t.key)"
          class="mdc-button mdc-button-dense tab-close-button"
          :alt="'Close ' + t.title"
          :title="'Close ' + t.title"><i class="tab-close-icon material-icons mdc-button__icon">close</i>
        </button>

    </div>
  </nav>
  <!-- end of tabs line -->

  <!-- header line -->
  <div
    :class="{ 'run-set-hdr-hint': isRunSetHint }"
    class="run-set-hdr-row mdc-typography--body1">

    <span v-if="loadDone">

      <span v-if="isRunSelected"
        @click="showRunInfoDlg()"
        class="om-cell-icon-link material-icons"
        alt="Description and notes" title="Description and notes">
          <span v-if="isSuccessTheRun">description</span>
          <span v-else>error_outline</span>
      </span>
      <!-- not isRunSelected -->
      <span v-else>

        <span
          @click="showWsInfoDlg()"
          class="om-cell-icon-link material-icons"
          alt="Description and notes" title="Description and notes">description</span>

        <span v-if="!isWsEdit && !isRunModelTab"
          @click="onNewRunModel()"
          class="om-cell-icon-link material-icons"
          alt="Run the model" title="Run the model">directions_run</span>
        <span v-else
          class="om-cell-icon-empty material-icons"
          alt="Run the model" title="Run the model">directions_run</span>

        <template v-if="!isRunModelTab">
          <span v-if="!isWsEdit"
            @click="onWsEditToggle()"
            class="om-cell-icon-link material-icons"
            alt="Edit input set of parameters" title="Edit input set of parameters">mode_edit</span>
          <span v-else
            @click="onWsEditToggle()"
            class="om-cell-icon-link material-icons"
            alt="Save input set of parameters" title="Save input set of parameters">save</span>
        </template>
        <template v-else>
          <span v-if="!isWsEdit"
            class="om-cell-icon-empty material-icons"
            alt="Edit input set of parameters" title="Edit input set of parameters">mode_edit</span>
          <span v-else
            class="om-cell-icon-empty material-icons"
            alt="Save input set of parameters" title="Save input set of parameters">save</span>
        </template>

      </span>

      <span class="hdr-text">
        <span v-if="isNotEmptyHdr">
          <span v-if="isRunSelected && !isSuccessTheRun" class="cell-status medium-wt">{{statusOfTheRun}}</span>
          <span v-if="isRunSelected" class="mono">{{lastTimeOfHdr}}&nbsp;</span>
          <span><span class="medium-wt">{{nameOfHdr}}</span> {{descrOfHdr}}</span>
        </span>
        <span v-else>
          <span class="medium-wt">{{emptyHdrMsg}}</span>
        </span>
      </span>

    </span>
    <!-- !loadDone -->
    <span v-else
      class="om-cell-icon-empty material-icons"
      title="Information not available" alt="Information not available" aria-hidden="true">description</span>

    <span class="hdr-text medium-wt">
      <refresh-model
        :digest="digest"
        :refresh-tickle="refreshTickle"
        @done="doneModelLoad"
        @wait="()=>{}">
      </refresh-model>
      <refresh-run v-if="(runSelected.Digest || '') !== ''"
        :model-digest="digest"
        :run-digest="runSelected.Digest"
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
      <refresh-workset v-if="(wsSelected.Name || '') !== ''"
        :model-digest="digest"
        :workset-name="wsSelected.Name"
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
      <update-workset-status v-if="(wsSelected.Name || '') !== ''"
        :model-digest="digest"
        :workset-name="wsSelected.Name"
        :enable-edit="!isWsEdit"
        :save-ws-status-tickle="saveWsStatusTickle"
        @done="doneWsStatusUpdate"
        @wait="()=>{}">
      </update-workset-status>
    </span>

  </div>
  <!-- end of header line -->

  <main class="main-container">
    <router-view
      ref="theTab"
      @tab-mounted="onTabMounted"
      @tab-new-route="onTabNewRoute"
      @run-select="onRunSelect"
      @run-list-refresh="onRunListRefresh"
      @workset-select="onWsSelect"
      @edit-updated="onEditUpdated"></router-view>
  </main>

  <run-info-dialog ref="theRunInfoDlg" id="the-run-info-dlg"></run-info-dialog>
  <workset-info-dialog ref="theWsInfoDlg" id="the-ws-info-dlg"></workset-info-dialog>

  <om-mcw-dialog id="model-edit-discard-dlg" ref="modelEditDiscardDlg" @closed="onModelEditDiscardClosed" cancelText="No" acceptText="Yes">
    <template #header><span>{{modelName}}</span></template>
    <div>Discard all changes?</div>
    <div>You have {{paramEditCount}} unsaved parameter(s)</div>
  </om-mcw-dialog>

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
    flex-grow: 1;
    flex-shrink: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  /* tab bar: tab items with link and close button */
  .tab-container {
    display: flex;
    flex-grow: 0;
    flex-shrink: 0;
    flex-direction: row;
    overflow: hidden;
    margin-top: 0.5rem;
  }
  .tab-item {
    display: inline-flex;
    flex-grow: 0;
    flex-shrink: 1;
    overflow: hidden;
    align-items: center;
    margin-right: 1px;
    min-height: 2rem;
    border-top-right-radius: 0.75rem;
  }
  .tab-item-active {
    @extend .mdc-theme--primary-bg;
  }
  .tab-item-inactive {
    @extend .om-theme-primary-light-bg;
  }
  .tab-link {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
    outline: none;
    @extend .mdc-theme--on-primary;
  }
  .tab-link-updated {
    padding-right: 0.5rem;
  }
  .tab-close-button {
    border: 0;
    padding: 0 0 0 0.5rem;
    max-height: 1.75rem;
    min-width: 1rem;
  }
  .tab-close-icon {
    @extend .mdc-theme--on-primary;
  }
  .tab-icon {
    vertical-align: text-bottom;
    padding-left: 0.125rem;
    padding-right: 0.125rem;
    font-size: 1.25rem;
    @extend .mdc-theme--on-primary;
  }

  /* header row of model, run, workset properties */
  .run-set-hdr-row {
    flex-grow: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    overflow: hidden;
    min-height: 1.75rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    background-color: whitesmoke;
    -webkit-transition: background-color 150ms;
    transition: background-color 150ms;
  }
  .run-set-hdr-hint {
    background-color: lightgrey;
  }
  .hdr-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-left: 0.5rem;
  }

  /* run status message */
  .cell-status {
    text-transform: uppercase;
  }
</style>
