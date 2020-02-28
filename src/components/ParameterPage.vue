<template>

<div id="parameter-page" class="main-container mdc-typography mdc-typography--body1">

  <!-- header row: name, controls, load status -->
  <div v-if="loadDone && !saveStarted" class="hdr-row mdc-typography--body1">

    <span
      @click="showParamInfo()"
      class="om-cell-icon-link material-icons" :alt="'About ' + paramName" :title="'About ' + paramName">description</span>

    <template v-if="isFromWs">
      <template v-if="edt.isEnabled">
        <span v-if="!edt.isEdit"
          @click="doEditToogle()"
          class="om-cell-icon-link material-icons" :alt="'Edit ' + paramName" :title="'Edit ' + paramName">mode_edit</span>
        <span v-else
          @click="doEditToogle()"
          class="om-cell-icon-link material-icons" :alt="'Discard changes of ' + paramName" :title="'Discard changes of ' + paramName">cancel</span>

      <span v-if="edt.isUpdated"
        @click="doEditSave()"
        class="om-cell-icon-link material-icons" :alt="'Save ' + paramName" :title="'Save ' + paramName">save</span>
      <span v-else
        class="om-cell-icon-empty material-icons" alt="Save" title="Save">save</span>

      <span v-if="edt.lastHistory > 0"
        @click="onUndo()"
        class="om-cell-icon-link material-icons" alt="Undo: Ctrl+Z" title="Undo: Ctrl+Z">undo</span>
      <span v-else
        class="om-cell-icon-empty material-icons" alt="Undo: Ctrl+Z" title="Undo: Ctrl+Z">undo</span>

      <span v-if="edt.lastHistory < edt.history.length"
        @click="onRedo()"
        class="om-cell-icon-link material-icons" alt="Redo: Ctrl+Y" title="Redo: Ctrl+Y">redo</span>
      <span v-else
        class="om-cell-icon-empty material-icons" alt="Redo: Ctrl+Y" title="Redo: Ctrl+Y">redo</span>
      </template>
      <template v-else>
        <span class="om-cell-icon-empty material-icons" alt="" title="Edit">mode_edit</span>
        <span class="om-cell-icon-empty material-icons" alt="Save" title="Save">save</span>
        <span class="om-cell-icon-empty material-icons" alt="Undo: Ctrl+Z" title="Undo: Ctrl+Z">undo</span>
        <span class="om-cell-icon-empty material-icons" alt="Redo: Ctrl+Y" title="Redo: Ctrl+Y">redo</span>
      </template>
    </template>

    <span
      @click="toggleRowColControls()"
      class="om-cell-icon-link material-icons" title="Show / hide pivot controls" alt="Show / hide pivot controls">tune</span>

    <template v-if="ctrl.isRowColModeToggle">
      <span v-if="pvc.rowColMode === 2"
        @click="toggleRowColMode()"
        class="om-cell-icon-link material-icons" title="Hide rows and columns name" alt="Hide rows and columns name">view_list</span>
      <span v-else-if="pvc.rowColMode === 1"
        @click="toggleRowColMode()"
        class="om-cell-icon-link material-icons" title="Table view: always show rows and columns item" alt="Table view: always show rows and columns item">view_module</span>
      <span v-else
        @click="toggleRowColMode()"
        class="om-cell-icon-link material-icons" title="Switch to default pivot view" alt="Switch to default pivot view">view_quilt</span>
    </template>
    <template v-else>
      <span
        class="om-cell-icon-empty material-icons" title="Switch to default pivot view" alt="Switch to default pivot view">view_quilt</span>
    </template>

    <template v-if="ctrl.formatOpts">
      <template v-if="ctrl.formatOpts.isDoMore">
        <span v-if="ctrl.formatOpts.isSrcShow"
          @click="showMoreFormat()"
          class="om-cell-icon-link material-icons" title="Show source value" alt="Show source value">loupe</span>
        <span v-else
          @click="showMoreFormat()"
          class="om-cell-icon-link material-icons" title="Show more details" alt="Show more details">zoom_in</span>
      </template>
      <template v-else>
        <span
          class="om-cell-icon-empty material-icons" title="Show more details" alt="Show more details">loupe</span>
      </template>

      <span v-if="ctrl.formatOpts.isDoLess"
        @click="showLessFormat()"
        class="om-cell-icon-link material-icons" title="Show less details" alt="Show less details">zoom_out</span>
      <span v-else
        class="om-cell-icon-empty material-icons" title="Show less details" alt="Show less details">zoom_out</span>
    </template>

    <span
      @click="copyToClipboard()"
      class="om-cell-icon-link material-icons" title="Copy tab separated values: Ctrl+C" alt="Copy tab separated values: Ctrl+C">file_copy</span>

    <span v-if="!edt.isEdit"
      @click="doReload()"
      class="om-cell-icon-link material-icons" :title="'Reload ' + paramName" :alt="'Reload ' + paramName">settings_backup_restore</span>
    <span v-else
      class="om-cell-icon-empty material-icons" :title="'Reload ' + paramName" :alt="'Reload ' + paramName">settings_backup_restore</span>

    <span class="medium-wt">{{ paramName }}: </span>
    <span>{{ paramDescr() }}</span>

  </div>
  <div v-else class="hdr-row medium-wt"> <!-- v-else of: loadDone && !saveStarted -->
    <span v-if="saveWait"
      @click="doEditSave()"
      class="om-cell-icon-link material-icons" :alt="'Save ' + paramName" :title="'Save ' + paramName">save</span>
    <span v-if="loadWait || saveWait"
      @click="doReload()"
      class="om-cell-icon-link material-icons" :title="'Discard all changes and reload ' + paramName" :alt="'Discard all changes and reload ' + paramName">settings_backup_restore</span>
    <span v-if="loadWait || saveWait" class="material-icons om-mcw-spin">hourglass_empty</span>
    <span class="mdc-typography--caption">{{msg}}</span>
  </div>
  <!-- end of header row -->

  <!-- pivot table controls and view -->
  <div class="pv-container">

    <div v-show="ctrl.isRowColControls && !edt.isEdit" class="other-panel">
      <draggable
        v-model="otherFields"
        group="fields"
        @start="onDrag"
        @end="onDrop"
        class="other-fields other-drag"
        :class="{'drag-area-hint': !!multiSel.dragging}"
        >
        <div v-for="f in otherFields" :key="f.name" class="field-drag">
          <i class="material-icons" aria-hidden="true">pan_tool</i>
          <multi-select
            v-model="f.selection"
            @input="onSelectInput('other', f.name, f.selection)"
            :historyButton="true"
            :search="true"
            :btnLabel="f.selLabel"
            :selectOptions="f.enums"
            :options="multiSel.otherOpts"
            :title="'Select ' + f.label"></multi-select>
        </div>
      </draggable>
    </div>

    <div v-show="ctrl.isRowColControls" class="col-panel">
      <draggable
        v-model="colFields"
        group="fields"
        @start="onDrag"
        @end="onDrop"
        class="col-fields col-drag"
        :class="{'drag-area-hint': !!multiSel.dragging}"
        >
        <div v-for="f in colFields" :key="f.name" class="field-drag">
          <i class="material-icons" aria-hidden="true">pan_tool</i>
          <multi-select
            v-model="f.selection"
            @input="onSelectInput('col', f.name, f.selection)"
            :historyButton="true"
            :search="true"
            :btnLabel="f.selLabel"
            :selectOptions="f.enums"
            :options="multiSel.rcOpts"
            :filters="multiSel.filters"
            :title="'Select ' + f.label"></multi-select>
        </div>
      </draggable>
    </div>

    <div class="pv-panel">

      <draggable
        v-show="ctrl.isRowColControls"
        v-model="rowFields"
        group="fields"
        @start="onDrag"
        @end="onDrop"
        class="row-fields row-drag"
        :class="{'drag-area-hint': !!multiSel.dragging}"
        >
        <div v-for="f in rowFields" :key="f.name" class="field-drag">
          <i class="material-icons" aria-hidden="true">pan_tool</i>
          <multi-select
            v-model="f.selection"
            @input="onSelectInput('row', f.name, f.selection)"
            :historyButton="true"
            :search="true"
            :btnLabel="f.selLabel"
            :selectOptions="f.enums"
            :options="multiSel.rcOpts"
            :filters="multiSel.filters"
            :title="'Select ' + f.label"></multi-select>
        </div>
      </draggable>

      <pv-table
        :ref="pvRef"
        :rowFields="rowFields"
        :colFields="colFields"
        :otherFields="otherFields"
        :pv-data="inpData"
        :pv-control="pvc"
        :refreshTickle="ctrl.isPvTickle"
        :refreshDimsTickle="ctrl.isPvDimsTickle"
        :pv-edit="edt"
        @pv-key-pos="onPvKeyPos"
        @pv-edit="onPvEdit"
        @pv-message="onPvMessage"
        >
      </pv-table>

    </div> <!-- pv-panel -->
  </div> <!-- pv-container -->

  <param-info-dialog ref="paramNoteDlg" id="param-note-dlg"></param-info-dialog>

  <om-mcw-dialog id="param-edit-discard-dlg" ref="paramEditDiscardDlg" @closed="onEditDiscardClosed" cancelText="No" acceptText="Yes">
    <template #header><span>{{paramName}}</span></template>
    <div>Discard all changes?</div>
  </om-mcw-dialog>

  <om-mcw-snackbar id="param-snackbar-msg" ref="paramSnackbarMsg" labelText="..."></om-mcw-snackbar>

</div>

</template>

<script src="./parameter-page.js"></script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
@import "@material/theme/mdc-theme";
@import "@/om-mcw.scss";

/* main container, header row and pivot view container */
.main-container {
  height: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
}
.hdr-row {
  flex: 0 0 auto;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-top: 0.5rem;
}
.pv-container {
  flex: 1 1 auto;
  overflow: auto;
  margin-top: 0.5rem;
}

/* pivot vew controls: rows, columns, other dimensions and drag-drop area */
.flex-item {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
}

.col-panel, .other-panel, .pv-panel {
  @extend .flex-item;
  flex-direction: row;
  flex-wrap: nowrap;
}

.other-fields, .col-fields {
  flex: 1 0 auto;
}
.row-fields {
  min-width: 12rem;
  flex: 0 0 auto;
}
.drag-area {
  min-height: 2.5rem;
  padding: 0.125rem;
  border: 1px dashed lightgrey;
}
.drag-area-hint {
  background-color: whitesmoke;
}
.sortable-ghost {
  opacity: 0.5;
}
.col-drag, .other-drag {
  @extend .flex-item;
  @extend .drag-area;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.row-drag {
  @extend .flex-item;
  @extend .drag-area;
  flex-direction: column;
  flex-wrap: wrap;
  align-items: flex-start;
}

.field-drag {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
  font-weight: 500;
  &:hover {
    cursor: move;
  }
}
.field-drag i.material-icons {
  font-size: 1rem;
  // pan_tool -> padding: 0.25rem 0.25rem 0.5rem 0.0625rem;
  // drag_indicator -> padding: 0.375rem 0.25rem 0.375rem 0.25rem;
  padding: 0.25rem 0.25rem 0.5rem 1px;
  // vertical-align: middle;
  @extend .mdc-theme--on-primary;
  @extend .mdc-theme--primary-bg;
}
</style>
