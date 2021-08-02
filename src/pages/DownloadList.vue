<template>
<div class="text-body1">

  <q-card
    class="q-ma-sm"
    >
    <q-card-section>

      <table class="pt-table">
        <thead>
          <tr>
            <th class="pt-cell">
              <q-btn
                v-if="serverConfig.AllowDownload"
                @click="logRefreshPauseToggle"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                :icon="!isLogRefreshPaused ? (((logRefreshCount % 2) === 1) ? 'mdi-autorenew' : 'mdi-sync') : 'mdi-play-circle-outline'"
                :title="!isLogRefreshPaused ? $t('Pause') : $t('Refresh')"
                />
              <q-btn
                v-else
                disable
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders q-mr-xs"
                icon="mdi-autorenew"
                :title="$t('Refresh')"
                />
            </th>
            <th class="pt-head text-weight-medium">{{ $t('Ready') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('In progress') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('Failed') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('Total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="pt-cell-left  mono">{{ lastLogTimeStamp }}</td>
            <td class="pt-cell-right mono">{{ readyLogCount }}</td>
            <td class="pt-cell-right mono">{{ progressLogCount }}</td>
            <td class="pt-cell-right mono">{{ errorLogCount }}</td>
            <td class="pt-cell-right mono">{{ totalLogCount }}</td>
          </tr>
        </tbody>
      </table>

    </q-card-section>
  </q-card>

  <q-card
    v-for="dl in downloadLogLst" :key="(dl.LogFileName || 'no-log') + '-' + (dl.LogNsTime || 0).toString()"
    class="q-ma-sm"
    >

    <q-card-section class="q-pb-sm">
      <div
        class="row reverse-wrap items-center"
        >
        <model-bar
          v-if="isModelKind(dl.Kind)"
          :model-digest="dl.ModelDigest"
          @model-info-click="doShowModelNote(dl.ModelDigest)"
          >
        </model-bar>
        <run-bar
          v-if="isRunKind(dl.Kind)"
          :model-digest="dl.ModelDigest"
          :run-digest="dl.RunDigest"
          @run-info-click="doShowRunNote(dl.ModelDigest,dl.RunDigest)"
          >
        </run-bar>
        <workset-bar
          v-if="isWorksetKind(dl.Kind)"
          :model-digest="dl.ModelDigest"
          :workset-name="dl.WorksetName"
          @set-info-click="doShowWorksetNote(dl.ModelDigest, dl.WorksetName)"
          >
        </workset-bar>
      </div>

      <div
        class="row reverse-wrap items-center q-pt-sm"
        >
        <q-btn
          @click="onFolderTreeClick(dl.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-file-tree"
          :title="((folderSelected || '') !== dl.Folder ? $t('Expand') : $t('Collapse')) + ': ' + dl.Folder"
          />
        <q-btn
          :disable="!dl.Lines.length"
          @click="dl.isShowLog = !dl.isShowLog"
          flat
          dense
          class="col-auto text-white rounded-borders q-mr-xs"
          :class="isReady(dl.Status) || isProgress(dl.Status) ? 'bg-primary' : 'bg-warning'"
          icon="mdi-text-subject"
          :title="dl.LogFileName"
          />
        <div
          class="col-auto"
          >
          <span>{{ dl.LogFileName }}</span><br />
          <span class="mono om-text-descr">{{ fileTimeStamp(dl.LogNsTime / 1000000) }}</span>
        </div>
      </div>

    </q-card-section>
    <q-separator inset />

    <template v-if="dl.isShowLog">
      <q-card-section class="q-pb-sm">
        <div>
          <pre>{{dl.Lines.join('\n')}}</pre>
        </div>
      </q-card-section>
      <q-separator inset />
    </template>

    <q-card-section>
      <q-list>

        <q-item
          v-if="dl.IsZip"
          clickable
          tag="a"
          target="_blank"
          :href="'/download/' + dl.ZipFileName"
          :title="$t('Download') + ' ' + dl.ZipFileName"
          >
          <q-item-section avatar>
            <q-avatar rounded icon="mdi-folder-zip-outline" size="md" font-size="1.25rem" color="primary" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ dl.ZipFileName }}</q-item-label>
            <q-item-label caption>{{ fileTimeStamp(dl.ZipModTime) }}<span>&nbsp;&nbsp;</span>{{ fileSizeStr(dl.ZipSize) }}</q-item-label>
          </q-item-section>
        </q-item>

        <template v-if="dl.IsFolder && dl.Folder === folderSelected">
          <q-item
            v-for="fi in downloadFileLst" :key="(fi.Path || 'no-path') + '-' + (fi.ModTime || 0).toString()"
            clickable
            tag="a"
            target="_blank"
            :href="'/download/' + fi.Path"
            :title="$t('Download') + ' ' + fi.Path"
            >
            <q-item-section avatar>
              <q-avatar rounded icon="mdi-file-download-outline" size="md" font-size="1.25rem" color="primary" text-color="white" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ fi.Path }}</q-item-label>
              <q-item-label caption>{{ fileTimeStamp(fi.ModTime) }}<span>&nbsp;&nbsp;</span>{{ fileSizeStr(fi.Size) }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>

      </q-list>
    </q-card-section>

  </q-card>

  <model-info-dialog :show-tickle="modelInfoTickle" :digest="modelInfoDigest"></model-info-dialog>
  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="modelInfoDigest" :run-digest="runInfoDigest"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="modelInfoDigest" :workset-name="worksetInfoName"></workset-info-dialog>

</div>
</template>

<script src="./download-list.js"></script>

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
