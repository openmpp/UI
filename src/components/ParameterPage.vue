<template>

<div id="parameter-page" class="main-container mdc-typography mdc-typography--body1">

  <!-- header row: name, controls, load status -->
  <div v-if="loadDone && saveDone" class="hdr-row mdc-typography--body1">

    <span
      @click="showParamInfo()"
      class="cell-icon-link material-icons" :alt="paramName + ' info'" :title="paramName + ' info'">description</span>

    <span v-if="edt.isEnabled">
      <span v-if="edt.isUpdated"
        @click="doSave()"
        class="cell-icon-link material-icons" :alt="'Save ' + paramName" :title="'Save ' + paramName">save</span>
      <span v-else
        class="cell-icon-empty material-icons" title="Save" alt="Save">save</span>

      <span v-if="edt.lastHistory > 0"
        @click="doUndo()"
        class="cell-icon-link material-icons" alt="Undo" title="Undo">undo</span>
      <span v-else
        class="cell-icon-empty material-icons" alt="Undo" title="Undo">undo</span>

      <span v-if="edt.lastHistory < edt.history.length"
        @click="doRedo()"
        class="cell-icon-link material-icons" alt="Redo" title="Redo">redo</span>
      <span v-else
        class="cell-icon-empty material-icons" alt="Redo" title="Redo">redo</span>
    </span>

    <span
      @click="togglePivotControls()"
      class="cell-icon-link material-icons" title="Show / hide pivot controls" alt="Show / hide pivot controls">tune</span>
    <span v-if="ctrl.isRowColNamesToggle"
      @click="toggleRowColNames()"
      class="cell-icon-link material-icons" title="Show / hide rows and columns name" alt="Show / hide rows and columns name">view_quilt</span>
    <span v-else
      class="cell-icon-empty material-icons" title="Show / hide rows and columns name" alt="Show / hide rows and columns name">view_quilt</span>

    <template v-if="ctrl.formatOpts">
      <template v-if="ctrl.formatOpts.isDoMore">
        <span v-if="ctrl.formatOpts.isSrcShow"
          @click="showMoreFormat()"
          class="cell-icon-link material-icons" title="Show source value" alt="Show source value">loupe</span>
        <span v-else
          @click="showMoreFormat()"
          class="cell-icon-link material-icons" title="Show more details" alt="Show more details">zoom_in</span>
      </template>
      <template v-else>
        <span
          class="cell-icon-empty material-icons" title="Show more details" alt="Show more details">loupe</span>
      </template>

      <span v-if="ctrl.formatOpts.isDoLess"
        @click="showLessFormat()"
        class="cell-icon-link material-icons" title="Show less details" alt="Show less details">zoom_out</span>
      <span v-else
        class="cell-icon-empty material-icons" title="Show less details" alt="Show less details">zoom_out</span>
    </template>

    <span
      @click="doResetView()"
      class="cell-icon-link material-icons" title="Reset parameter view to default" alt="Reset parameter view to default">settings_backup_restore</span>

    <span class="medium-wt">{{ paramName }}: </span>
    <span>{{ paramDescr() }}</span>

  </div>
  <div v-else class="hdr-row medium-wt">
    <span class="cell-icon-empty material-icons" aria-hidden="true">refresh</span>
    <span v-if="loadWait || saveWait" class="material-icons om-mcw-spin">hourglass_empty</span>
    <span class="mdc-typography--caption">{{msg}}</span>
  </div>
  <!-- end of header row -->

  <!-- pivot table controls and view -->
  <div class="pv-container">

    <div v-show="ctrl.isShowPvControls" class="other-panel">
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

    <div v-show="ctrl.isShowPvControls" class="col-panel">
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
        v-show="ctrl.isShowPvControls"
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
        :showRowColNames="pvt.isRowColNames"
        :refreshTickle="pvt.isPvTickle"
        :refreshDimsTickle="pvt.isPvDimsTickle"
        :refreshValuesTickle="pvt.isPvValsTickle"
        :rowFields="rowFields"
        :colFields="colFields"
        :otherFields="otherFields"
        :pv-data="inpData"
        :readValue="pvt.readValue"
        :processValue="pvt.processValue"
        :formatValue="pvt.formatValue"
        :isEditEnabled="edt.isEnabled"
        :cellClass="pvt.cellClass"
        @pvt-size="onPvtSize"
        >
        <template v-if="edt.isEnabled" #cell="c">
          <span v-if="c.cell.key !== edt.cell.key"
            :ref="c.cell.key"
            @keydown.enter="onCellKeyEnter(c)"
            @dblclick="onCellDblClick(c)"
            tabindex="0"
            role="button"
            class="pv-cell-view"
            >{{getUpdatedValue(c.cell.key, c.cell.value)}}</span>
          <input v-else
            type="text"
            ref="cellInput"
            @keydown.enter="onCellInputConfirm($event, c)"
            @dblclick="onCellInputConfirm($event, c)"
            @blur="onCellInputBlur($event, c)"
            @keydown.esc="onCellInputEscape"
            tabindex="0"
            role="button"
            class="pv-cell-input mdc-typography--body1"
            :size="ctrl.pvtSize.valueLen"
            :value="getUpdatedSrc(c.cell.key, c.cell.src)" />
        </template>
      </pv-table>

    </div> <!-- pv-panel -->
  </div> <!-- pv-container -->

  <param-info-dialog ref="noteDlg" id="param-note-dlg"></param-info-dialog>

</div>

</template>

<script src="./parameter-page.js"></script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
@import "@material/theme/mdc-theme";
@import "@material/typography/mdc-typography";
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
  @extend .om-theme-primary-light-bg;
  @extend .mdc-theme--on-primary;
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
  min-height: 3rem;
  border: 1px dashed lightgrey;
  padding: 0.25rem;
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
  margin: 0.25rem;
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
  padding: 0.25rem 0.25rem 0.5rem 0.0625rem;
  vertical-align: middle;
  @extend .mdc-theme--on-primary;
  @extend .mdc-theme--primary-bg;
}

// table body cell: readonly view, input text
.pv-cell-view {
  width: 100%;
  height: 100%;
  display: inline-block;
}
.pv-cell-input {
  font-size: 0.875rem;
  border: 0;
  padding: 0px 1px;
  background-color: #e6e6e6;
}
</style>
