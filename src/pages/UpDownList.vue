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
          <tr>
            <td colspan="5" class="pt-cell">
              <q-radio v-model="fastDownload" val="no"  :label="$t('Do full downloads, compatible with desktop model')" />
              <br />
              <q-radio v-model="fastDownload" val="yes" :label="$t('Do fast downloads, only to analyze output values')" />
            </td>
          </tr>
          <tr>
            <td colspan="5" class="pt-cell">
              <q-uploader
                :disable="!serverConfig.AllowUpload || !digest"
                :url="uploadUrl"
                @uploading="onStartUpload"
                @uploaded="onDoneUpload"
                @failed="onFailUpload"
                accept=".zip"
                no-thumbnails
                class="full-width"
                :label="$t('Upload scenario .zip')"
                />
            </td>
          </tr>
        </tbody>
      </table>

    </q-card-section>
  </q-card>

  <q-card
    v-for="dl in downloadLst" :key="(dl.LogFileName || 'no-log') + '-' + (dl.LogModTime || 0).toString() + '-' + (dl.FolderModTime || 0).toString() + '-' + (dl.ZipModTime || 0).toString()"
    class="q-ma-sm"
    >

    <q-card-section class="q-pb-sm">
      <div
        class="row reverse-wrap items-center"
        >
        <q-btn
          v-if="!isDeleteKind(dl.Kind)"
          @click="onFolderTreeClick(dl.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-file-tree"
          :title="((folderSelected || '') !== dl.Folder ? $t('Expand') : $t('Collapse')) + ': ' + dl.Folder"
          />
        <q-btn
          v-if="!isDeleteKind(dl.Kind) && !isProgress(dl.Status)"
          @click="onDeleteClick(dl.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-delete"
          :title="$t('Delete') + ': ' + dl.Folder"
          />
        <q-btn
          v-else
          disable
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-delete-clock"
          :title="$t('Deleting') + ': ' + dl.Folder"
          />
        <span class="col-auto no-wrap q-mr-xs">
          <q-btn
            :disable="!dl.Lines.length"
            @click="dl.isShowLog = !dl.isShowLog"
            no-caps
            unelevated
            dense
            color="primary"
            class="rounded-borders tab-switch-button"
            :class="isReady(dl.Status) || isProgress(dl.Status) ? 'bg-primary' : 'bg-warning'"
            >
            <q-icon :name="dl.isShowLog ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
            <span>{{ dl.LogFileName }}</span>
          </q-btn>
        </span>
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

    </q-card-section>
    <q-separator inset />

    <template v-if="dl.isShowLog">
      <q-card-section class="q-py-sm">
        <div>
          <pre>{{dl.Lines.join('\n')}}</pre>
        </div>
      </q-card-section>
      <q-separator inset />
    </template>

    <q-card-section class="q-pt-sm">

      <q-list>
        <q-item
          v-if="dl.IsZip"
          clickable
          tag="a"
          target="_blank"
          :href="'/download/' + encodeURIComponent(dl.ZipFileName)"
          class="q-pl-none"
          :title="$t('Download') + ' ' + dl.ZipFileName"
          >
          <q-item-section avatar>
            <q-avatar rounded icon="mdi-folder-download" size="md" font-size="1.25rem" color="primary" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ dl.ZipFileName }}</q-item-label>
            <q-item-label caption>{{ fileTimeStamp(dl.ZipModTime) }}<span>&nbsp;&nbsp;</span>{{ fileSizeStr(dl.ZipSize) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <template v-if="dl.IsFolder && dl.Folder === folderSelected">
        <div
          class="row no-wrap items-center full-width"
          >
          <q-btn
            v-if="isAnyFolderDir"
            flat
            dense
            class="col-auto bg-primary text-white rounded-borders q-mr-xs om-tree-control-button"
            :icon="isFolderTreeExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
            :title="isFolderTreeExpanded ? $t('Collapse all') : $t('Expand all')"
            @click="doToogleExpandFolderTree"
            />
          <span class="col-grow">
            <q-input
              ref="folderTreeFilterInput"
              debounce="500"
              v-model="folderTreeFilter"
              outlined
              dense
              :placeholder="$t('Find files...')"
              >
              <template v-slot:append>
                <q-icon v-if="folderTreeFilter !== ''" name="cancel" class="cursor-pointer" @click="resetFolderFilter" />
                <q-icon v-else name="search" />
              </template>
            </q-input>
          </span>
        </div>

        <div class="q-px-sm">
          <q-tree
            ref="folderTree"
            :nodes="folderTreeData"
            node-key="key"
            :filter="folderTreeFilter"
            :filter-method="doFolderTreeFilter"
            :no-results-label="$t('No files found')"
            :no-nodes-label="$t('Server offline or no files found')"
            >
            <template v-slot:default-header="prop">

              <div
                v-if="prop.node.isGroup"
                class="row no-wrap items-center full-width"
                >
                <div class="col">
                  <span>{{ prop.node.label }}<br />
                  <span class="mono om-text-descr">{{ prop.node.descr }}</span></span>
                </div>
              </div>

              <a
                v-if="!prop.node.isGroup"
                @click="onFolderLeafClick(prop.node.label, '/download/' + prop.node.link)"
                :href="'/download/' + prop.node.link"
                target="_blank"
                :download="prop.node.label"
                :title="$t('Download') + ' ' + prop.node.label"
                class="row no-wrap items-center full-width cursor-pointer om-tree-leaf file-link"
                >
                <span class="text-primary">{{ prop.node.label }}<br />
                <span class="mono om-text-descr">{{ prop.node.descr }}</span></span>
              </a>

            </template>
          </q-tree>
        </div>

      </template>

    </q-card-section>

  </q-card>

  <model-info-dialog :show-tickle="modelInfoTickle" :digest="modelInfoDigest"></model-info-dialog>
  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="modelInfoDigest" :run-digest="runInfoDigest"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="modelInfoDigest" :workset-name="worksetInfoName"></workset-info-dialog>

  <delete-confirm-dialog
    @delete-yes="onYesDownloadDelete"
    :show-tickle="showDeleteDialogTickle"
    :item-name="folderToDelete"
    :dialog-title="$t('Delete download files') + '?'"
    >
  </delete-confirm-dialog>

</div>
</template>

<script src="./updown-list.js"></script>

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

  .tab-switch-container {
    margin-right: 1px;
  }
  .tab-switch-button {
    border-top-right-radius: 1rem;
  }
  .file-link {
    text-decoration: none;
    // display: inline-block;
  }
</style>
