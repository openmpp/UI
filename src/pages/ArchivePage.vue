<template>
<q-page class="text-body1">

  <q-card
    class="q-ma-sm"
    >
    <q-card-section v-if="!archiveState.IsArchive">
      $t('Server offline or archive state retrieve failed.')
    </q-card-section>
    <q-card-section v-else>

      <table class="pt-table">
        <thead>
          <tr>
            <th class="pt-cell">
              <q-btn
                @click="doRefresh"
                flat
                round
                dense
                icon="refresh"
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                :title="$t('Refresh')"
                :aria-label="$t('Refresh')"
              />
            </th>
            <td class="pt-cell-left  mono">{{ archiveState.UpdateDateTime }}</td>
            <th class="pt-head text-weight-medium">{{ $t('Archiving Now') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('Archiving Soon') }}</th>
          </tr>
        </thead>
        <tbody>

          <tr>
            <td colspan="2" class="pt-row-head">{{ $t('Archiving Model Runs') }}</td>
            <td v-if="nowRunCount > 0" class="pt-cell-right mono bg-negative text-white">{{ nowRunCount }}</td>
            <td v-else class="pt-cell-right mono">&nbsp;</td>
            <td v-if="alertRunCount> 0" class="pt-cell-right mono bg-warning">{{ alertRunCount }}</td>
            <td v-else class="pt-cell-right mono">&nbsp;</td>
          </tr>
          <tr>
            <td colspan="2" class="pt-row-head">{{ $t('Archiving Input Scenarios') }}</td>
            <td v-if="nowWorksetCount > 0" class="pt-cell-right mono bg-negative text-white">{{ nowWorksetCount }}</td>
            <td v-else class="pt-cell-right mono">&nbsp;</td>
            <td v-if="alertWorksetCount> 0" class="pt-cell-right mono bg-warning">{{ alertWorksetCount }}</td>
            <td v-else class="pt-cell-right mono">&nbsp;</td>
          </tr>

          <template v-for="mdl in archiveState.Model">
            <tr :key="'mdl-btn-' + (mdl.ModelDigest || 'no-digest')">
              <td colspan="4" class="pt-cell text-weight-medium">
                <span class="row">
                  <span class="col">
                    <q-btn
                      :to="'/model/' + mdl.ModelDigest"
                      no-caps
                      unelevated
                      dense
                      color="primary"
                      class="full-width rounded-borders bg-primary q-pr-xs"
                      >
                      <span>{{ mdl.ModelName + (mdl.Version ? ': ' + mdl.Version : '') }}</span>
                    </q-btn>
                  </span>
                </span>
              </td>
            </tr>
            <tr :key="'mdl-r-' + (mdl.ModelDigest || 'no-digest')">
              <td colspan="2" class="pt-row-head">{{ $t('Archiving Model Runs') }}</td>
              <td v-if="mdl.Run.length > 0" class="pt-cell-right mono bg-negative text-white">{{ mdl.Run.length }}</td>
              <td v-else class="pt-cell-right mono">&nbsp;</td>
              <td v-if="mdl.RunAlert.length > 0" class="pt-cell-right mono bg-warning">{{ mdl.RunAlert.length }}</td>
              <td v-else class="pt-cell-right mono">&nbsp;</td>
            </tr>
            <tr :key="'mdl-s-' + (mdl.ModelDigest || 'no-digest')">
              <td colspan="2" class="pt-row-head">{{ $t('Archiving Input Scenarios') }}</td>
              <td v-if="mdl.Set.length" class="pt-cell-right mono bg-negative text-white">{{ mdl.Set.length }}</td>
              <td v-else class="pt-cell-right mono">&nbsp;</td>
              <td v-if="mdl.SetAlert.length > 0" class="pt-cell-right mono bg-warning">{{ mdl.SetAlert.length }}</td>
              <td v-else class="pt-cell-right mono">&nbsp;</td>
            </tr>
          </template>

        </tbody>
      </table>

    </q-card-section>
  </q-card>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="lg" color="primary" />
  </q-inner-loading>

</q-page>
</template>

<script src="./archive-page.js"></script>

<style lang="scss" scope="local">
  .pt-table {
    text-align: left;
    border-collapse: collapse;
  }
  .pt-cell {
    padding: 0.25rem;
    border: 1px solid lightgrey;
    font-size: 0.875rem;
  }
  .pt-head {
    @extend .pt-cell;
    text-align: center;
    background-color: whitesmoke;
  }
  .pt-row-head {
    @extend .pt-cell;
    background-color: whitesmoke;
  }
  .pt-cell-left {
    text-align: left;
    @extend .pt-cell;
  }
  .pt-cell-right {
    text-align: right;
    @extend .pt-cell;
  }
  .pt-cell-center {
    text-align: center;
    @extend .pt-cell;
  }
</style>
