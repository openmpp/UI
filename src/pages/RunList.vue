<template>

<div class="text-body1">

  <q-card v-if="isNotEmptyRunCurrent" class="q-ma-sm">

    <div
      class="row reverse-wrap items-center"
      >

      <template v-if="isCompare">
        <q-btn
          :disable="isNewWorksetDisabled()"
          @click="onNewWorksetClick"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-ml-sm q-mr-xs"
          icon="mdi-notebook-plus"
          :title="paramDiff.length > 0 ? ($t('Create new input scenario with {count} parameter(s) from', { count: paramDiff.length }) + ': ' + runCompare.Name) : $t('Create new input scenario')"
          />
        <q-separator vertical inset color="secondary" />
      </template>

      <span class="col-auto no-wrap tab-switch-container q-ml-xs">
        <q-btn
          @click="onToogleShowParamTree"
          no-caps
          unelevated
          dense
          color="primary"
          class="rounded-borders tab-switch-button"
          :class="{ 'om-bg-inactive' : !isParamTreeShow }"
          >
          <q-icon :name="isParamTreeShow ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
          <span>{{ $t('Parameters') }}</span>
          <q-badge outline class="q-ml-sm q-mr-xs">{{ paramVisibleCount }}</q-badge>
          <q-separator
            vertical dark v-if="isCompare && paramDiff.length > 0"
            />
          <span
            v-if="isCompare && paramDiff.length > 0"
            >
            <q-icon name="mdi-not-equal-variant"/><q-badge outline class="q-mx-xs">{{ paramDiff.length }}</q-badge>
          </span>
        </q-btn>
      </span>

      <span class="col-auto no-wrap q-mr-xs">
        <q-btn
          :disable="!isSuccess(runCurrent.Status)"
          @click="onToogleShowTableTree"
          no-caps
          unelevated
          dense
          color="primary"
          class="rounded-borders tab-switch-button"
          :class="{ 'om-bg-inactive' : !isTableTreeShow }"
          >
          <q-icon :name="isTableTreeShow ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
          <span>{{ $t('Output Tables') }}</span>
          <q-badge outline class="q-ml-sm q-mr-xs">{{ tableVisibleCount }}</q-badge>
          <q-separator
            vertical dark v-if="isCompare && tableDiff.length > 0"
            />
          <span
            v-if="isCompare && tableDiff.length > 0"
            >
            <q-icon name="mdi-not-equal-variant"/><q-badge outline class="q-mx-xs">{{ tableDiff.length }}</q-badge>
          </span>
        </q-btn>
      </span>

      <q-btn
        @click="doShowRunNote(runDigestSelected)"
        flat
        dense
        class="col-auto text-white rounded-borders q-mr-xs"
        :class="(isSuccess(runCurrent.Status) || isInProgress(runCurrent.Status)) ? 'bg-primary' : 'bg-warning'"
        :icon="isSuccess(runCurrent.Status) ? 'mdi-information' : (isInProgress(runCurrent.Status) ? 'mdi-run' : 'mdi-alert-circle-outline')"
        :title="$t('About') + ' ' + runCurrent.Name"
        />

      <q-btn
        :disable="isShowNoteEditor || isCompare"
        @click="onEditRunNote(runDigestSelected)"
        flat
        dense
        class="col-auto text-white rounded-borders q-mr-xs"
        :class="(isSuccess(runCurrent.Status) || isInProgress(runCurrent.Status)) ? 'bg-primary' : 'bg-warning'"
        icon="mdi-file-document-edit-outline"
        :title="$t('Edit notes for') + ' ' + runCurrent.Name"
        />

      <transition
        enter-active-class="animated fadeIn"
        leave-active-class="animated fadeOut"
        mode="out-in"
        >
        <div
          :key="runDigestSelected"
          class="col-auto"
          >
          <span>{{ runCurrent.Name }}<br />
          <span class="om-text-descr"><span class="mono">{{ dateTimeStr(runCurrent.UpdateDateTime) }} </span>{{ descrRunCurrent }}</span></span>
        </div>
      </transition>

    </div>

    <q-card-section v-show="isParamTreeShow" class="q-px-sm q-pt-none">

      <run-parameter-list
        :run-digest="runDigestSelected"
        :refresh-tickle="refreshTickle"
        :refresh-param-tree-tickle="refreshParamTreeTickle"
        :name-filter="paramDiff"
        in-list-icon="mdi-not-equal-variant"
        in-list-on-label="Show only different parameters"
        in-list-off-label="Show all parameters"
        @run-parameter-select="onRunParamClick"
        @run-parameter-info-show="doShowParamNote"
        @run-parameter-group-info-show="doShowGroupNote"
        @run-parameter-tree-updated="onParamTreeUpdated"
        >
      </run-parameter-list>

    </q-card-section>

    <q-card-section v-show="isTableTreeShow" class="q-px-sm q-pt-none">

      <table-list
        :run-digest="runDigestSelected"
        :refresh-tickle="refreshTickle"
        :refresh-table-tree-tickle="refreshTableTreeTickle"
        :name-filter="tableDiff"
        in-list-icon="mdi-not-equal-variant"
        in-list-on-label="Show only different output tables"
        in-list-off-label="Show all output tables"
        @table-select="onTableLeafClick"
        @table-info-show="doShowTableNote"
        @table-group-info-show="doShowGroupNote"
        @table-tree-updated="onTableTreeUpdated"
        >
      </table-list>

    </q-card-section>

  </q-card>

  <q-card
    v-if="isNewWorksetShow"
    bordered
    class="border-025 q-ma-sm"
    >
    <new-workset
      @save-new-set="onNewWorksetSave"
      @cancel-new-set="onNewWorksetCancel"
      class="q-pa-sm"
      >
    </new-workset>
  </q-card>

  <q-card
    v-if="isShowNoteEditor"
    bordered
    class="border-025 q-ma-sm"
    >
    <q-card-section class="q-pa-sm">

      <div class="row items-center full-width">
        <div class="col section-title bg-primary text-white q-pl-md"><span>{{ $t('Description and Notes') }}</span></div>
      </div>

      <markdown-editor
        v-if="isShowNoteEditor"
        :the-key="noteEditorLangCode"
        :the-name="runCurrent.Name"
        :the-descr="runCurrentDescr()"
        :the-note="runCurrentNote()"
        :description-editable="true"
        :notes-editable="true"
        :lang-code="noteEditorLangCode"
        @cancel-note="onCancelRunNote"
        @save-note="onSaveRunNote"
        class="q-pa-sm"
      >
      </markdown-editor>

    </q-card-section>
  </q-card>

  <q-card class="q-ma-sm">
    <div class="row items-center full-width q-pt-sm q-px-sm">

      <q-btn
        v-if="isAnyRunGroup"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
        :icon="isRunTreeCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
        :title="isRunTreeCollapsed ? $t('Expand all') : $t('Collapse all')"
        @click="doToogleExpandRunTree"
        />
      <span class="col-grow">
        <q-input
          ref="runFilterInput"
          debounce="500"
          v-model="runFilter"
          outlined
          dense
          :placeholder="$t('Find model run...')"
          >
          <template v-slot:append>
            <q-icon v-if="runFilter !== ''" name="cancel" class="cursor-pointer" @click="resetRunFilter" />
            <q-icon v-else name="search" />
          </template>
        </q-input>
      </span>

    </div>

    <div class="q-pa-sm">
      <q-tree
        ref="runTree"
        default-expand-all
        :nodes="runTreeData"
        node-key="key"
        :filter="runFilter"
        :filter-method="doRunTreeFilter"
        :no-results-label="$t('No model runs found')"
        :no-nodes-label="$t('No model runs published or server offline')"
        >
        <template v-slot:default-header="prop">

          <div
            v-if="prop.node.children && prop.node.children.length"
            class="row no-wrap items-center"
            >
            <div class="col">
              <span>{{ prop.node.label }}<br />
              <span class="om-text-descr">{{ prop.node.descr }}</span></span>
            </div>
          </div>

          <div v-else
            @click="onRunLeafClick(prop.node.digest)"
            class="row no-wrap items-center full-width cursor-pointer om-tree-leaf"
            :class="{ 'text-primary' : prop.node.digest === runDigestSelected }"
            >
            <q-btn
              @click.stop="doShowRunNote(prop.node.digest)"
              flat
              round
              dense
              :color="(isSuccess(prop.node.status) || isInProgress(prop.node.status)) ? 'primary' : 'warning'"
              class="col-auto"
              :icon="isSuccess(prop.node.status) ? 'mdi-information-outline' : (isInProgress(prop.node.status) ? 'mdi-run' : 'mdi-alert-circle-outline')"
              :title="$t('About') + ' ' + prop.node.label"
              />
            <q-btn
              :disable="!prop.node.stamp"
              @click.stop="doRunLogClick(prop.node.stamp)"
              flat
              round
              dense
              :color="!!prop.node.stamp ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-text-long"
              :title="$t('Run Log') + ': ' + prop.node.label"
              />
            <q-btn
              :disable="!isSuccess(prop.node.status) || prop.node.digest === runDigestSelected"
              @click.stop="onRunCompareClick(prop.node.digest)"
              flat
              round
              dense
              class="col-auto"
              :class="(!isSuccess(prop.node.status) || prop.node.digest === runDigestSelected) ? 'text-secondary' : (prop.node.digest !== runCompare.RunDigest ? 'text-primary' : 'text-white bg-primary')"
              icon="mdi-not-equal-variant"
              :title="(prop.node.digest !== runCompare.RunDigest ? $t('Compare this model run with') : $t('Clear run comparison with')) + ' ' + runCurrent.Name"
              />
            <q-btn
              :disable="!prop.node.digest || isInProgress(prop.node.status)"
              @click.stop="onRunDelete(prop.node.label, prop.node.digest)"
              flat
              round
              dense
              :color="(prop.node.digest && !isInProgress(prop.node.status)) ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-delete-outline"
              :title="$t('Delete') + ': ' + prop.node.label"
              />
            <q-btn
              v-if="serverConfig.AllowDownload"
              :disable="!isSuccess(prop.node.status)"
              @click.stop="onDownloadRun(prop.node.digest)"
              flat
              round
              dense
              :color="isSuccess(prop.node.status) ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-download-circle-outline"
              :title="$t('Download') + ' ' + prop.node.label"
              />
            <div class="col">
              <span>{{ prop.node.label }}<br />
              <span
                :class="prop.node.digest === runDigestSelected ? 'om-text-descr-selected' : 'om-text-descr'"
                >
                <span class="mono">{{ prop.node.lastTime }} </span>{{ prop.node.descr }}</span></span>
            </div>
          </div>

        </template>
      </q-tree>
    </div>
  </q-card>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runInfoDigest"></run-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :run-digest="runDigestSelected"></parameter-info-dialog>
  <table-info-dialog :show-tickle="tableInfoTickle" :table-name="tableInfoName" :run-digest="runDigestSelected"></table-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <refresh-run v-if="(digest || '') !== '' && (runDigestRefresh || '') !== ''"
    :model-digest="digest"
    :run-digest="this.runDigestRefresh"
    :refresh-tickle="refreshTickle"
    :refresh-run-tickle="refreshRunTickle"
    @done="doneRunLoad"
    @wait="loadRunWait = true"
    >
  </refresh-run>
  <delete-confirm-dialog
    @delete-yes="onYesRunDelete"
    :show-tickle="showDeleteDialogTickle"
    :item-name="runNameToDelete"
    :item-id="runDigestToDelete"
    :dialog-title="$t('Delete model run') + '?'"
    >
  </delete-confirm-dialog>

  <create-workset
    :create-now="isCreateWorksetNow"
    :model-digest="digest"
    :new-name="nameOfNewWorkset"
    :current-run-digest="runCompare.RunDigest"
    :copy-from-run="copyParamNewWorkset"
    :descr-notes="newDescrNotes"
    @done="doneWorksetCreate"
    @wait="loadWorksetCreate = true"
    >
  </create-workset>

  <q-inner-loading :showing="loadWait || loadRunWait || loadWorksetCreate">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>
</template>

<script src="./run-list.js"></script>

<style lang="scss" scope="local">
  .tab-switch-container {
    margin-right: 1px;
  }
  .tab-switch-button {
    border-top-right-radius: 1rem;
  }
  .tab-compare-boder {
    border-width: 1px;
    border-style: solid;
    border-color: currentColor;
  }
</style>
