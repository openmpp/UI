<template>
<div class="text-body1">

  <q-card v-if="isNotEmptyWorksetCurrent" class="q-ma-sm">

    <div
      class="row reverse-wrap items-center"
      >

      <q-btn
        @click="onCreateNewWorkset"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-ml-sm"
        icon="mdi-notebook-plus"
        :title="$t('Create new input scenario')"
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
        :disable="!isNotEmptyWorksetCurrent"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders q-mr-xs"
        :icon="(!isNotEmptyWorksetCurrent || isReadonlyWorksetCurrent) ? 'mdi-lock' : 'mdi-lock-open-variant'"
        :title="((!isNotEmptyWorksetCurrent || isReadonlyWorksetCurrent) ? $t('Open for read and write') : $t('Close and only read')) + ' ' + worksetCurrent.Name"
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
        :workset-name="worksetNameSelected"
        :refresh-tickle="refreshTickle"
        @set-parameter-select="onWorksetParamClick"
        @set-parameter-info-show="doShowParamNote"
        @set-parameter-group-info-show="doShowGroupNote"
        @set-parameter-tree-updated="onParamTreeUpdated"
        >
      </workset-parameter-list>

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
              v-if="prop.node.label"
              :disable="prop.node.isReadonly"
              @click.stop="onEditWorkset(prop.node.label)"
              flat
              round
              dense
              :color="!prop.node.isReadonly ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-notebook-edit-outline"
              :title="$t('Edit') + ': ' + prop.node.label"
              />
            <q-btn
              v-if="prop.node.label"
              :disable="!prop.node.isReadonly"
              @click.stop="onNewRunClick(prop.node.label)"
              flat
              round
              dense
              :color="prop.node.isReadonly ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-run"
              :title="$t('Run the Model')"
              />
            <q-btn
              v-if="prop.node.label"
              :disable="prop.node.isReadonly"
              @click.stop="onDeleteWorkset(prop.node.label)"
              flat
              round
              dense
              :color="!prop.node.isReadonly ? 'primary' : 'secondary'"
              class="col-auto"
              icon="mdi-delete-outline"
              :title="$t('Delete') + ': ' + prop.node.label"
              />
            <q-btn
              v-if="serverConfig.AllowDownload"
              :disable="!prop.node.isReadonly"
              @click.stop="onDownloadWorkset(prop.node.label)"
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

  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetInfoName"></workset-info-dialog>
  <parameter-info-dialog :show-tickle="paramInfoTickle" :param-name="paramInfoName" :workset-name="worksetNameSelected"></parameter-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <delete-workset
    :delete-now="deleteWorksetNow"
    :model-digest="digest"
    :workset-name="worksetDeleteName"
    @done="doneDeleteWorkset"
    @wait="loadWorksetDelete = true"
    >
  </delete-workset>
  <delete-confirm-dialog
    @delete-yes="onYesDeleteWorkset"
    :show-tickle="showDeleteDialogTickle"
    :item-name="worksetNameToDelete"
    :dialog-title="$t('Delete input scenario') + '?'"
    >
  </delete-confirm-dialog>

  <q-inner-loading :showing="loadWait || loadWorksetDelete">
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
  .tc-right {
    text-align: right;
  }
</style>
