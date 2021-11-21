<template>

<div class="text-body1">

  <q-card v-if="isNotEmptyRunCurrent" class="q-ma-sm">

    <div
      class="row reverse-wrap items-center"
      >

      <span class="col-auto no-wrap tab-switch-container q-ml-sm">
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
        :disable="noteEditorShow"
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

    <markdown-editor
      v-if="noteEditorShow"
      :the-key="noteEditorLangCode"
      :the-name="runCurrent.Name"
      :the-descr="runCurrentDescr()"
      :the-note="runCurrentNote()"
      :description-editable="true"
      :notes-editable="true"
      :lang-code="noteEditorLangCode"
      @cancel-note="onCancelRunNote"
      @save-note="onSaveRunNote"
      class="q-px-sm q-pt-none"
    >
    </markdown-editor>

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
        :no-nodes-label="$t('Server offline or no model runs published')"
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
              @click.stop="onCompareClick(prop.node.digest)"
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
              icon="mdi-file-download-outline"
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

  <q-inner-loading :showing="loadWait || loadRunWait">
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
