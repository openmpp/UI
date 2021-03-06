<template>
<q-page class="text-body1 q-pt-sm">

  <q-separator />
  <div class="row no-wrap full-width">

    <q-tabs
      outside-arrows
      no-caps
      align="left"
      dense
      inline-label
      shrink
      indicator-color="transparent"
      class="col inline"
      >
      <span
        v-for="t in tabItems"
        :key="t.path"
        class="row no-wrap om-tab-hdr text-white"
        :class="{'om-bg-inactive': t.path !== activeTabKey}"
        >
        <q-route-tab
          :name="t.path"
          :to="t.path"
          exact
          class="full-width q-pa-xs"
          >
          <span class="row inline full-width no-wrap justify-start">
            <q-icon v-if="t.kind === 'run-list'" name="mdi-folder-table" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="t.kind === 'set-list'" name="mdi-folder-edit" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="t.kind === 'new-run'" name="mdi-run" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="t.kind === 'run-parameter'" name="mdi-application-import" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="!t.updated && t.kind === 'set-parameter'" name="mdi-square-edit-outline" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="t.updated && t.kind === 'set-parameter'" name="mdi-content-save-edit" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="t.kind === 'table'" name="mdi-application-export" size="sm" class="self-center q-pr-xs"/>
            <q-icon v-if="t.kind === 'run-log'" name="mdi-text-subject" size="sm" class="self-center q-pr-xs"/>
            <span class="col-shrink om-tab-title" :title="$t(t.title)">{{ $t(t.title) }}</span>
            <q-badge v-if="t.kind === 'run-list'" transparent outline class="q-ml-xs">{{ runTextCount }}</q-badge>
            <q-badge v-if="t.kind === 'set-list'" transparent outline class="q-ml-xs">{{ worksetTextCount }}</q-badge>
          </span>
        </q-route-tab>
        <q-btn
          v-if="!t.updated"
          icon="mdi-close"
          :disable="!tabItems || tabItems.length <= 1"
          @click.stop="onTabCloseClick(t.path)"
          flat
          round
          size="xs"
          class="self-center"
          :title="$t('close')"
          />
      </span>

    </q-tabs>

    <q-btn
      :disable="isEmptyTabList"
      flat
      dense
      class="col-auto bg-primary text-white"
      icon="more_vert"
      :title="$t('More')"
      :aria-label="$t('More')"
      >
      <q-menu auto-close>
        <q-list dense>
          <q-item
            v-for="t in tabItems"
            :key="t.path"
            :name="t.path"
            :to="t.path"
            clickable
            >
            <q-item-section avatar>
              <q-icon v-if="t.kind === 'run-list'" name="mdi-folder-table-outline" />
              <q-icon v-if="t.kind === 'set-list'" name="mdi-folder-edit-outline" />
              <q-icon v-if="t.kind === 'new-run'" name="mdi-run" />
              <q-icon v-if="t.kind === 'run-parameter'" name="mdi-application-import" />
              <q-icon v-if="!t.updated && t.kind === 'set-parameter'" name="mdi-square-edit-outline" />
              <q-icon v-if="t.updated && t.kind === 'set-parameter'" name="mdi-content-save-edit" />
              <q-icon v-if="t.kind === 'table'" name="mdi-application-export" />
              <q-icon v-if="t.kind === 'run-log'" name="mdi-text-subject" />
            </q-item-section>
            <q-item-section>
              <q-item-label lines="1" :title="$t(t.title)">{{ $t(t.title) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>

  </div>
  <q-separator />

  <router-view
    ref="theTab"
    :refresh-tickle="refreshTickle"
    @tab-mounted="onTabMounted"
    @run-select="onRunSelect"
    @set-select="onWorksetSelect"
    @run-parameter-select="onRunParamSelect"
    @set-parameter-select="onSetParamSelect"
    @table-select="onTableSelect"
    @set-update-readonly="onWorksetReadonlyUpdate"
    @edit-updated="onEditUpdated"
    @run-log-select="onRunLogSelect"
    @new-run-select="onNewRunSelect"
    @run-list-refresh="onRunListRefresh"
    @run-completed-list="onRunCompletedList"
    @parameter-view-saved="onParameterViewSaved"
    >
  </router-view>

  <refresh-model
    :digest="digest"
    :refresh-tickle="refreshTickle"
    @done="doneModelLoad"
    @wait="loadModelDone = false"
    >
  </refresh-model>
  <refresh-run-list
    :digest="digest"
    :refresh-tickle="refreshTickle"
    :refresh-run-list-tickle="refreshRunListTickle"
    @done="doneRunListLoad"
    @wait="loadRunListDone = false"
    >
  </refresh-run-list>
  <refresh-run v-if="(digest || '') !== ''"
    :model-digest="digest"
    :run-digest="runDnsCurrent"
    :refresh-tickle="refreshTickle"
    :refresh-run-tickle="refreshRunTickle"
    @done="doneRunLoad"
    @wait="loadRunDone = false"
    >
  </refresh-run>
  <refresh-run-array v-if="(digest || '') !== ''"
    :model-digest="digest"
    :run-digest-array="runViewsArray"
    :refresh-tickle="refreshTickle"
    :refresh-all-tickle="refreshRunViewsTickle"
    @done="doneRunViewsLoad"
    @wait="loadRunViewsDone = false"
    >
  </refresh-run-array>
  <refresh-workset-list
    :digest="digest"
    :refresh-tickle="refreshTickle"
    @done="doneWsListLoad"
    @wait="loadWsListDone = false">
  </refresh-workset-list>
  <refresh-workset v-if="(wsNameCurrent || '') !== ''"
    :model-digest="digest"
    :workset-name="wsNameCurrent"
    :refresh-tickle="refreshTickle"
    @done="doneWsLoad"
    @wait="loadWsDone = false">
  </refresh-workset>
  <update-workset-status v-if="(wsNameCurrent || '') !== ''"
    :model-digest="digest"
    :workset-name="wsNameCurrent"
    :is-readonly="isWsNowReadonly"
    :update-status-tickle="updateWsStatusTickle"
    @done="doneUpdateWsStatus"
    @wait="updatingWsStatus = true">
  </update-workset-status>
  <refresh-workset-array v-if="(digest || '') !== ''"
    :model-digest="digest"
    :workset-name-array="wsViewsArray"
    :refresh-tickle="refreshTickle"
    :refresh-all-tickle="refreshWsViewsTickle"
    @done="doneWsViewsLoad"
    @wait="loadWsViewsDone = false"
    >
  </refresh-workset-array>
  <refresh-user-views v-if="loadModelDone"
    :model-name="modelName"
    @done="doneUserViewsLoad"
    @wait="loadUserViewsDone = false"
    >
  </refresh-user-views>
  <upload-user-views
    :model-name="modelName"
    :upload-views-tickle="uploadUserViewsTickle"
    @done="doneUserViewsUpload"
    @wait="uploadUserViewsDone = false"
    >
  </upload-user-views>

  <q-dialog v-model="showAllDiscardDlg">
    <q-card>

      <q-card-section>
        <div class="text-h6 primary">{{ modelName }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none text-body1">
        <div>{{ $t('Discard all changes?') }}</div>
        <div>{{ $t('You have {count} unsaved parameter(s)', { count: paramEditCount }) }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$t('No')" color="primary" v-close-popup autofocus />
        <q-btn flat :label="$t('Yes')" color="primary" v-close-popup @click="onYesDiscardChanges" />
      </q-card-actions>

    </q-card>
  </q-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="lg" color="primary" />
  </q-inner-loading>

</q-page>
</template>

<script src="./model-page.js"></script>

<style lang="scss" scope="local">
  .om-tab-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .om-tab-hdr {
    border-top-right-radius: 1rem;
    background-color: $primary;
    margin-right: 1px;
  }
</style>
