<template>
<div class="text-body1">

  <q-card v-if="isNotEmptyWorksetCurrent" class="q-ma-sm">

    <div
      class="row reverse-wrap items-center"
      >

      <q-btn
        :disable="isEdit()"
        @click="onNewWorksetClick"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-ml-sm"
        icon="mdi-notebook-plus"
        :title="$t('Create new input scenario')"
       />
      <template v-if="serverConfig.AllowUpload">
        <q-btn
          @click="doShowFileSelect()"
          v-show="!uploadFileSelect"
          flat
          dense
          class="col-auto text-white rounded-borders q-ml-xs bg-primary text-white rounded-borders"
          icon='mdi-cloud-upload'
          :title="$t('Upload scenario .zip')"
          />
        <q-btn
          @click="doCancelFileSelect()"
          v-show="uploadFileSelect"
          flat
          dense
          class="col-auto text-white rounded-borders q-ml-xs bg-primary text-white rounded-borders"
          icon='mdi-close-circle'
          :title="$t('Cancel upload')"
          />
      </template>
      <q-separator vertical inset spaced="sm" color="secondary" />

      <span class="col-auto no-wrap q-mr-xs">
        <q-btn
          :disable="isShowNoteEditor || isNewWorksetShow"
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
          <q-badge outline class="q-ml-sm q-mr-xs">{{ paramTreeCount }}</q-badge>
        </q-btn>
      </span>

      <q-btn
        @click="doShowWorksetNote(worksetNameSelected)"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-information"
        :title="$t('About') + ' ' + worksetNameSelected"
        />
      <q-btn
        :disable="isReadonlyWorksetCurrent || isEdit()"
        @click="onShowNoteEditor"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        icon="mdi-file-document-edit-outline"
        :title="$t('Edit notes for') + ' ' + worksetNameSelected"
        />
      <q-separator vertical inset spaced="sm" color="secondary" />

      <q-btn
        :disable="isEdit() || isReadonlyWorksetCurrent || !isRunSuccess"
        @click="onFromRunShow"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-table-arrow-left"
        :title="$t('Copy parameters from model run') + (isRunSuccess ? ': ' + runCurrent.Name : '')"
       />
      <q-btn
        :disable="isEdit() || isReadonlyWorksetCurrent || !isNotEmptyFrom || !isReadonlyFrom"
        @click="onFromWorksetShow"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        icon="mdi-table-plus"
        :title="$t('Copy parameters from scenario') + ': ' + ((worksetNameFrom && worksetNameFrom !== worksetNameSelected) ? worksetNameFrom : $t('Source scenario not selected'))"
       />
      <q-separator vertical inset spaced="sm" color="secondary" />

      <q-btn
        @click="onNewRunClick(worksetNameSelected)"
        :disable="!isReadonlyWorksetCurrent"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-run"
        :title="$t('Run the Model')"
        />
      <q-btn
        @click="onWorksetReadonlyToggle"
        :disable="isEdit() || !isNotEmptyWorksetCurrent"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        :icon="(!isNotEmptyWorksetCurrent || isReadonlyWorksetCurrent) ? 'mdi-lock' : 'mdi-lock-open-variant'"
        :title="((!isNotEmptyWorksetCurrent || isReadonlyWorksetCurrent) ? $t('Open to edit scenario') : $t('Close to run scenario')) + ' ' + worksetCurrent.Name"
        />

      <transition
        enter-active-class="animated fadeIn"
        leave-active-class="animated fadeOut"
        mode="out-in"
        >
        <div
          :key="worksetNameSelected"
          class="col-auto"
          >
          <span>{{ worksetNameSelected }}<br />
          <span class="om-text-descr"><span class="mono">{{ dateTimeStr(worksetCurrent.UpdateDateTime) }} </span>{{ descrWorksetCurrent }}</span></span>
        </div>
      </transition>
    </div>

    <q-card-section
      v-show="isParamTreeShow"
      class="q-px-sm q-pt-none"
      >
      <workset-parameter-list
        :workset-name="worksetNameSelected"
        :refresh-tickle="refreshTickle"
        :refresh-param-tree-tickle="refreshParamTreeTickle"
        :is-remove="true"
        :is-remove-group="true"
        :is-remove-disabled="isReadonlyWorksetCurrent"
        @set-parameter-select="onWorksetParamClick"
        @set-parameter-info-show="doParamNoteWorksetCurrent"
        @set-parameter-group-info-show="doShowGroupNote"
        @set-parameter-tree-updated="onParamTreeUpdated"
        @set-parameter-remove="onParamDelete"
        @set-parameter-group-remove="onParamGroupDelete"
        >
      </workset-parameter-list>

    </q-card-section>

  </q-card>

  <q-card
    v-if="isFromRunShow"
    bordered
    class="border-025 q-ma-sm"
    >
    <div class="row items-center full-width q-pa-sm">
      <q-btn
        @click="onFromRunHide"
        flat
        dense
        class="col-auto section-title-button bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-close-circle"
        :title="$t('Close')"
        />
      <div
        class="col-grow section-title bg-primary text-white q-px-md"
        :class="{ 'om-bg-inactive': isReadonlyWorksetCurrent || !isRunSuccess }"
        >
        <span>{{ $t('Copy parameters from model run') + (isRunSuccess ? ': ' + runCurrent.Name : '') }}</span>
      </div>
    </div>

    <q-card-section
      v-show="!isReadonlyWorksetCurrent && isRunSuccess"
      class="q-pa-sm"
      >
      <run-parameter-list
        :run-digest="runDigestSelected"
        :refresh-tickle="refreshTickle"
        :is-add="true"
        :is-add-group="true"
        @run-parameter-add="onParamRunCopy"
        @run-parameter-group-add="onParamGroupRunCopy"
        @run-parameter-info-show="doParamNoteRun"
        @run-parameter-group-info-show="doShowGroupNote"
        >
      </run-parameter-list>
    </q-card-section>

  </q-card>

  <q-card
    v-if="isFromWorksetShow"
    bordered
    class="border-025 q-ma-sm"
    >

    <div class="row items-center full-width q-pa-sm">
      <q-btn
        @click="onFromWorksetHide"
        flat
        dense
        class="col-auto section-title-button bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-close-circle"
        :title="$t('Close')"
        />
      <div
        class="col-grow section-title bg-primary text-white q-px-md"
        :class="{ 'om-bg-inactive': isReadonlyWorksetCurrent || !isNotEmptyFrom || !isReadonlyFrom || !worksetNameFrom || worksetNameFrom === worksetNameSelected }"
        >
        <span>{{ $t('Copy parameters from input scenario') + ((worksetNameFrom && worksetNameFrom !== worksetNameSelected) ? ': ' + worksetNameFrom : $t('Source scenario not selected')) }}</span>
      </div>
    </div>

    <q-card-section
      v-show="!isReadonlyWorksetCurrent && isNotEmptyFrom && isReadonlyFrom && worksetNameFrom && worksetNameFrom !== worksetNameSelected"
      class="q-pa-sm"
      >
      <workset-parameter-list
        :workset-name="worksetNameFrom"
        :refresh-tickle="refreshTickle"
        :refresh-param-tree-tickle="refreshParamTreeFromTickle"
        :is-add="true"
        :is-add-group="true"
        @set-parameter-add="onParamWorksetCopy"
        @set-parameter-group-add="onParamGroupWorksetCopy"
        @set-parameter-info-show="doParamNoteWorksetFrom"
        @set-parameter-group-info-show="doShowGroupNote"
        >
      </workset-parameter-list>
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

  <q-card v-if="uploadFileSelect">
    <div class="row q-mt-xs q-pa-sm">
      <q-btn
        @click="onUploadWorkset"
        v-if="uploadFileSelect"
        :disable="!fileSelected"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        icon="mdi-upload"
        :title="$t('Upload scenario .zip')"
        />
      <q-file
        v-model="uploadFile"
        v-if="uploadFileSelect"
        accept='.zip'
        outlined
        dense
        clearable
        hide-bottom-space
        class="col q-pl-xs"
        color="primary"
        :label="$t('Select input scenario .zip for upload')"
        >
      </q-file>
    </div>
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
        :the-name="worksetNameSelected"
        :description-editable="!isReadonlyWorksetCurrent"
        :the-descr="descrWorksetCurrent"
        :descr-prompt="$t('Input scenario description')"
        :notes-editable="!isReadonlyWorksetCurrent"
        :the-note="noteCurrent"
        :note-prompt="$t('Input scenario notes')"
        :lang-code="noteEditorLangCode"
        @save-note="onSaveNoteEditor"
        @cancel-note="onCancelNoteEditor"
        class="q-pa-sm"
        >
      </markdown-editor>

    </q-card-section>
  </q-card>

  <q-card class="q-ma-sm">
    <div class="row items-center full-width q-pt-sm q-px-sm">

      <q-btn
        v-if="isAnyGroup"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
        :icon="isTreeCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
        :title="isTreeCollapsed ? $t('Expand all') : $t('Collapse all')"
        @click="doToogleExpandTree"
        />
      <span class="col-grow">
        <q-input
          ref="filterInput"
          debounce="500"
          v-model="treeFilter"
          outlined
          dense
          :placeholder="$t('Find input scenario...')"
          >
          <template v-slot:append>
            <q-icon v-if="treeFilter !== ''" name="cancel" class="cursor-pointer" @click="resetFilter" />
            <q-icon v-else name="search" />
          </template>
        </q-input>
      </span>

    </div>

    <div class="q-pa-sm">
      <q-tree
        ref="worksetTree"
        default-expand-all
        :nodes="treeData"
        node-key="key"
        :filter="treeFilter"
        :filter-method="doTreeFilter"
        :no-results-label="$t('No input scenarios found')"
        :no-nodes-label="$t('Server offline or no input scenarios published')"
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
            @click="onWorksetLeafClick(prop.node.label)"
            class="row no-wrap items-center full-width om-tree-leaf"
            :class="[{ 'text-primary' : prop.node.label === worksetNameSelected }, isEdit() ? 'cursor-not-allowed' : 'cursor-pointer']"
            >
            <q-btn
              @click.stop="doShowWorksetNote(prop.node.label)"
              flat
              round
              dense
              color="primary"
              class="col-auto"
              icon="mdi-information-outline"
              :title="$t('About') + ' ' + prop.node.label"
              />
            <q-btn
              v-if="prop.node.label"
              :disable="!prop.node.isReadonly || prop.node.label === worksetNameSelected || isReadonlyWorksetCurrent"
              @click.stop="onWorksetFromClick(prop.node.label)"
              flat
              round
              dense
              class="col-auto"
              :class="(!prop.node.isReadonly || prop.node.label === worksetNameSelected || isReadonlyWorksetCurrent) ? 'text-secondary' : (prop.node.label !== worksetNameFrom ? 'text-primary' : 'text-white bg-primary')"
              icon="mdi-table-plus"
              :title="$t('Copy parameters from') + ': ' + prop.node.label"
              />
            <q-btn
              v-if="prop.node.label"
              :disable="!prop.node.isReadonly || isEdit()"
              @click.stop="onNewRunClick(prop.node.label)"
              flat
              round
              dense
              :color="(prop.node.isReadonly && !isEdit())? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-run"
              :title="$t('Run the Model')"
              />
            <q-btn
              v-if="prop.node.label"
              :disable="prop.node.isReadonly || isEdit()"
              @click.stop="onDeleteWorkset(prop.node.label)"
              flat
              round
              dense
              :color="(!prop.node.isReadonly && !isEdit())? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-delete-outline"
              :title="$t('Delete') + ': ' + prop.node.label"
              />
            <q-btn
              v-if="serverConfig.AllowDownload"
              :disable="!prop.node.isReadonly || isEdit()"
              @click.stop="onDownloadWorkset(prop.node.label)"
              flat
              round
              dense
              :color="(prop.node.isReadonly && !isEdit()) ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-download-circle-outline"
              :title="$t('Download') + ' ' + prop.node.label"
              />
            <div class="col">
              <span>{{ prop.node.label }}<br />
              <span
                :class="prop.node.label === worksetNameSelected ? 'om-text-descr-selected' : 'om-text-descr'"
                >
                <span class="mono">{{ prop.node.lastTime }} </span>{{ prop.node.descr }}</span></span>
            </div>
          </div>

        </template>
      </q-tree>
    </div>
  </q-card>

  <refresh-workset v-if="(digest || '') !== '' && (worksetNameSelected || '') !== ''"
    :model-digest="digest"
    :workset-name="worksetNameSelected"
    :refresh-tickle="refreshTickle"
    :refresh-workset-tickle="refreshWsTickle"
    @done="doneWsLoad"
    @wait="loadWsWait = true"
    >
  </refresh-workset>
  <refresh-workset v-if="(digest || '') !== '' && (worksetNameFrom || '') !== ''"
    :model-digest="digest"
    :workset-name="worksetNameFrom"
    :refresh-tickle="refreshTickle"
    :refresh-workset-tickle="refreshWsFromTickle"
    @done="doneWsFromLoad"
    @wait="loadWsWait = true"
    >
  </refresh-workset>

  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetInfoName"></workset-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetInfoName" :run-digest="runInfoDigest"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>

  <delete-workset
    :delete-now="isDeleteWorksetNow"
    :model-digest="digest"
    :workset-name="worksetNameToDelete"
    @done="doneDeleteWorkset"
    @wait="loadWorksetDelete = true"
    >
  </delete-workset>
  <delete-confirm-dialog
    @delete-yes="onYesDeleteWorkset"
    :show-tickle="showDeleteWorksetTickle"
    :item-name="worksetNameToDelete"
    :dialog-title="$t('Delete input scenario') + '?'"
    >
  </delete-confirm-dialog>

  <delete-confirm-dialog
    @delete-yes="onYesDeleteParameter"
    :show-tickle="showDeleteParameterTickle"
    :item-name="paramInfoName"
    :dialog-title="$t('Delete parameter from input scenario') + '?'"
    >
  </delete-confirm-dialog>
  <delete-confirm-dialog
    @delete-yes="onYesDeleteGroup"
    :show-tickle="showDeleteGroupTickle"
    :item-name="groupInfoName"
    :dialog-title="$t('Delete group from input scenario') + '?'"
    >
  </delete-confirm-dialog>

  <confirm-dialog
    @confirm-yes="onYesParamFromRun"
    :show-tickle="showParamFromRunTickle"
    :item-name="paramInfoName"
    :dialog-title="$t('Parameter already exist')"
    :body-text="$t('Replace')"
    :icon-name="'mdi-content-copy'"
    >
  </confirm-dialog>
  <confirm-dialog
    @confirm-yes="onYesParamFromWorkset"
    :show-tickle="showParamFromWorksetTickle"
    :item-name="paramInfoName"
    :dialog-title="$t('Parameter already exist')"
    :body-text="$t('Replace')"
    :icon-name="'mdi-content-copy'"
    >
  </confirm-dialog>
  <confirm-dialog
    @confirm-yes="onYesGroupFromRun"
    :show-tickle="showGroupFromRunTickle"
    :item-name="groupInfoName"
    :dialog-title="$t('Parameter(s) already exist')"
    :body-text="bodyMsg"
    :icon-name="'mdi-content-copy'"
    >
  </confirm-dialog>
  <confirm-dialog
    @confirm-yes="onYesGroupFromWorkset"
    :show-tickle="showGroupFromWorkTickle"
    :item-name="groupInfoName"
    :dialog-title="$t('Parameter(s) already exist')"
    :body-text="bodyMsg"
    :icon-name="'mdi-content-copy'"
    >
  </confirm-dialog>

  <create-workset
    :create-now="isCreateWorksetNow"
    :model-digest="digest"
    :new-name="nameOfNewWorkset"
    :descr-notes="newDescrNotes"
    @done="doneWorksetCreate"
    @wait="loadWorksetCreate = true"
    >
  </create-workset>

  <q-inner-loading :showing="loadWait || loadWsWait || loadWorksetDelete || loadWorksetCreate">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>

</template>

<script src="./workset-list.js"></script>

<style lang="scss" scope="local">
  .tab-switch-container {
    margin-right: 1px;
  }
  .tab-switch-button {
    border-top-right-radius: 1rem;
  }
  .section-title-button {
    height: 2.5rem;
  }
  .section-title {
    line-height: 2.5rem;
  }
  .border-025 {
    border-width: 0.25rem;
  }
</style>
