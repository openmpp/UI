<template>
<q-page class="text-body1">

  <q-card
    class="q-mx-sm"
    >
    <q-card-section>

      <table class="om-p-table">
        <thead>
          <tr>
            <th class="om-p-head-center">&nbsp;</th>
            <th colspan="2" class="om-p-head-center text-weight-medium mono">{{ fileTimeStamp(diskUseState.DiskUse.UpdateTs) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="om-p-head-left">{{ $t('Used by You') }}</td>
            <td colspan="2" class="om-p-cell-right mono" :class="isOver ? 'text-negative text-weight-bold' : ''">{{ fileSizeStr(diskUseState.DiskUse.TotalSize) }}</td>
          </tr>
          <tr>
            <td class="om-p-head-left">{{ $t('Your Quota') }}</td>
            <td
              colspan="2"
              class="om-p-cell-right mono"
              :class="(diskUseState.DiskUse.Limit > 0 && diskUseState.DiskUse.TotalSize >= diskUseState.DiskUse.Limit) ? 'text-negative text-weight-bold' : ''"
              >{{ diskUseState.DiskUse.Limit > 0 ? fileSizeStr(diskUseState.DiskUse.Limit) : 'unlimited' }}</td>
          </tr>
          <tr v-if="diskUseState.DiskUse.AllLimit > 0">
            <td class="om-p-head-left">{{ $t('Used by All') }}</td>
            <td
              colspan="2"
              class="om-p-cell-right mono"
              :class="(diskUseState.DiskUse.AllSize >= diskUseState.DiskUse.AllLimit) ? 'text-negative text-weight-bold' : ''"
              >{{ fileSizeStr(diskUseState.DiskUse.AllSize) }}</td>
          </tr>
          <tr v-if="diskUseState.DiskUse.AllLimit > 0">
            <td class="om-p-head-left">{{ $t('Quota for All') }}</td>
            <td
              colspan="2"
              class="om-p-cell-right mono"
              :class="(diskUseState.DiskUse.AllSize >= diskUseState.DiskUse.AllLimit) ? 'text-negative text-weight-bold' : ''"
              >{{ !!diskUseState.DiskUse.AllLimit ? fileSizeStr(diskUseState.DiskUse.AllLimit) : 'unlimited' }}</td>
          </tr>
          <tr v-if="isDownloadEnabled">
            <td class="om-p-head-left">{{ $t('Downloads') }}</td>
            <td class="om-p-cell-center">
              <q-btn
                :disable="!diskUseState.DiskUse.DownSize"
                @click="onAllDownloadDelete"
                unelevated
                round
                color="primary"
                :icon="diskUseState.DiskUse.DownSize > 0 ? 'mdi-delete' : 'mdi-delete-outline'"
                :title="$t('Delete all download files')"
                />
            </td>
            <td class="om-p-cell-right mono">{{ fileSizeStr(diskUseState.DiskUse.DownSize) }}</td>
          </tr>
          <tr v-if="isUploadEnabled">
            <td class="om-p-head-left">{{ $t('Uploads') }}</td>
            <td class="om-p-cell-center">
              <q-btn
                :disable="!diskUseState.DiskUse.UpSize"
                @click="onAllUploadDelete"
                unelevated
                round
                color="primary"
                :icon="diskUseState.DiskUse.UpSize > 0 ? 'mdi-delete' : 'mdi-delete-outline'"
                :title="$t('Delete all upload files')"
                />
            </td>
            <td class="om-p-cell-right mono">{{ fileSizeStr(diskUseState.DiskUse.UpSize) }}</td>
          </tr>
        </tbody>
      </table>

    </q-card-section>

    <q-card-section v-if="dbUseLst.length > 0" class="q-pt-sm">

      <table class="om-p-table">
        <thead>
          <tr>
            <th class="om-p-head-center text-weight-medium">{{ $t('Size') }}</th>
            <th class="om-p-head-center text-weight-medium">{{ $t('Updated') }}</th>
            <th class="om-p-head-center text-weight-medium">{{ $t('Model') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dbu in dbUseLst" :key="'md-' + (dbu.digest || 'no-digest')">
            <td class="om-p-cell-right mono">{{ fileSizeStr(dbu.size) }}</td>
            <td class="om-p-cell-left mono">{{ fileTimeStamp(dbu.modTs) }}</td>
            <td class="om-p-cell-left"
              ><template v-if="dbu.dir !== ''"><span class="om-text-descr">{{ dbu.dir + ' / ' + dbu.name  }}</span><br /></template>
              <span>{{ dbu.nameVer }}</span>
              <template v-if="dbu.descr !== ''"><br /><span class="om-text-descr">{{ dbu.descr }}</span></template></td>
          </tr>
        </tbody>
      </table>

    </q-card-section>

  </q-card>

  <delete-confirm-dialog
    @delete-yes="onYesAllUpDownDelete"
    :show-tickle="showAllDeleteDialogTickle"
    :item-name="(upDownToDelete === 'up' ? $t('All upload files') :  $t('All download files'))"
    :kind="upDownToDelete"
    :bodyText="upDownToDelete === 'up' ? $t('Delete all files in upload folder.') : $t('Delete all files in download folder.')"
    :dialog-title="(upDownToDelete === 'up' ? $t('Delete all upload files') :  $t('Delete all download files')) + '?'"
    >
  </delete-confirm-dialog>

</q-page>
</template>

<script src="./disk-use.js"></script>

<style lang="scss" scope="local">
</style>
