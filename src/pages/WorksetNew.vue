<template>
<div class="text-body1">

  <q-card class="q-ma-sm">

    <q-card-section class="q-pa-sm">
      <table>

        <tr>
          <td>
            <q-btn
              @click="onSaveNewWorkset"
              :disable="isEmptyNameOfNewWorkset || loadWorksetCreate"
              flat
              dense
              class="bg-primary text-white rounded-borders q-mr-xs"
              icon="mdi-content-save"
              :title="$t('Save') + ' ' + (nameOfNewWorkset || '')"
              />
          </td>
          <td class="q-pr-xs">
            <span class="text-negative text-weight-bold">* </span><span class="q-pr-sm">{{ $t('Name') }} :</span>
          </td>
          <td>
            <q-input
              debounce="500"
              v-model="nameOfNewWorkset"
              maxlength="255"
              size="80"
              required
              @focus="onNewNameFocus"
              @blur="onNewNameBlur"
              :rules="[ val => (val || '') !== '' ]"
              outlined
              dense
              clearable
              hide-bottom-space
              :placeholder="$t('Name of the new input scenario') + ' (* ' + $t('Required') + ')'"
              :title="$t('Name of the new input scenario')"
              >
            </q-input>
          </td>
        </tr>

        <tr>
          <td
            :disabled="!isCompletedRunCurrent"
            >
            <q-checkbox
              v-model="useBaseRun"
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
              :run-digest="runDigestSelected"
              @run-info-click="doShowRunNote"
              >
            </run-bar>
          </td>
        </tr>

      </table>
    </q-card-section>

    <q-expansion-item
      v-if="isCompletedRunCurrent"
      switch-toggle-side
      header-class="bg-primary text-white q-py-none"
      class="q-pa-sm"
      >
      <template v-slot:header>
        <transition
          enter-active-class="animated fadeIn"
          leave-active-class="animated fadeOut"
          mode="out-in"
          >
          <q-item :key="currentRunCopyChangeKey" class="q-pa-none">
            <q-item-section class="col"><q-badge transparent outline class="q-py-sm">{{ paramRunCopyLst.length }}</q-badge></q-item-section>
            <q-item-section class="col-grow">{{ $t('Copy parameter(s) from model run') + ': ' + runCurrent.Name }}</q-item-section>
          </q-item>
        </transition>
      </template>

      <q-list>
        <q-item
          v-for="pc of paramRunCopyLst" :key="pc.name"
          >
          <q-item-section avatar>
           <q-btn
              @click="onRemoveRunFromNewWorkset(pc.name)"
              flat
              round
              dense
              color="primary"
              class="col-auto"
              icon="mdi-minus-circle-outline"
              :title="$t('Do not copy') + ': ' + pc.name"
              />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ pc.name }}</q-item-label>
            <q-item-label class="om-text-descr">{{ pc.descr }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-section class="q-pa-sm">

        <run-parameter-list
          :run-digest="runDigestSelected"
          :refresh-tickle="refreshTickle"
          :is-add="true"
          :is-add-group="true"
          @run-parameter-add="onParamRunCopy"
          @run-parameter-group-add="onParamGroupRunCopy"
          @run-parameter-info-show="doShowParamRunNote"
          @run-parameter-group-info-show="doShowGroupNote"
          >
        </run-parameter-list>

      </q-card-section>

    </q-expansion-item>

    <q-expansion-item
      v-if="isNotEmptyWorksetSelected"
      switch-toggle-side
      header-class="bg-primary text-white q-py-none"
      class="q-pa-sm"
      >

      <template v-slot:header>
        <transition
          enter-active-class="animated fadeIn"
          leave-active-class="animated fadeOut"
          mode="out-in"
          >
          <q-item :key="currentWsCopyChangeKey" class="q-pa-none">
            <q-item-section class="col"><q-badge transparent outline class="q-py-sm">{{ paramWsCopyLst.length }}</q-badge></q-item-section>
            <q-item-section class="col-grow">{{ $t('Copy parameter(s) from input scenario') + ': ' + worksetNameSelected }}</q-item-section>
          </q-item>
        </transition>
      </template>

      <q-list>
        <q-item
          v-for="pc of paramWsCopyLst" :key="pc.name"
          >
          <q-item-section avatar>
           <q-btn
              @click="onRemoveWsFromNewWorkset(pc.name)"
              flat
              round
              dense
              color="primary"
              class="col-auto"
              icon="mdi-minus-circle-outline"
              :title="$t('Do not copy') + ': ' + pc.name"
              />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ pc.name }}</q-item-label>
            <q-item-label class="om-text-descr">{{ pc.descr }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-section class="q-pa-sm">

        <workset-parameter-list
          :workset-name="worksetNameSelected"
          :refresh-tickle="refreshTickle"
          :is-add="true"
          :is-add-group="true"
          :is-add-disabled="!isReadonlyWorksetSelected"
          @set-parameter-add="onParamWorksetCopy"
          @set-parameter-group-add="onParamGroupWorksetCopy"
          @set-parameter-info-show="doShowParamNote"
          @set-parameter-group-info-show="doShowGroupNote"
          >
        </workset-parameter-list>

      </q-card-section>

    </q-expansion-item>

    <q-expansion-item
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      class="q-pa-sm"
      :label="$t('Description and Notes')"
      >

      <markdown-editor
        v-for="t in txtNewWorkset"
        :key="t.LangCode"
        :ref="'new-ws-note-editor-' + t.LangCode"
        :the-key="t.LangCode"
        :the-descr="t.Descr"
        :descr-prompt="$t('Input scenario description') + ' (' + t.LangName + ')'"
        :the-note="t.Note"
        :note-prompt="$t('Input scenario notes') + ' (' + t.LangName + ')'"
        :description-editable="true"
        :notes-editable="true"
        :is-hide-save="true"
        :is-hide-cancel="true"
        :lang-code="t.LangCode"
        class="q-pa-sm"
      >
      </markdown-editor>

    </q-expansion-item>

  </q-card>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runDigestSelected"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetInfoName"></workset-info-dialog>
  <parameter-info-dialog :show-tickle="paramRunInfoTickle" :param-name="paramInfoName" :run-digest="runDigestSelected"></parameter-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetNameSelected"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <create-workset
    :create-now="createWorksetNow"
    :model-digest="digest"
    :new-name="nameOfNewWorkset"
    :current-workset-name="worksetNameSelected"
    :current-run-digest="runDigestSelected"
    :is-based-on-run="useBaseRun || false"
    :descr-notes="newDescrNotes"
    :copy-from-run="paramRunCopyLst"
    :copy-from-workset="paramWsCopyLst"
    @done="doneWorksetCreate"
    @wait="loadWorksetCreate = true"
    >
  </create-workset>

  <q-inner-loading :showing="loadWait || loadWorksetCreate">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>

</template>

<script src="./workset-new.js"></script>

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
</style>
