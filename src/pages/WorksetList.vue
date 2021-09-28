<template>
<div class="text-body1">

  <q-card v-if="isNotEmptyWorksetCurrent" class="q-ma-sm">

    <div
      class="row reverse-wrap items-center"
      >

      <q-btn
        @click="doNewWorksetOrCancel"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-ml-sm"
        :icon="!isNewWorksetShow ? 'mdi-folder-plus' : 'cancel'"
        :title="!isNewWorksetShow ? $t('New input scenario') : (nameOfNewWorkset ? $t('Discard changes of') + ' ' + (nameOfNewWorkset || '') : $t('Discard changes and stop editing'))"
       />
      <q-separator vertical inset spaced="sm" color="secondary" />

      <span class="col-auto no-wrap q-mr-xs">
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
          <q-badge outline class="q-ml-sm q-mr-xs">{{ paramCountWorksetCurrent }}</q-badge>
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
        @click="onNewRunClick"
        :disable="!isReadonlyWorksetCurrent"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        icon="mdi-run"
        :title="$t('Run the Model')"
        />
      <q-btn
        @click="onWorksetEditToggle"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        :icon="!isReadonlyWorksetCurrent ? 'mdi-content-save-edit' : 'mdi-folder-edit'"
        :title="(!isReadonlyWorksetCurrent ? $t('Save') : $t('Edit')) + ' ' + worksetNameSelected"
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

    <q-card-section v-show="isParamTreeShow" class="q-px-sm q-pt-none">

      <workset-parameter-list
        :refresh-tickle="refreshTickle"
        :is-copy-enabled="isNewWorksetShow"
        :is-copy-group-enabled="isNewWorksetShow"
        :copy-icon="'mdi-plus-circle-outline'"
        @set-parameter-select="onParamLeafClick"
        @set-parameter-copy="onParamWorksetCopy"
        @set-parameter-group-copy="onParamGroupWorksetCopy"
        @set-parameter-info-show="doShowParamNote"
        @set-parameter-group-info-show="doShowGroupNote"
        >
      </workset-parameter-list>

    </q-card-section>

  </q-card>

  <q-card v-show="isNewWorksetShow" class="q-ma-sm">

    <q-card-section class="q-pa-sm">
      <table>

        <tr>
          <td>
            <q-btn
              @click="onSaveNewWorkset"
              :disable="isEmptyNameOfNewWorkset"
              flat
              dense
              class="bg-primary text-white rounded-borders q-mr-xs"
              icon="mdi-content-save-edit"
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
            {{$t('Use Base Run') + ':'}}
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
      v-if="isNotEmptyWorksetCurrent"
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

    </q-expansion-item>

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

      <q-card-section class="q-px-none q-pt-sm">

        <run-parameter-list
          :refresh-tickle="refreshTickle"
          :is-copy-enabled="isNewWorksetShow"
          :is-copy-group-enabled="isNewWorksetShow"
          :copy-icon="'mdi-plus-circle-outline'"
          @run-parameter-copy="onParamRunCopy"
          @run-parameter-group-copy="onParamGroupRunCopy"
          @run-parameter-info-show="doShowParamRunNote"
          @run-parameter-group-info-show="doShowGroupNote"
          >
        </run-parameter-list>

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
        :show-tickle="noteEditorNewWorksetTickle"
        :the-key="t.LangCode"
        :the-descr="t.DescrNewWorkset"
        :descr-prompt="$t('Input scenario description') + ' (' + t.LangName + ')'"
        :the-note="t.Note"
        :note-prompt="$t('Input scenario notes') + ' (' + t.LangName + ')'"
        :description-editable="true"
        :notes-editable="true"
        :is-hide-save="true"
        :is-hide-cancel="true"
        :lang-code="t.LangCode"
        class="q-px-none q-py-xs"
      >
      </markdown-editor>

    </q-expansion-item>

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
            class="row no-wrap items-center full-width cursor-pointer om-tree-leaf"
            :class="{ 'text-primary' : prop.node.label === worksetNameSelected }"
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
              :disable="!prop.node.label || prop.node.isReadonly"
              @click.stop="onShowWorksetDelete(prop.node.label)"
              flat
              round
              dense
              color="primary"
              class="col-auto"
              icon="mdi-delete-outline"
              :title="$t('Delete') + ': ' + prop.node.label"
              />
            <q-btn
              :disable="!serverConfig.AllowDownload || !prop.node.isReadonly"
              @click.stop="doDownloadWorkset(prop.node.label)"
              flat
              round
              dense
              :color="prop.node.isReadonly ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-file-download-outline"
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

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runDigestSelected"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetInfoName"></workset-info-dialog>
  <parameter-info-dialog :show-tickle="paramRunInfoTickle" :param-name="paramInfoName" :run-digest="runDigestSelected"></parameter-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetNameSelected"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <edit-discard-dialog
    @discard-changes-yes="onYesDiscardNewWorkset"
    :show-tickle="showEditDiscardTickle"
    :dialog-title="nameOfNewWorkset || ($t('Discard all changes') + '?')"
    >
  </edit-discard-dialog>
  <delete-confirm-dialog
    @delete-yes="onYesWorksetDelete"
    :show-tickle="showDeleteDialogTickle"
    :item-name="worksetNameToDelete"
    :dialog-title="$t('Delete input scenario') + '?'"
    >
  </delete-confirm-dialog>

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
  .tc-right {
    text-align: right;
  }
</style>
