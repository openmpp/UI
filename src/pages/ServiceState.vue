<template>
<q-page class="text-body1 q-pa-sm">

  <div class="row items-center full-width">

    <span class="col-auto shadow-1 q-pa-xs q-mr-xs">
      <q-btn
        v-if="!isRefreshDisabled && serverConfig.IsJobControl"
        @click="refreshPauseToggle"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        :icon="!isRefreshPaused ? (stateRefreshTickle ? 'mdi-autorenew' : 'mdi-sync') : 'mdi-play-circle-outline'"
        :title="!isRefreshPaused ? $t('Pause auto refresh') : $t('Auto refresh service state')"
        />
      <q-btn
        v-else
        disable
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        icon="mdi-autorenew"
        :title="$t('Refresh')"
        />
        <span v-if="srvState.UpdateDateTime" class="mono om-text-secondary q-ml-xs">{{ srvState.UpdateDateTime }}</span>
    </span>

    <span class="col-grow">
      <q-btn
        @click="isActiveShow = !isActiveShow"
        no-caps
        unelevated
        :ripple="false"
        color="primary"
        align="left"
        class="full-width q-py-xs"
        >
        <q-icon :name="isActiveShow ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
        <span class="text-body1">{{ $t('Active Model Runs') + ': ' + (srvState.Active.length || $t('None')) }}</span>
      </q-btn>
    </span>

  </div>

  <q-list
    v-show="isActiveShow"
    bordered
    >

    <q-expansion-item
      v-for="aj in srvState.Active" :key="aj.JobKey"
      :disable="!aj.ModelDigest || !aj.JobKey || !aj.SubmitStamp"
      @after-show="onActiveShow(aj.JobKey)"
      @after-hide="onActiveHide(aj.JobKey)"
      expand-icon-toggle
      switch-toggle-side
      expand-icon-class="job-expand-btn bg-primary text-white rounded-borders q-mr-sm"
      :title="$t('About') + ': ' + aj.SubmitStamp"
      >
      <template v-slot:header>
        <q-item-section avatar class="job-hdr-action-bar q-pr-sm">
          <q-btn
            @click="onStopJobConfirm(aj.JobKey, aj.ModelDigest, aj.SubmitStamp, aj.ModelName)"
            flat
            dense
            class="bg-primary text-white rounded-borders"
            icon="mdi-alert-octagon-outline"
            :title="$t('Stop model run') + ' ' + aj.SubmitStamp"
            />
        </q-item-section>
        <q-item-section>
          <q-item-label>
            {{ aj.ModelName }}
          </q-item-label>
          <q-item-label class="om-text-descr">
            {{ $t('Submitted') + ':' }} <span class="mono">{{ fromUnderscoreTs(aj.SubmitStamp) }}</span>
            <span class="q-ml-md">{{ $t('Run Stamp') + ':' }} <span class="mono">{{ fromUnderscoreTs(aj.RunStamp) }}</span></span>
          </q-item-label>
        </q-item-section>
      </template>

      <job-info-card
        :job-item="activeJob[aj.JobKey]"
        class="job-card q-mx-sm q-mb-md"
      >
      </job-info-card>

    </q-expansion-item>

  </q-list>

  <q-expansion-item
    :disable="!serverConfig.IsJobControl"
    v-model="isQueueShow"
    switch-toggle-side
    expand-separator
    :label="$t('Model Run Queue') + ': ' + (srvState.Queue.length || $t('None'))"
    header-class="bg-primary text-white"
    class="q-my-sm"
    >
    <q-list bordered>

      <q-expansion-item
        v-for="qj in srvState.Queue" :key="qj.JobKey"
        :disable="!qj.ModelDigest || !qj.JobKey || !qj.SubmitStamp"
        @after-show="onQueueShow(qj.JobKey)"
        @after-hide="onQueueHide(qj.JobKey)"
        expand-icon-toggle
        switch-toggle-side
        expand-icon-class="job-expand-btn bg-primary text-white rounded-borders q-mr-sm"
        :title="$t('About') + ': ' + qj.SubmitStamp"
        >
        <template v-slot:header>
          <q-item-section avatar class="q-pr-xs">
            <div class="row items-center">
              <q-btn
                :disable="isTopQueue(qj.JobKey)"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                icon="mdi-arrow-collapse-up"
                :title="$t('Move to the top')"
                />
              <q-btn
                :disable="isTopQueue(qj.JobKey)"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                icon="mdi-arrow-up"
                :title="$t('Move up')"
                />
              <q-btn
                :disable="isBottomQueue(qj.JobKey)"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                icon="mdi-arrow-down"
                :title="$t('Move down')"
                />
              <q-btn
                :disable="isBottomQueue(qj.JobKey)"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                icon="mdi-arrow-collapse-down"
                :title="$t('Move to the bottom')"
                />
              <q-btn
                @click="onStopJobConfirm(qj.JobKey, qj.ModelDigest, qj.SubmitStamp, qj.ModelName)"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                icon="mdi-delete"
                :title="$t('Delete from the queue') + qj.SubmitStamp"
                />
            </div>
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ qj.ModelName }}
            </q-item-label>
            <q-item-label class="om-text-descr">
              {{ $t('Submitted') + ':' }} <span class="mono">{{ fromUnderscoreTs(qj.SubmitStamp) }}</span>
            </q-item-label>
          </q-item-section>
        </template>

        <job-info-card
          :job-item="queueJob[qj.JobKey]"
          class="job-card q-mx-sm q-mb-md"
        >
        </job-info-card>

      </q-expansion-item>

    </q-list>
  </q-expansion-item>

  <q-expansion-item
    :disable="!serverConfig.IsJobControl"
    v-model="isHistoryShow"
    switch-toggle-side
    expand-separator
    :label="$t('History of Model Runs') + ': ' + (srvState.History.length || $t('None'))"
    header-class="bg-primary text-white"
    class="q-my-sm"
    >
    <q-list bordered>

      <q-expansion-item
        v-for="hj in srvState.History" :key="hj.JobKey"
        :disable="!hj.ModelDigest || !hj.JobKey || !hj.SubmitStamp"
        @after-show="onHistoryShow(hj.JobKey)"
        @after-hide="onHistoryHide(hj.JobKey)"
        expand-icon-toggle
        switch-toggle-side
        expand-icon-class="job-expand-btn bg-primary text-white rounded-borders q-mr-sm"
        :title="$t('About') + ': ' + hj.SubmitStamp"
        >
        <template v-slot:header>
          <q-item-section>
            <q-item-label>
              {{ hj.ModelName }}: <span class="om-text-descr" :class="isSuccess(hj.JobStatus) ? 'text-primary' : 'text-negative'">{{ $t(runStatusDescr(hj.JobStatus)) }}</span>
            </q-item-label>
            <q-item-label class="om-text-descr">
              {{ $t('Submitted') + ':' }} <span class="mono">{{ fromUnderscoreTs(hj.SubmitStamp) }}</span>
              <span class="q-ml-md">{{ $t('Run Stamp') + ':' }} <span class="mono">{{ fromUnderscoreTs(hj.RunStamp) }}</span></span>
            </q-item-label>
          </q-item-section>
        </template>

        <job-info-card
          :job-item="historyJob[hj.JobKey]"
          class="job-card q-mx-sm q-mb-md"
        >
        </job-info-card>

      </q-expansion-item>

    </q-list>
  </q-expansion-item>

  <delete-confirm-dialog
    @delete-yes="onYesStopRun"
    :show-tickle="showStopRunTickle"
    :item-name="stopRunTitle"
    :item-id="stopSubmitStamp"
    :kind="stopModelDigest"
    :dialog-title="$t('Stop model run?')"
    :icon-name="'mdi-alert-octagon'"
    >
  </delete-confirm-dialog>

</q-page>
</template>

<script src="./service-state.js"></script>

<style lang="scss" scope="local">
  // override card shadow inside of expansion item
  .q-expansion-item__content > div.job-card {
    box-shadow: $shadow-1;
  }
  .job-expand-btn {
    padding-right: 0;
    align-content: center;
  }
  .job-hdr-action-bar {
    min-width: 2rem;
  }
</style>
