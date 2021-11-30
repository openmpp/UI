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

  <div class="q-mx-sm q-mb-sm">
    <q-toolbar class="row reverse-wrap items-center shadow-1 rounded-borders">

    <q-btn
      @click="doShowTableNote"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-information"
      :title="$t('About') + ' ' + tableName"
      />
    <q-btn
      @click="doExpressionPage"
      :disable="tv.kind === 0"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-function-variant"
      :title="$t('View table expressions')"
      />
    <q-btn
      @click="doAccumulatorPage"
      :disable="tv.kind === 1"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-variable"
      :title="$t('View accumulators and sub-values (sub-samples)')"
      />
    <q-btn
      @click="doAllAccumulatorPage"
      :disable="tv.kind === 2"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      icon="mdi-application-variable-outline"
      :title="$t('View all accumulators and sub-values (sub-samples)')"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="onDownload"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      icon="mdi-download"
      :title="$t('Download') + ' '  + tableName + ' ' + $t('as CSV')"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="togglePivotControls"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      :icon="pvtState.isShowUI ? 'mdi-tune' : 'mdi-tune-vertical'"
      :title="pvtState.isShowUI ? $t('Hide pivot controls') : $t('Show pivot controls')"
      />
    <q-btn
      @click="showMoreDecimals"
      :disable="pvtState.isAllDecimals"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-decimal-increase"
      :title="$t('Show more decimals')"
      />
    <q-btn
      @click="showLessDecimals"
      :disable="pvtState.nDecimals <= 0 && !pvtState.isAllDecimals"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders"
      icon="mdi-decimal-decrease"
      :title="$t('Show less decimals')"
      />
    <q-separator vertical inset spaced="sm" color="secondary" />

    <q-btn
      @click="doResetView"
      flat
      dense
      class="col-auto bg-primary text-white rounded-borders q-mr-xs"
      icon="mdi-cog-refresh-outline"
      :title="$t('Reset table view to default')"
      />

    <div
      class="col-auto"
      >
      <span>{{ tableName }}<br />
      <span class="om-text-descr">{{ tableText.TableDescr }}</span></span>
    </div>

    </q-toolbar>
  </div>

  <pivot-react class="q-ml-sm" :pvtState="pvtState"></pivot-react>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runDigest"></run-info-dialog>
  <table-info-dialog :show-tickle="tableInfoTickle" :table-name="tableName" :run-digest="runDigest"></table-info-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>
</template>

<script src="./table-page.js"></script>

<style lang="scss" scoped>
</style>
