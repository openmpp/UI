<template>
<div class="text-body1">

  <div class="q-pa-sm">
    <q-toolbar class="shadow-1 rounded-borders">

      <template v-if="isFromRun">
        <run-bar
          :model-digest="digest"
          :run-digest="runDigest"
          @run-info-click="doShowRunNote"
          >
        </run-bar>
      </template>

      <template v-else>
        <workset-bar
          :model-digest="digest"
          :workset-name="worksetName"
          :is-new-run-button="true"
          :is-edit-button="true"
          @set-info-click="doShowWorksetNote"
          @set-update-readonly="onWorksetEditToggle"
          @new-run-select="onNewRunClick"
          >
        </workset-bar>
      </template>

    </q-toolbar>
  </div>

  <!-- parameter header -->
  <div class="q-mx-sm q-mb-sm">
    <q-toolbar class="row reverse-wrap items-center shadow-1 rounded-borders">

    <q-btn
      @click="doShowParamNote"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-information"
      :title="$t('About') + ' ' + parameterName"
      />

    <template v-if="!isFromRun">
      <q-btn
        @click="doEditToogle"
        :disable="!edt.isEnabled"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        :icon="edt.isEdit ? 'cancel' : 'mdi-table-edit'"
        :title="(edt.isEdit ? $t('Discard changes of') : $t('Edit')) + ' ' + parameterName"
        />
      <q-btn
        @click="onEditSave"
        :disable="!edt.isEnabled || !edt.isUpdated"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-content-save-edit"
        :title="$t('Save') + ' ' + parameterName"
        />
      <q-btn
        @click="onUndo"
        :disable="!edt.isEnabled || edt.lastHistory <= 0"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-undo-variant"
        :title="$t('Undo') + ': Ctrl+Z'"
        />
      <q-btn
        @click="onRedo"
        :disable="!edt.isEnabled || edt.lastHistory >= edt.history.length"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-redo-variant"
        :title="$t('Redo') + ': Ctrl+Y'"
        />
    </template>

    <q-btn
      @click="onCopyToClipboard"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      icon="mdi-content-copy"
      :title="$t('Copy tab separated values to clipboard') + ': Ctrl+C'"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="onToggleRowColControls"
      :disable="!ctrl.isRowColModeToggle"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      :class="{ 'q-mr-xs' : ctrl.isRowColModeToggle || ctrl.formatOpts }"
      :icon="ctrl.isRowColControls ? 'mdi-tune' : 'mdi-tune-vertical'"
      :title="ctrl.isRowColControls ? $t('Hide rows and columns bars') : $t('Show rows and columns bars')"
      />

    <template v-if="ctrl.isRowColModeToggle">
      <q-btn
        @click="onSetRowColMode(2)"
        :disable="pvc.rowColMode === 2"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-view-quilt-outline"
        :title="$t('Switch to default pivot view')"
        />
      <q-btn
        @click="onSetRowColMode(1)"
        :disable="pvc.rowColMode === 1"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-view-list-outline"
        :title="$t('Table view: hide rows and columns name')"
        />
      <q-btn
        @click="onSetRowColMode(0)"
        :disable="pvc.rowColMode === 0"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        :class="{ 'q-mr-xs' : ctrl.formatOpts }"
        icon="mdi-view-module-outline"
        :title="$t('Table view: always show rows and columns item')"
        />
    </template>

    <template v-if="ctrl.formatOpts">
      <q-btn
        @click="onShowMoreFormat"
        :disable="!ctrl.formatOpts.isDoMore"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-decimal-increase"
        :title="$t('Increase precision or show source value')"
        />
      <q-btn
        @click="onShowLessFormat"
        :disable="!ctrl.formatOpts.isDoLess"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        icon="mdi-decimal-decrease"
        :title="$t('Decrease precision')"
        />
    </template>
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="onSaveDefaultView"
      :disable="edt.isEdit"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-content-save-cog"
      :title="$t('Save table view as default view of') + ' ' + parameterName"
      />
    <q-btn
      @click="onReloadDefaultView"
      :disable="edt.isEdit"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-cog-refresh-outline"
      :title="$t('Reset table view to default and reload') + ' ' + parameterName"
      />

    <div
      class="col-auto"
      >
      <span>{{ parameterName }}<br />
      <span class="om-text-descr">{{ paramDescr }}</span></span>
    </div>

    </q-toolbar>
  </div>
  <!-- end of parameter header -->

  <!-- pivot table controls and view -->
  <div class="q-mx-sm">

    <div v-show="ctrl.isRowColControls && !edt.isEdit" class="other-panel">
      <draggable
        v-model="otherFields"
        group="fields"
        @start="onDrag"
        @end="onDrop"
        class="other-fields other-drag"
        :class="{'drag-area-hint': isDragging}"
        >
        <div v-for="f in otherFields" :key="f.name" class="field-drag om-text-medium">
          <q-select
            v-model="f.singleSelection"
            :options="f.options"
            @input="onSelectInput('other', f.name, f.singleSelection)"
            use-input
            hide-selected
            @filter="f.filter"
            :label="f.selectLabel()"
            outlined
            dense
            options-dense
            bottom-slots
            class="other-select"
            options-selected-class="option-selected"
            :title="$t('Select') + ' ' + f.label"
            >
            <template v-slot:before>
              <q-icon
                name="mdi-hand-left"
                size="xs"
                class="bg-primary text-white rounded-borders select-handle-move"
                />
              <div class="column">
                <q-icon
                  name="check"
                  size="xs"
                  class="row bg-primary text-white rounded-borders select-handle-button om-bg-inactive q-mb-xs"
                  :title="$t('Select all')"
                  />
                <q-icon
                  name="cancel"
                  size="xs"
                  class="row bg-primary text-white rounded-borders select-handle-button om-bg-inactive"
                  :title="$t('Clear all')"
                  />
              </div>
            </template>
            <template v-slot:hint>
              <div class="row">
                <span class="col ellipsis">{{ f.label }}</span>
                <span class="col-auto text-no-wrap">{{ f.selection ? f.selection.length : 0 }} / {{ f.enums ? f.enums.length : 0 }}</span>
              </div>
            </template>
          </q-select>
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
        :class="{'drag-area-hint': isDragging}"
        >
        <div v-for="f in colFields" :key="f.name" class="field-drag om-text-medium">
          <q-select
            v-model="f.selection"
            :options="f.options"
            @input="onSelectInput('col', f.name, f.selection)"
            use-input
            hide-selected
            @filter="f.filter"
            :label="f.selectLabel()"
            multiple
            outlined
            dense
            options-dense
            bottom-slots
            class="col-select"
            options-selected-class="option-selected"
            :title="$t('Select') + ' ' + f.label"
            >
            <template v-slot:before>
              <q-icon
                name="mdi-hand-left"
                size="xs"
                class="bg-primary text-white rounded-borders select-handle-move"
                />
              <div class="column">
                <q-btn
                  @click.stop="onSelectAll(f.name)"
                  flat
                  dense
                  size="xs"
                  class="row bg-primary text-white rounded-borders q-mb-xs"
                  icon="check"
                  :title="$t('Select all')"
                  />
                <q-btn
                  @click.stop="onClearAll(f.name)"
                  flat
                  dense
                  size="xs"
                  class="row bg-primary text-white rounded-borders"
                  icon="cancel"
                  :title="$t('Clear all')"
                  />
              </div>
            </template>
            <template v-slot:hint>
              <div class="row">
                <span class="col ellipsis">{{ f.label }}</span>
                <span class="col-auto text-no-wrap">{{ f.selection ? f.selection.length : 0 }} / {{ f.enums ? f.enums.length : 0 }}</span>
              </div>
            </template>
          </q-select>
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
        :class="{'drag-area-hint': isDragging}"
        >
        <div v-for="f in rowFields" :key="f.name" class="field-drag om-text-medium">
          <q-select
            v-model="f.selection"
            :name="f.name"
            :options="f.options"
            @input="onSelectInput('row', f.name, f.selection)"
            use-input
            hide-selected
            @filter="f.filter"
            :label="f.selectLabel()"
            multiple
            outlined
            dense
            options-dense
            bottom-slots
            class="row-select"
            options-selected-class="option-selected"
            :title="$t('Select') + ' ' + f.label"
            >
            <template v-slot:before>
              <q-icon
                name="mdi-hand-left"
                size="xs"
                class="bg-primary text-white rounded-borders select-handle-move"
                />
              <div class="column">
                <q-btn
                  @click.stop="onSelectAll(f.name)"
                  flat
                  dense
                  size="xs"
                  class="row bg-primary text-white rounded-borders q-mb-xs"
                  icon="check"
                  :title="$t('Select all')"
                  />
                <q-btn
                  @click.stop="onClearAll(f.name)"
                  flat
                  dense
                  size="xs"
                  class="row bg-primary text-white rounded-borders"
                  icon="cancel"
                  :title="$t('Clear all')"
                  />
              </div>
            </template>
            <template v-slot:hint>
              <div class="row">
                <span class="col ellipsis">{{ f.label }}</span>
                <span class="col-auto text-no-wrap">{{ f.selection ? f.selection.length : 0 }} / {{ f.enums ? f.enums.length : 0 }}</span>
              </div>
            </template>
          </q-select>
        </div>
      </draggable>

      <pv-table
        ref="omPivotTable"
        :rowFields="rowFields"
        :colFields="colFields"
        :otherFields="otherFields"
        :pv-data="inpData"
        :pv-control="pvc"
        :refreshViewTickle="ctrl.isPvTickle"
        :refreshDimsTickle="ctrl.isPvDimsTickle"
        :pv-edit="edt"
        @pv-key-pos="onPvKeyPos"
        @pv-edit="onPvEdit"
        >
      </pv-table>

    </div>

  </div>
  <!-- end of pivot table controls and view -->

  <run-info-dialog v-if="isFromRun" :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runDigest"></run-info-dialog>
  <workset-info-dialog v-if="!isFromRun" :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetName"></workset-info-dialog>
  <parameter-info-dialog v-if="isFromRun" :show-tickle="paramInfoTickle" :param-name="parameterName" :run-digest="runDigest"></parameter-info-dialog>
  <parameter-info-dialog v-if="!isFromRun" :show-tickle="paramInfoTickle" :param-name="parameterName" :workset-name="worksetName"></parameter-info-dialog>
  <edit-discard-dialog
    @discard-changes-yes="onYesDiscardChanges"
    :show-tickle="showEditDiscardTickle"
    :dialog-title="$t('Discard all changes') + '?'"
    >
  </edit-discard-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>
</template>

<script src="./parameter-page.js"></script>

<style lang="scss" scope="local">
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
  .row-select, .col-select, .other-select {
    min-width: 10rem;
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
    &:hover {
      cursor: move;
    }
  }

  .option-selected {
    background-color: whitesmoke;
  }
  .select-handle-move {
    min-height: 2.5rem;
    &:hover {
      cursor: move;
    }
  }
  .select-handle-button {
    &:hover {
      cursor: move;
    }
  }
</style>
