<template>
<div class="text-body1">

  <div class="q-pa-sm">
    <q-toolbar class="shadow-1 rounded-borders">

      <run-bar
        :model-digest="digest"
        :run-digest="runDigest"
        @run-info-click="doShowRunNote"
        >
      </run-bar>

    </q-toolbar>
  </div>

  <!-- microdata header -->
  <div class="q-mx-sm q-mb-sm">
    <q-toolbar class="row reverse-wrap items-center shadow-1 rounded-borders">

    <!-- menu -->
    <q-btn
      outline
      dense
      class="col-auto text-primary rounded-borders q-mr-xs"
      icon="menu"
      :title="$t('Menu')"
      :aria-label="$t('Menu')"
      >
      <q-menu auto-close>
        <q-list dense>

          <q-item
            @click="doShowEntityNote"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-information-outline" />
            </q-item-section>
            <q-item-section>{{ $t('About') + ' '  + entityName }}</q-item-section>
          </q-item>

          <q-separator />

          <q-item
            @click="onCopyToClipboard"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-content-copy" />
            </q-item-section>
            <q-item-section>{{ $t('Copy tab separated values to clipboard: ') + 'Ctrl+C' }}</q-item-section>
          </q-item>
          <q-item
            @click="onDownload"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-download" />
            </q-item-section>
            <q-item-section>{{ $t('Download') + ' '  + entityName + ' ' + $t('as CSV') }}</q-item-section>
          </q-item>

          <q-separator />

          <q-item
            @click="onToggleRowColControls"
            :disable="!ctrl.isRowColModeToggle"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-tune" />
            </q-item-section>
            <q-item-section>{{ ctrl.isRowColControls ? $t('Hide rows and columns bars') : $t('Show rows and columns bars') }}</q-item-section>
          </q-item>

          <template v-if="ctrl.isRowColModeToggle">
            <q-item
              @click="onSetRowColMode(2)"
              :disable="pvc.rowColMode === 2"
              clickable
              >
              <q-item-section avatar>
                <q-icon color="primary" name="mdi-view-quilt-outline" />
              </q-item-section>
              <q-item-section>{{ $t('Switch to default pivot view') }}</q-item-section>
            </q-item>
            <q-item
              @click="onSetRowColMode(1)"
              :disable="pvc.rowColMode === 1"
              clickable
              >
              <q-item-section avatar>
                <q-icon color="primary" name="mdi-view-list-outline" />
              </q-item-section>
              <q-item-section>{{ $t('Table view: hide rows and columns name') }}</q-item-section>
            </q-item>
            <q-item
              @click="onSetRowColMode(3)"
              :disable="pvc.rowColMode === 3"
              clickable
              >
              <q-item-section avatar>
                <q-icon color="primary" name="mdi-view-compact-outline" />
              </q-item-section>
              <q-item-section>{{ $t('Table view: always show rows and columns item and name') }}</q-item-section>
            </q-item>
            <q-item
              @click="onSetRowColMode(0)"
              :disable="pvc.rowColMode === 0"
              clickable
              >
              <q-item-section avatar>
                <q-icon color="primary" name="mdi-view-module-outline" />
              </q-item-section>
              <q-item-section>{{ $t('Table view: always show rows and columns item') }}</q-item-section>
            </q-item>
          </template>

          <template v-if="ctrl.formatOpts && ctrl.formatOpts.isFloat">
            <q-item
              @click="onShowMoreFormat"
              :disable="!ctrl.formatOpts.isDoMore"
              clickable
              >
              <q-item-section avatar>
                <q-icon color="primary" name="mdi-decimal-increase" />
              </q-item-section>
              <q-item-section>{{ $t('Increase precision') }}</q-item-section>
            </q-item>
            <q-item
              @click="onShowLessFormat"
              :disable="!ctrl.formatOpts.isDoLess"
              clickable
              >
              <q-item-section avatar>
                <q-icon color="primary" name="mdi-decimal-decrease" />
              </q-item-section>
              <q-item-section>{{ $t('Decrease precision') }}</q-item-section>
            </q-item>
          </template>
          <q-item
            v-if="ctrl.formatOpts && ctrl.formatOpts.isRawUse"
            @click="onToggleRawValue"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-loupe" />
            </q-item-section>
            <q-item-section>{{ !ctrl.formatOpts.isRawValue ? $t('Show raw source value') : $t('Show formatted value') }}</q-item-section>
          </q-item>
          <q-item
            @click="onShowItemNames"
            :disable="isScalar"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-label-outline" />
            </q-item-section>
            <q-item-section>{{ pvc.isShowNames ? $t('Show labels') : $t('Show names') }}</q-item-section>
          </q-item>

          <q-separator />

          <q-item
            @click="onSaveDefaultView"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-content-save-cog" />
            </q-item-section>
            <q-item-section>{{ $t('Save microdata view as default view of') + ' ' + entityName }}</q-item-section>
          </q-item>
          <q-item
            @click="onReloadDefaultView"
            clickable
            >
            <q-item-section avatar>
              <q-icon color="primary" name="mdi-cog-refresh-outline" />
            </q-item-section>
            <q-item-section>{{ $t('Reset microdata view to default and reload') + ' ' + entityName }}</q-item-section>
          </q-item>

        </q-list>
      </q-menu>
    </q-btn>

    <!-- end of menu -->

    <q-btn
      @click="doShowEntityNote"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      icon="mdi-information"
      :title="$t('About') + ' ' + entityName"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <template v-if="isPages">
      <q-btn
        @click="isHidePageControls = !isHidePageControls"
        :flat="isHidePageControls"
        :outline="!isHidePageControls"
        dense
        :class="isHidePageControls ? 'bar-button-on' : 'bar-button-off'"
        class="col-auto rounded-borders q-mr-xs"
        icon="mdi-unfold-more-vertical"
        :title="!isHidePageControls ? $t('Hide pagination controls') : $t('Show pagination controls')"
        />
      <template v-if="!isHidePageControls">
        <q-btn
          @click="onFirstPage"
          :disable="pageStart === 0"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-page-first"
          :title="$t('First page')"
          />
        <q-btn
          @click="onPrevPage"
          :disable="pageStart === 0"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-chevron-left"
          :title="$t('Previous page')"
          />
        <div
          class="page-start-item rounded-borders om-text-secondary q-px-xs q-py-xs q-mr-xs"
          :title="$t('Position')"
          >{{ (!!pageStart && typeof pageStart === typeof 1) ? pageStart.toLocaleString() : pageStart }}</div>
        <q-btn
          @click="onNextPage"
          :disable="isLastPage"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-chevron-right"
          :title="$t('Next page')"
          />
        <q-btn
          @click="onLastPage"
          :disable="isLastPage"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-page-last"
          :title="$t('Last page')"
          />
        <q-select
          v-model="pageSize"
          @input="onPageSize"
          :options="[10, 40, 100, 200, 400, 1000, 2000, 4000, 10000, 20000, 0]"
          :option-label="(val) => (!val || typeof val !== typeof 1 || val <= 0) ? $t('All') : val.toLocaleString()"
          outlined
          options-dense
          dense
          :label="$t('Size')"
          class="col-auto"
          style="min-width: 6rem"
          >
        </q-select>
      </template>
      <q-separator vertical inset spaced="sm" color="secondary" />
    </template>

    <q-btn
      @click="onCopyToClipboard"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-content-copy"
      :title="$t('Copy tab separated values to clipboard: ') + 'Ctrl+C'"
      />
    <q-btn
      @click="onDownload"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      icon="mdi-download"
      :title="$t('Download') + ' '  + entityName + ' ' + $t('as CSV')"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="onToggleRowColControls"
      :disable="!ctrl.isRowColModeToggle"
      :flat="ctrl.isRowColControls"
      :outline="!ctrl.isRowColControls"
      dense
      :class="{ 'bar-button-on' : ctrl.isRowColControls, 'bar-button-off' : !ctrl.isRowColControls, 'q-mr-xs' : ctrl.isRowColModeToggle || ctrl.formatOpts }"
      class="col-auto rounded-borders"
      icon="mdi-tune"
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
          @click="onSetRowColMode(3)"
          :disable="pvc.rowColMode === 3"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-view-compact-outline"
          :title="$t('Table view: always show rows and columns item and name')"
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

    <template v-if="ctrl.formatOpts && ctrl.formatOpts.isFloat">
      <q-btn
        @click="onShowMoreFormat"
        :disable="!ctrl.formatOpts.isDoMore"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-decimal-increase"
        :title="$t('Increase precision')"
        />
      <q-btn
        @click="onShowLessFormat"
        :disable="!ctrl.formatOpts.isDoLess"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-decimal-decrease"
        :title="$t('Decrease precision')"
        />
    </template>
    <q-btn
      v-if="ctrl.formatOpts && ctrl.formatOpts.isRawUse"
      @click="onToggleRawValue"
      :flat="!ctrl.formatOpts.isRawValue"
      :outline="ctrl.formatOpts.isRawValue"
      dense
      :class="!ctrl.formatOpts.isRawValue ? 'bar-button-on' : 'bar-button-off'"
      class="col-auto rounded-borders"
      icon="mdi-loupe"
      :title="!ctrl.formatOpts.isRawValue ? $t('Show raw source value') : $t('Show formatted value')"
      />
    <q-btn
      @click="onShowItemNames"
      :disable="isScalar"
      :flat="!pvc.isShowNames"
      :outline="pvc.isShowNames"
      dense
      :class="!pvc.isShowNames ? 'bar-button-on' : 'bar-button-off'"
      class="col-auto rounded-borders q-ml-xs"
      icon="mdi-label-outline"
      :title="pvc.isShowNames ? $t('Show labels') : $t('Show names')"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="onSaveDefaultView"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-content-save-cog"
      :title="$t('Save microdata view as default view of') + ' ' + entityName"
      />
    <q-btn
      @click="onReloadDefaultView"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-cog-refresh-outline"
      :title="$t('Reset microdata view to default and reload') + ' ' + entityName"
      />

    <div
      class="col-auto"
      >
      <span>{{ entityName }}<br />
      <span class="om-text-descr">{{ entityDescr }}</span></span>
    </div>

    </q-toolbar>

  </div>
  <!-- end of output table header -->

  <!-- pivot table controls and view -->
  <div class="q-mx-sm">

    <div v-show="ctrl.isRowColControls"
      class="other-panel"
      >
      <draggable
        v-model="otherFields"
        group="fields"
        :disabled="isOtherDropDisabled"
        @start="onDrag"
        @end="onDrop"
        @choose="onChoose"
        @unchoose="onUnchoose"
        class="other-fields other-drag"
        :class="{'drag-area-hint': isDragging, 'drag-area-disabled': isOtherDropDisabled}"
        >
        <div v-for="f in otherFields" :key="f.name" :id="'item-draggable-' + f.name" class="field-drag om-text-medium">
          <q-select
            v-model="f.singleSelection"
            :options="f.options"
            :option-label="pvc.isShowNames ? 'name' : 'label'"
            @input="onSelectInput('other', f.name, f.singleSelection)"
            use-input
            hide-selected
            @filter="f.filter"
            :label="selectLabel(pvc.isShowNames, f)"
            outlined
            dense
            options-dense
            bottom-slots
            class="other-select"
            options-selected-class="option-selected"
            :title="$t('Select') + ' ' + (pvc.isShowNames ? f.name : f.label)"
            >
            <template v-slot:before>
              <q-icon
                name="mdi-hand-back-left"
                size="xs"
                class="bg-primary text-white rounded-borders select-handle-move"
                :title="$t('Drag and drop')"
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
                <span class="col ellipsis">{{ pvc.isShowNames ? f.name : f.label }}</span>
                <span class="col-auto text-no-wrap">{{ f.selection ? f.selection.length : 0 }} / {{ f.enums ? f.enums.length : 0 }}</span>
              </div>
            </template>
          </q-select>
        </div>
      </draggable>
      <q-tooltip anchor="center right" content-class="om-tooltip">{{ $t('Slicer dimensions') }}</q-tooltip>
    </div>

    <div v-show="ctrl.isRowColControls"
      class="col-panel"
      >
      <draggable
        v-model="colFields"
        group="fields"
        @start="onDrag"
        @end="onDrop"
        @choose="onChoose"
        @unchoose="onUnchoose"
        class="col-fields col-drag"
        :class="{'drag-area-hint': isDragging}"
        >
        <div v-for="f in colFields" :key="f.name" :id="'item-draggable-' + f.name" class="field-drag om-text-medium">
          <template v-if="f.name == 'ENTITY_KEY_DIM'">
            <div
              class="row nowrap col-select"
              :title="pvc.isShowNames ? f.name : f.label"
              >
                <q-icon
                  name="mdi-hand-back-left"
                  size="md"
                  class="col-1 q-px-sm q-mr-sm bg-primary text-white rounded-borders select-handle-move"
                  :title="$t('Drag and drop')"
                  />
                <div id="key-dim-box" class="col-auto om-text-secondary om-text-body2 q-px-sm rounded-borders">
                  <span>{{ (pvc.isShowNames ? f.name : f.label) }}: </span><span class="key-dim-count">{{ f.selection.length.toLocaleString() }}</span>
                </div>
            </div>
          </template>
          <template v-else>
            <q-select
              v-model="f.selection"
              :options="f.options"
              :option-label="pvc.isShowNames ? 'name' : 'label'"
              @input="onSelectInput('col', f.name, f.selection)"
              use-input
              hide-selected
              @filter="f.filter"
              :label="selectLabel(pvc.isShowNames, f)"
              multiple
              outlined
              dense
              options-dense
              bottom-slots
              class="col-select"
              options-selected-class="option-selected"
              :title="$t('Select') + ' ' + (pvc.isShowNames ? f.name : f.label)"
              >
              <template v-slot:before>
                <q-icon
                  name="mdi-hand-back-left"
                  size="xs"
                  class="bg-primary text-white rounded-borders select-handle-move"
                  :title="$t('Drag and drop')"
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
                  <span class="col ellipsis">{{ pvc.isShowNames ? f.name : f.label }}</span>
                  <span class="col-auto text-no-wrap">{{ f.selection ? f.selection.length : 0 }} / {{ f.enums ? f.enums.length : 0 }}</span>
                </div>
              </template>
            </q-select>
          </template>
        </div>
      </draggable>
      <q-tooltip anchor="center right" content-class="om-tooltip">{{ $t('Column dimensions') }}</q-tooltip>
    </div>

    <div class="pv-panel">

      <draggable
        v-show="ctrl.isRowColControls"
        v-model="rowFields"
        group="fields"
        @start="onDrag"
        @end="onDrop"
        @choose="onChoose"
        @unchoose="onUnchoose"
        class="row-fields row-drag"
        :class="{'drag-area-hint': isDragging}"
        >
        <div v-for="f in rowFields" :key="f.name" :id="'item-draggable-' + f.name" class="field-drag om-text-medium">
          <template v-if="f.name == 'ENTITY_KEY_DIM'">
            <div
              class="row nowrap col-select"
              :title="pvc.isShowNames ? f.name : f.label"
              >
                <q-icon
                  name="mdi-hand-back-left"
                  size="md"
                  class="col-1 q-px-sm q-mr-sm bg-primary text-white rounded-borders select-handle-move"
                  :title="$t('Drag and drop')"
                  />
                <div id="key-dim-box" class="col-auto om-text-secondary om-text-body2 q-px-sm rounded-borders">
                  <span>{{ (pvc.isShowNames ? f.name : f.label) }}: </span><span class="key-dim-count">{{ f.selection.length.toLocaleString() }}</span>
                </div>
            </div>
          </template>
          <template v-else>
            <q-select
              v-model="f.selection"
              :name="f.name"
              :options="f.options"
              :option-label="pvc.isShowNames ? 'name' : 'label'"
              @input="onSelectInput('row', f.name, f.selection)"
              use-input
              hide-selected
              @filter="f.filter"
              :label="selectLabel(pvc.isShowNames, f)"
              multiple
              outlined
              dense
              options-dense
              bottom-slots
              class="row-select"
              options-selected-class="option-selected"
              :title="$t('Select') + ' ' + (pvc.isShowNames ? f.name : f.label)"
              >
              <template v-slot:before>
                <q-icon
                  name="mdi-hand-back-left"
                  size="xs"
                  class="bg-primary text-white rounded-borders select-handle-move"
                  :title="$t('Drag and drop')"
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
                  <span class="col ellipsis">{{ pvc.isShowNames ? f.name : f.label }}</span>
                  <span class="col-auto text-no-wrap">{{ f.selection ? f.selection.length : 0 }} / {{ f.enums ? f.enums.length : 0 }}</span>
                </div>
              </template>
            </q-select>
          </template>
        </div>
        <q-tooltip content-class="om-tooltip">{{ $t('Row dimensions') }}</q-tooltip>
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
        @pv-key-pos="onPvKeyPos"
        >
      </pv-table>

    </div>

  </div>
  <!-- end of pivot table controls and view -->

  <refresh-run v-if="(digest || '') !== '' && (runDigest || '') !== ''"
    :model-digest="digest"
    :run-digest="runDigest"
    :refresh-tickle="refreshTickle"
    :refresh-run-tickle="refreshRunTickle"
    @done="loadRunWait = false"
    @wait="loadRunWait = true"
    >
  </refresh-run>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runDigest"></run-info-dialog>
  <entity-info-dialog :show-tickle="entityInfoTickle" :entity-name="entityName" :run-digest="runDigest"></entity-info-dialog>

  <q-inner-loading :showing="loadWait || loadRunWait">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>
</template>

<script src="./entity-page.js"></script>

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
  .page-start-item {
    background: rgba(0, 0, 0, 0.1);
    min-width: 2rem;
    text-align: center;
  }
  .drag-area {
    min-height: 2.5rem;
    padding: 0.125rem;
    border: 1px dashed grey;
  }
  .drag-area-hint {
    background-color: whitesmoke;
  }
  .drag-area-disabled {
    background-color: lightgrey;
    opacity: 0.5;
    border: 1px solid red;
  }
  .sortable-ghost {
    opacity: 0.5;
  }
  .top-col-drag {
    @extend .flex-item;
    @extend .drag-area;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    width: 100%;
  }
  .col-drag {
    @extend .top-col-drag;
    border-top-style: none;
  }
  .other-drag {
    @extend .top-col-drag;
  }
  .row-drag {
    @extend .flex-item;
    @extend .drag-area;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: flex-start;
    border-top-style: none;
  }

  .field-drag {
    display: inline-block;
    margin-left: 0.25rem;
    padding: 0.25rem;
    &:hover {
      cursor: move;
    }
  }

  #key-dim-box {
    min-width: 14rem;
    line-height: 2.5rem;
    border: 1px solid lightgray;
  }
  .key-dim-count  {
    float: right;
    line-height: 2.5rem;
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

  .bar-button-on {
    background-color: $primary;
    color: white;
  }
  .bar-button-off {
    color: $primary;
  }

  .upload-right {
    text-align: right;
  }
  .upload-max-width-10 {
    max-width: 10rem;
  }
</style>
