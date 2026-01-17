<template>
<q-page class="text-body1 q-pa-sm">

  <div
    v-if="!serverConfig.IsAdminAll"
   class="text-grey-8 text-center q-pa-md flex flex-center"
   >
    <div>
      <div class="text-h1" style="opacity:.5">
        {{ $t('Oops. Nothing here...') }}
      </div>

      <q-btn
        class="q-mt-xl"
          color="white"
          text-color="blue"
        unelevated
        to="/"
        :label="$t('Go to Models List')"
        no-caps
      />
    </div>
  </div>

  <div
    v-if="serverConfig.IsAdminAll"
    class="q-pb-sm"
    >
    <q-toolbar class="shadow-1 rounded-borders">

      <q-btn
        @click="refreshPauseToggle"
        flat
        dense
        class="col-auto bg-primary text-white rounded-borders"
        :icon="!isRefreshPaused ? (stateRefreshTickle ? 'mdi-autorenew' : 'mdi-sync') : 'mdi-play-circle-outline'"
        :title="!isRefreshPaused ? $t('Pause auto refresh') : $t('Auto refresh service state')"
        />
      <div class="col-auto q-ml-xs q-pl-xs q-py-xs">
        <span v-if="adminState.JobUpdateDateTime" class="mono om-text-secondary q-ml-xs">{{ adminState.JobUpdateDateTime }}</span>
      </div>

      <div class="col-auto q-ml-xs q-px-sm q-py-sm bg-primary text-white rounded-borders">
        <span>{{ $t('Active Model Runs') }}: {{ adminState.ActiveRuns?.length || $t('None') }}</span>
      </div>

      <div class="col q-ml-sm q-pl-sm q-py-xs bg-primary text-white rounded-borders">
        <q-btn
          @click.stop="doQueuePauseResume(!adminState.IsAllQueuePaused)"
          round
          size="sm"
          no-caps
          :icon="!adminState.IsAllQueuePaused ? 'mdi-pause' : 'mdi-play'"
          :title="!adminState.IsAllQueuePaused ? $t('Pause all queues') : $t('Resume all queues')"
          class="bg-white text-primary"
          />
        <span class="q-pl-sm">{{ $t('Model Runs Queue') }}<span v-if="adminState.QueueRuns?.length">: {{ adminState.QueueRuns?.length }}</span></span><span v-if="adminState.IsAllQueuePaused" class="q-pl-sm">({{ $t('All paused') }})</span>
      </div>
    </q-toolbar>
  </div>

  <q-list
    v-if="serverConfig.IsAdminAll"
    >

    <q-expansion-item
      v-model="isShowServers"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      >
      <template v-slot:header>
        <q-item-section>
          <q-item-label>
            <template v-if="adminState.MpiRes.Cpu">
              <span>{{ $t('MPI CPU Cores') }}: {{ adminState.MpiRes.Cpu }}</span>
              <span v-if="adminState.MpiMaxThreads > 0" class="q-pl-md">{{ $t('Threads Limit') }}: {{ adminState.MpiMaxThreads }}</span>
              <span v-if="adminState.MaxOwnMpiRes.Cpu > 0" class="q-pl-md">{{ $t('Cores Limit (per user)') }}: {{ adminState.MaxOwnMpiRes.Cpu }}</span>
              <span class="q-pl-md">{{ $t('Total Used') }}: {{ adminState.ActiveTotalRes.Cpu }}</span>
              <span v-show="adminState.MpiErrorRes.Cpu" class="q-pl-md">{{ $t('Failed') }}: {{ adminState.MpiErrorRes.Cpu }}</span>
            </template>
            <span v-if="adminState.MpiRes.Cpu > 0 && adminState.LocalRes.Cpu > 0" class="q-mx-md">&#124;</span>
            <template v-if="adminState.LocalRes.Cpu > 0">
              <span v-if="adminState.LocalRes.Cpu">{{ $t('Local CPU Cores (per user)') }}: {{ adminState.LocalRes.Cpu }}</span>
              <span v-if="adminState.LocalActiveTotalRes.Cpu > 0" class="q-pl-md">{{ $t('Total Used') }}: {{ adminState.LocalActiveTotalRes.Cpu }}</span>
            </template>
          </q-item-label>
        </q-item-section>
      </template>

      <q-card>
        <q-card-section>
          <table class="om-p-table">
            <thead>
              <tr>
                <th class="om-p-head-center text-weight-medium">{{ $t('Server') }}</th>
                <td class="om-p-head-center text-weight-medium">{{ $t('Status') }}</td>
                <th class="om-p-head-center text-weight-medium">{{ $t('CPU Cores') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Cores Used') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Used by You') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Errors') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Last Activity Time') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cs of adminState.ComputeState" :key="cs.Name + '-' + cs.Status + '-' + cs.LastUsedTs.toString()">
                <td class="om-p-cell-left">{{ cs.Name }}</td>
                <td v-if="cs.State === 'off'" class="bg-secondary text-white om-p-cell-center">{{ $t(cs.State) }}</td>
                <td v-if="cs.State === 'ready'" class="bg-positive text-white om-p-cell-center">{{ $t(cs.State) }}</td>
                <td v-if="cs.State === 'start'" class="bg-info text-white om-p-cell-center">&uarr; {{ $t(cs.State) }}</td>
                <td v-if="cs.State === 'stop'" class="bg-info text-white om-p-cell-center">&darr; {{ $t(cs.State) }}</td>
                <td v-if="cs.State === 'error'" class="bg-negative text-white om-p-cell-center">{{ $t(cs.State) }}</td>
                <td v-if="cs.State !== 'off' && cs.State !== 'ready' && cs.State !== 'start' && cs.State !== 'stop' && cs.State !== 'error'" class="om-p-cell-center">? {{ cs.State }} ?</td>
                <td class="om-p-cell-right">{{ cs.TotalRes.Cpu }}</td>
                <td class="om-p-cell-right">{{ cs.UsedRes.Cpu || '' }}</td>
                <td class="om-p-cell-right">{{ cs.OwnRes.Cpu || '' }}</td>
                <td class="om-p-cell-right">{{ cs.ErrorCount || '' }}</td>
                <td class="om-p-cell-right mono">{{ lastUsedDt(cs.LastUsedTs) }}</td>
              </tr>
            </tbody>
          </table>
        </q-card-section>
      </q-card>

    </q-expansion-item>

    <q-expansion-item
      v-model="isShowOmsActive"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      class="q-my-sm"
      >
      <template v-slot:header>
        <q-item-section>
          <q-item-label>
            <span>{{ $t('Users (oms)') }}: {{ adminState.OmsActive.length || $t('None') }}</span>
            <span v-if="adminState.ActiveTotalRes.Cpu" class="q-pl-md">{{ $t('MPI CPU Cores Used') }}: {{ adminState.ActiveTotalRes.Cpu }}</span>
            <span v-if="adminState.LocalActiveTotalRes.Cpu > 0" class="q-pl-md">{{ $t('Local CPU Cores Used') }}: {{ adminState.LocalActiveTotalRes.Cpu }}</span>
            <span v-if="adminState.IsDiskUse" v-show="omsDiskOverCount() > 0" class="q-pl-md">{{ $t('Disk Usage Over Limit') }}: {{ omsDiskOverCount() }}</span>
          </q-item-label>
        </q-item-section>
      </template>

      <q-card>
        <q-card-section>
          <table class="om-p-table">
            <thead>
              <tr>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('Name') }}</th>
                <th colspan="2" class="om-p-head-center text-weight-medium">{{ $t('CPU Cores') }}</th>
                <th v-if="adminState.IsDiskUse" colspan="3" class="om-p-head-center text-weight-medium">{{ $t('Disk Usage') }}</th>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('Paused') }}</th>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('Last Activity Time') }}</th>
              </tr>
              <tr>
                <th v-if="adminState.LocalActiveTotalRes.Cpu > 0" class="om-p-head-center text-weight-medium text-negative">{{ $t('Local') + ' : ' + adminState.LocalActiveTotalRes.Cpu }}</th>
                <th v-else class="om-p-head-center text-weight-medium">{{ $t('Local') }}</th>

                <th class="om-p-head-center text-weight-medium">{{ $t('MPI') }}</th>

                <template v-if="adminState.IsDiskUse">
                  <th class="om-p-head-center text-weight-medium">
                    <q-icon v-if="omsDiskOverCount() > 0" name="mdi-database-alert" color="negative" size="sm" />
                    <q-icon v-else name="mdi-database" color="primary" size="sm" />
                  </th>
                  <th class="om-p-head-center text-weight-medium">{{ $t('Size, MB') }}</th>
                  <th class="om-p-head-center text-weight-medium">{{ $t('Limit, MB') }}</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="om of adminState.OmsActive" :key="om.Oms + '-oms-' + om.LastStamp">
                <td class="om-p-cell-left">{{ om.Oms }}</td>

                <td v-if="om.LocalRes.Cpu > 0" class="om-p-cell-right mono"><span class="text-negative q-mr-xs">{{ om.LocalRes.Cpu }}</span><span class="bg-negative text-white q-px-xs">!</span></td>
                <td v-else class="om-p-cell-right mono">{{ om.LocalRes.Cpu || '' }}</td>

                <td class="om-p-cell-right mono">{{ om.Cpu || '' }}</td>

                <template v-if="adminState.IsDiskUse">
                  <td class="om-p-cell-center"><q-icon v-if="om.IsDiskOver" name="mdi-database-alert" color="negative" size="sm" /></td>

                  <td class="om-p-cell-right mono" :class="{ 'bg-negative text-white': om.IsDiskOver }">{{ sizeMbStr(om.TotalSizeMb) }}</td>
                  <td class="om-p-cell-right mono">{{ om.LimitMb > 0 ? sizeMbStr(om.LimitMb) : 'unlimited' }}</td>
                </template>

                <td class="om-p-cell-center" :class="{ 'paused': om.IsPaused }">{{ om.IsPaused ? 'paused' : '' }}</td>
                <td class="om-p-cell-left mono">{{ fromUnderscoreTs(om.LastStamp) }}</td>
              </tr>
            </tbody>
          </table>
        </q-card-section>
      </q-card>

    </q-expansion-item>

    <q-expansion-item
      v-model="isShowActiveRuns"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      class="q-my-sm"
      >
      <template v-slot:header>
        <q-item-section>
          <q-item-label>
            <span>{{ $t('Active Model Runs') }}: {{ adminState.ActiveRuns.length || $t('None') }}</span>
            <span v-if="adminState.ActiveTotalRes.Cpu" class="q-pl-md">{{ $t('MPI CPU Cores Used') }}: {{ adminState.ActiveTotalRes.Cpu }}</span>
            <span v-if="adminState.LocalActiveTotalRes.Cpu > 0" class="q-pl-md">{{ $t('Local CPU Cores Used') }}: {{ adminState.LocalActiveTotalRes.Cpu }}</span>
          </q-item-label>
        </q-item-section>
      </template>

      <q-card>
        <q-card-section>
          <table class="om-p-table">
            <thead>
              <tr>
                <th rowspan="2" class="om-p-head-center text-weight-medium btn-td">
                  <q-btn
                    @click="isShowActiveFilter = !isShowActiveFilter"
                    outline
                    no-caps
                    padding="xs"
                    :icon="isShowActiveFilter ? 'mdi-filter-check-outline' : 'mdi-filter-check'"
                    :title="isShowActiveFilter ? $t('Hide filters') : $t('Show filters')"
                    color="primary"
                    />
                  <q-btn
                    @click="applyActiveFilter"
                    :disable="!isShowActiveFilter || !countActiveFilter()"
                    outline
                    no-caps
                    padding="xs"
                    :icon="countActiveFilter() > 0 ? 'mdi-filter' : 'mdi-filter-outline'"
                    :title="$t('Apply filters')"
                    color="primary"
                    class="q-ml-xs"
                    />
                  <q-btn
                    @click="clearActiveFilter"
                    outline
                    :disable="!countActiveFilter()"
                    no-caps
                    padding="xs"
                    :icon="!!countActiveFilter() ? 'mdi-filter-off' : 'mdi-filter-off-outline'"
                    :title="$t('Clear all filters')"
                    color="primary"
                    class="q-ml-xs"
                    />
                </th>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('User (oms)') }}</th>
                <th rowspan="2" class="om-p-head-left text-weight-medium">
                  {{ $t('Submit Stamp') }}<br/>
                  <span class="om-text-descr">{{ $t('Run Stamp') }}</span>
                </th>
                <th colspan="2" class="om-p-head-center text-weight-medium">
                  {{ $t('Model') }}
                </th>
                <th colspan="2" class="om-p-head-center text-weight-medium">{{ $t('CPU Cores') }}</th>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('Servers') }}</th>
              </tr>

              <tr>
                <th class="om-p-head-center text-weight-medium">
                  {{ $t('Name') }}
                </th>
                <th class="om-p-head-center text-weight-medium">
                  {{ $t('Digest') }}
                </th>

                <th v-if="adminState.LocalActiveTotalRes.Cpu > 0" class="om-p-head-center text-weight-medium text-negative">{{ $t('Local') + ' : ' + adminState.LocalActiveTotalRes.Cpu }}</th>
                <th v-else class="om-p-head-center text-weight-medium">{{ $t('Local') }}</th>

                <th class="om-p-head-center text-weight-medium">{{ $t('MPI') }}</th>
              </tr>
            </thead>

            <tbody>
              <template v-for="ar of adminState.ActiveRuns" :key="ar.Oms + '-a-' + ar.SubmitStamp">
                <template v-if="isShowActiveFilter || (isOmsInActiveFilter(ar.Oms) && isNameInActiveFilter(ar.ModelName) && isDigestInActiveFilter(ar.ModelDigest))">

                  <tr>
                    <td class="om-p-cell-center">
                      <div class="bar-td rounded-borders q-pa-xs">
                        <q-btn
                          @click="onActiveRunState(ar.Oms, ar.SubmitStamp)"
                          round
                          outline
                          size="md"
                          padding="xs"
                          no-caps
                          :icon="isActiveRunState(ar.Oms, ar.SubmitStamp) ? 'mdi-information-outline' : 'mdi-information'"
                          :title="!isActiveRunState(ar.Oms, ar.SubmitStamp) ? $t('Show model run info') : $t('Hide model run info')"
                          color="primary"
                          />
                        <q-btn
                          @click="toClipboardActiveRunState(ar.Oms, ar.SubmitStamp)"
                          :disable="!isActiveRunState(ar.Oms, ar.SubmitStamp)"
                          :unelevated="isActiveRunState(ar.Oms, ar.SubmitStamp)"
                          :outline="!isActiveRunState(ar.Oms, ar.SubmitStamp)"
                          round
                          size="md"
                          padding="xs"
                          no-caps
                          icon="mdi-content-copy"
                          :title="$t('Copy model run info to clipboard')"
                          color="primary"
                          class="q-ml-xs"
                          />
                      </div>
                      <div class="bar-td rounded-borders q-pa-xs q-ml-xs">
                        <q-btn
                          @click="onActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          :unelevated="!isActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          :outline="isActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          round
                          size="md"
                          padding="xs"
                          no-caps
                          icon="mdi-text-long"
                          :title="!isActiveRunLog(ar.Oms, ar.SubmitStamp) ? $t('Show model run log') : $t('Hide model run log')"
                          color="primary"
                          />
                        <q-btn
                          @click="toClipboardActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          :disable="!isActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          :unelevated="isActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          :outline="!isActiveRunLog(ar.Oms, ar.SubmitStamp)"
                          round
                          size="md"
                          padding="xs"
                          no-caps
                          icon="mdi-content-copy"
                          :title="$t('Copy model run log to clipboard')"
                          color="primary"
                          class="q-ml-xs"
                          />
                      </div>
                    </td>

                    <td class="om-p-cell-left"><q-checkbox v-if="isShowActiveFilter" v-model="omsActiveFilter" :val="ar.Oms" />{{ ar.Oms }}</td>

                    <td class="om-p-cell-left">
                      <span class="mono">{{ fromUnderscoreTs(ar.SubmitStamp) }}</span><br />
                      <span class="mono om-text-descr">{{ fromUnderscoreTs(ar.RunStamp) }}</span>
                    </td>

                    <td class="om-p-cell-left"><q-checkbox v-if="isShowActiveFilter" v-model="nameActiveFilter" :val="ar.ModelName" />{{ ar.ModelName }}</td>

                    <td class="om-p-cell-left om-text-descr"><q-checkbox v-if="isShowActiveFilter" v-model="digestActiveFilter" :val="ar.ModelDigest" />{{ ar.ModelDigest }}</td>

                    <template v-if="ar.IsMpi">
                      <td class="om-p-cell-right mono"></td>
                      <td class="om-p-cell-right mono">{{ ar.Cpu }}</td>
                    </template>
                    <template v-else>
                      <td class="om-p-cell-right mono"><span class="text-negative q-mr-xs">{{ ar.Cpu }}</span><span class="bg-negative text-white q-px-xs">!</span></td>
                      <td class="om-p-cell-right mono"></td>
                    </template>

                    <td class="om-p-cell-left mono">
                      <span v-for="rcu of runCompUse(ar.Oms, ar.SubmitStamp)" :key="rcu.Oms + '-' + rcu.SubmitStamp + '-' + rcu.CompName + '-' + rcu.Cpu"><span>{{ rcu.CompName }}: {{ rcu.Cpu }}</span><br /></span>
                    </td>
                  </tr>

                  <tr v-if="isActiveRunState(ar.Oms, ar.SubmitStamp)">
                    <td colspan="8" class="om-p-cell-left mono">
                      <pre>{{ viewActiveRunState(ar.Oms, ar.SubmitStamp) }}</pre>
                    </td>
                  </tr>

                  <tr v-if="isActiveRunLog(ar.Oms, ar.SubmitStamp)">
                    <td colspan="8" class="om-p-cell-left mono">
                      <span v-if="activeRunLog.fileName" class="mono"><i>{{ activeRunLog.fileName }}:</i></span>
                      <div v-if="activeRunLog.lines.length <= 0">
                        <span class="mono">{{ $t('Log file not found or empty') }}</span>
                      </div>
                      <div v-else>
                        <pre>{{activeRunLog.lines.join('\n')}}</pre>
                      </div>
                    </td>
                  </tr>

                </template>
              </template>
            </tbody>
          </table>
        </q-card-section>
      </q-card>

    </q-expansion-item>

    <q-expansion-item
      v-model="isShowQueueRuns"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      class="q-my-sm"
      >
      <template v-slot:header>
        <q-item-section>
          <q-item-label>
            <span>{{ $t('Model Runs Queue') }}: {{ adminState.QueueRuns.length || $t('None') }}</span>
            <span class="q-pl-md">{{ $t('MPI Cores') }}: {{ adminState.QueueTotalRes.Cpu }}</span>
            <span class="q-pl-md">{{ $t('Local Cores') }}: {{ adminState.LocalQueueTotalRes.Cpu }}</span>
          </q-item-label>
        </q-item-section>
      </template>

      <q-card>
        <q-card-section>
          <table class="om-p-table">
            <thead>
              <tr>
                <th rowspan="2" class="om-p-head-center text-weight-medium btn-td">
                  <q-btn
                    @click="isShowQueueFilter = !isShowQueueFilter"
                    outline
                    no-caps
                    padding="xs"
                    :icon="isShowQueueFilter ? 'mdi-filter-check-outline' : 'mdi-filter-check'"
                    :title="isShowQueueFilter ? $t('Hide filters') : $t('Show filters')"
                    color="primary"
                    />
                  <q-btn
                    @click="applyQueueFilter"
                    :disable="!isShowQueueFilter || !countQueueFilter()"
                    outline
                    no-caps
                    padding="xs"
                    :icon="countQueueFilter() > 0 ? 'mdi-filter' : 'mdi-filter-outline'"
                    :title="$t('Apply filters')"
                    color="primary"
                    class="q-ml-xs"
                    />
                  <q-btn
                    @click="clearQueueFilter"
                    outline
                    :disable="!countQueueFilter()"
                    no-caps
                    padding="xs"
                    :icon="!!countQueueFilter() ? 'mdi-filter-off' : 'mdi-filter-off-outline'"
                    :title="$t('Clear all filters')"
                    color="primary"
                    class="q-ml-xs"
                    />
                </th>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('User (oms)') }}</th>
                <th rowspan="2" class="om-p-head-left text-weight-medium">{{ $t('Submit Stamp') }}</th>
                <th colspan="2" class="om-p-head-center text-weight-medium">{{ $t('Model') }}</th>
                <th rowspan="2" class="om-p-head-center text-weight-medium">{{ $t('Position') }}</th>
                <th colspan="3" class="om-p-head-center text-weight-medium">{{ $t('CPU Cores') }}</th>
              </tr>

              <tr>
                <th class="om-p-head-center text-weight-medium">{{ $t('Name') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Digest') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('MPI') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Processes') }}</th>
                <th class="om-p-head-center text-weight-medium">{{ $t('Threads') }}</th>
              </tr>
            </thead>

            <tbody>
              <template v-for="qr of adminState.QueueRuns" :key="qr.Oms + '-q-' + qr.SubmitStamp">
                <template v-if="isShowQueueFilter || (isOmsInQueueFilter(qr.Oms) && isNameInQueueFilter(qr.ModelName) && isDigestInQueueFilter(qr.ModelDigest))">

                  <tr>
                    <td class="om-p-cell-center">
                      <div class="bar-td rounded-borders q-pa-xs">
                        <q-btn
                          @click="onQueueRunState(qr.Oms, qr.SubmitStamp)"
                          round
                          outline
                          dense
                          padding="xs"
                          no-caps
                          :icon="isQueueRunState(qr.Oms, qr.SubmitStamp) ? 'mdi-information-outline' : 'mdi-information'"
                          :title="!isQueueRunState(qr.Oms, qr.SubmitStamp) ? $t('Show model run info') : $t('Hide model run info')"
                          color="primary"
                          />
                        <q-btn
                          @click="toClipboardQueueRunState(qr.Oms, qr.SubmitStamp)"
                          :disable="!isQueueRunState(qr.Oms, qr.SubmitStamp)"
                          :unelevated="isQueueRunState(qr.Oms, qr.SubmitStamp)"
                          :outline="!isQueueRunState(qr.Oms, qr.SubmitStamp)"
                          round
                          dense
                          padding="xs"
                          no-caps
                          icon="mdi-content-copy"
                          :title="$t('Copy model run info to clipboard')"
                          color="primary"
                          class="q-ml-xs"
                          />
                      </div>
                      <q-btn
                        @click="onStopRunConfirm(qr.Oms, qr.SubmitStamp)"
                        flat
                        dense
                        color="primary"
                        class="q-ml-xs"
                        icon="mdi-delete"
                        :title="$t('Delete from the queue') + ' ' + qr.Oms + ' ' + qr.SubmitStamp"
                        />
                    </td>

                    <td class="om-p-cell-left"><q-checkbox v-if="isShowQueueFilter" v-model="omsQueueFilter" :val="qr.Oms" />{{ qr.Oms }}</td>

                    <td class="om-p-cell-left">{{ fromUnderscoreTs(qr.SubmitStamp) }}</td>

                    <td class="om-p-cell-left"><q-checkbox v-if="isShowQueueFilter" v-model="nameQueueFilter" :val="qr.ModelName" />{{ qr.ModelName }}</td>

                    <td class="om-p-cell-left om-text-descr"><q-checkbox v-if="isShowQueueFilter" v-model="digestQueueFilter" :val="qr.ModelDigest" />{{ qr.ModelDigest }}</td>

                    <td class="om-p-cell-right mono">{{ qr.Position }}</td>

                    <td class="om-p-cell-center" :class="!qr.IsMpi ? 'bg-negative text-white q-px-xs' : ''">
                      <span v-if="qr.IsMpi">&#x2714;</span>
                      <span v-else>{{ $t('No') }}</span>
                    </td>

                    <td class="om-p-cell-right mono">{{ qr.ProcessCount }}</td>

                    <td class="om-p-cell-right mono">{{ qr.ThreadCount }}</td>

                  </tr>

                  <tr v-if="isQueueRunState(qr.Oms, qr.SubmitStamp)">
                    <td colspan="9" class="om-p-cell-left mono">
                      <pre>{{ viewQueueRunState(qr.Oms, qr.SubmitStamp) }}</pre>
                    </td>
                  </tr>

                </template>
              </template>
            </tbody>
          </table>
        </q-card-section>
      </q-card>

    </q-expansion-item>

  </q-list>

  <delete-confirm-dialog
    @delete-yes="onYesStopRun"
    :show-tickle="showStopRunTickle"
    :item-name="stopRunTitle"
    :item-id="stopSubmitStamp"
    :kind="stopOmsName"
    :dialog-title="$t('Stop model run?')"
    :icon-name="'mdi-alert-octagon'"
    >
  </delete-confirm-dialog>

</q-page>
</template>

<script src="./admin-state.js"></script>

<style lang="scss" scope="local">
  .paused {
    background-color: lightgrey;
  }
  .btn-td {
    min-width: 2rem;
  }
  .bar-td {
    border: 1px solid lightgray;
    display:inline-block;
  }
</style>
