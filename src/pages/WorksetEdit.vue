<template>
<div class="text-body1">

  <q-card class="q-ma-sm">

    <q-card-section class="q-pa-sm">
      <table>

        <tr>
          <td>
            <q-btn
              disable
              flat
              dense
              class="col-auto bg-primary text-white rounded-borders q-mr-xs"
              :icon="isReadonlyWorksetCurrent ? 'mdi-lock' : 'mdi-lock-open-variant'"
              :title="(isReadonlyWorksetCurrent ? $t('Read only') : $t('Read and write')) + ' ' + worksetName"
              />
          </td>
          <td>
            <q-btn
              @click="onToogleShowParamTree"
              no-caps
              unelevated
              dense
              color="primary"
              class="rounded-borders tab-switch-button q-mr-xs"
              :class="{ 'om-bg-inactive' : !isParamTreeShow }"
              >
              <q-icon :name="isParamTreeShow ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
              <span>{{ $t('Parameters') }}</span>
              <q-badge outline class="q-ml-sm q-mr-xs">{{ paramTreeCount }}</q-badge>
            </q-btn>
          </td>
          <td>
            <workset-bar
              :model-digest="digest"
              :workset-name="worksetName"
              @set-info-click="doShowWorksetNote(worksetName)"
              >
            </workset-bar>
          </td>
        </tr>

        <tr>
          <td
            :disabled="!isCompletedRunCurrent"
            >
            <q-checkbox
              :value="useBaseRun"
              @input="onBaseRunToggle"
              :disable="!isCompletedRunCurrent"
              :title="$t('If checked then use Base Run to get input parameters')"
              />
          </td>
          <td class="q-pr-xs">
            <span class="q-pr-sm">{{ $t('Use Base Run') }} :</span>
          </td>
          <td>
            <run-bar
              :model-digest="digest"
              :run-digest="baseDigest"
              @run-info-click="doShowRunNote"
              >
            </run-bar>
          </td>
        </tr>

      </table>
    </q-card-section>

    <q-card-section v-show="isParamTreeShow" class="q-px-sm q-pt-none">

      <workset-parameter-list
        :workset-name="worksetName"
        :refresh-tickle="refreshWsTreeTickle"
        :is-remove="true"
        :is-remove-disabled="isReadonlyWorksetCurrent"
        @set-parameter-remove="onParamWorksetDelete"
        @set-parameter-info-show="doShowParamNoteCurrent"
        @set-parameter-group-info-show="doShowGroupNote"
        @set-parameter-tree-updated="onParamTreeUpdated"
        >
      </workset-parameter-list>

    </q-card-section>

    <q-expansion-item
      v-if="isCompletedRunCurrent"
      :disable="isReadonlyWorksetCurrent"
      switch-toggle-side
      header-class="bg-primary text-white q-py-none"
      :label="$t('Copy parameter(s) from model run') + ': ' + runCurrent.Name"
      class="q-pa-sm"
      >
      <q-card-section class="q-px-none q-pt-sm">

        <run-parameter-list
          :run-digest="runDigestSelected"
          :refresh-tickle="refreshTickle"
          :is-add="true"
          @run-parameter-add="onParamRunCopy"
          @run-parameter-info-show="doShowParamRunNote"
          @run-parameter-group-info-show="doShowGroupNote"
          >
        </run-parameter-list>
      </q-card-section>

    </q-expansion-item>

    <q-expansion-item
      v-if="isNotEmptyWorksetSelected"
      :disable="isReadonlyWorksetCurrent || worksetNameSelected === worksetName"
      switch-toggle-side
      header-class="bg-primary text-white q-py-none"
      :label="$t('Copy parameter(s) from input scenario') + ': ' + worksetNameSelected"
      class="q-pa-sm"
      >
      <q-card-section class="q-px-none q-pt-sm">

        <workset-parameter-list
          :workset-name="worksetNameSelected"
          :refresh-tickle="refreshTickle"
          :is-add="true"
          :is-add-disabled="!isReadonlyWorksetSelected"
          @set-parameter-add="onParamWorksetCopy"
          @set-parameter-info-show="doShowParamNoteSelected"
          @set-parameter-group-info-show="doShowGroupNote"
          >
        </workset-parameter-list>

      </q-card-section>
    </q-expansion-item>

    <q-card-section class="q-pa-sm">

      <div class="row items-center full-width">
        <q-btn
          @click="onShowNoteEditor"
          :disable="isReadonlyWorksetCurrent || isShowNoteEditor"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-sm"
          icon="mdi-file-document-edit-outline"
          :title="$t('Edit notes for') + ' ' + worksetName"
          />
        <div class="descr-note-title col bg-primary text-white q-pl-md"><span>{{ $t('Description and Notes') }}</span></div>
      </div>

      <markdown-editor
        v-if="isShowNoteEditor"
        :the-key="noteEditorLangCode"
        :the-name="worksetName"
        :description-editable="!isReadonlyWorksetCurrent"
        :the-descr="descrCurrent"
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

  <refresh-workset v-if="(digest || '') !== '' && (worksetName || '') !== ''"
    :model-digest="digest"
    :workset-name="worksetName"
    :refresh-tickle="refreshTickle"
    :refresh-workset-tickle="refreshWsTickle"
    @done="doneWsLoad"
    @wait="loadWsWait = true"
    >
  </refresh-workset>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="baseDigest"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetInfoName"></workset-info-dialog>
  <parameter-info-dialog :show-tickle="paramRunInfoTickle" :param-name="paramInfoName" :run-digest="baseDigest"></parameter-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetInfoName"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <confirm-dialog
    @confirm-yes="onYesReplace"
    :show-tickle="showReplaceDialogTickle"
    :item-name="paramInfoName"
    :item-id="sourceParamReplace"
    :kind="kindParamReplace"
    :dialog-title="$t('Parameter already exist')"
    :body-text="$t('Replace') + '?'"
    :icon-name="'mdi-content-copy'"
    >
  </confirm-dialog>
  <delete-confirm-dialog
    @delete-yes="onYesDeleteParameter"
    :show-tickle="showDeleteDialogTickle"
    :item-name="paramInfoName"
    :dialog-title="$t('Delete parameter from input scenario') + '?'"
    >
  </delete-confirm-dialog>

  <q-inner-loading :showing="loadWait || loadWsWait">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>

</template>

<script src="./workset-edit.js"></script>

<style lang="scss" scope="local">
  .tab-switch-container {
    margin-right: 1px;
  }
  .tab-switch-button {
    border-top-right-radius: 1rem;
  }
  .tc-right {
    text-align: right;
  }
  .descr-note-title {
    line-height: 3rem;
  }
</style>
