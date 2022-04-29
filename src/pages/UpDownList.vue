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
            <td class="pt-cell-left  mono">{{ lastLogTimeStamp }}</td>
            <th class="pt-head text-weight-medium">{{ $t('Ready') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('In progress') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('Failed') }}</th>
            <th class="pt-head text-weight-medium">{{ $t('Total') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="2" class="pt-row-head">{{ $t('Downloads') }}</td>
            <td class="pt-cell-right mono">{{ readyDownCount }}</td>
            <td class="pt-cell-right mono">{{ progressDownCount }}</td>
            <td class="pt-cell-right mono">{{ errorDownCount }}</td>
            <td class="pt-cell-right mono">{{ totalDownCount }}</td>
          </tr>
          <tr>
            <td colspan="2" class="pt-row-head">{{ $t('Uploads') }}</td>
            <td class="pt-cell-right mono">{{ readyUpCount }}</td>
            <td class="pt-cell-right mono">{{ progressUpCount }}</td>
            <td class="pt-cell-right mono">{{ errorUpCount }}</td>
            <td class="pt-cell-right mono">{{ totalUpCount }}</td>
          </tr>
          <tr>
            <td colspan="6" class="pt-cell">
              <q-radio v-model="fastDownload" val="no"  :label="$t('Do full downloads, compatible with desktop model')" />
              <br />
              <q-radio v-model="fastDownload" val="yes" :label="$t('Do fast downloads, only to analyze output values')" />
            </td>
          </tr>
          <tr>
            <td colspan="6" class="bg-primary text-white pt-cell-left text-weight-medium">
              <span class="q-pl-xs">{{ $t('Upload scenario .zip') }}</span>
            </td>
          </tr>
          <tr v-if="isUploadEnabled">
            <td class="pt-cell">
              <q-btn
                @click="onUploadWorkset"
                :disable="!isUploadEnabled || !fileSelected"
                flat
                dense
                class="col-auto bg-primary text-white rounded-borders"
                icon="mdi-upload"
                :title="$t('Upload scenario .zip')"
                />
            </td>
            <td colspan="5" class="pt-cell">
              <q-file
                v-model="uploadFile"
                :disable="!isUploadEnabled || !digest"
                accept='.zip'
                outlined
                dense
                clearable
                hide-bottom-space
                class="col q-pl-xs"
                color="primary"
                :label="$t('Select input scenario .zip for upload')"
                >
              </q-file>
            </td>
          </tr>
          <tr v-if="isUploadEnabled">
            <td class="pt-cell">
              <q-checkbox
                v-model="isNoDigestCheck"
                :disable="!isUploadEnabled || !fileSelected"
                :title="$t('Ignore input scenario model digest (model version)')"
                />
            </td>
            <td colspan="6" class="pt-cell-left"><span class="q-pl-sm">{{ $t('Ignore input scenario model digest (model version)') }}</span></td>
          </tr>
        </tbody>
      </table>

    </q-card-section>
  </q-card>

  <q-expansion-item
    :disable="!isDownloadEnabled"
    v-model="downloadExpand"
    group="up-down-expand"
    switch-toggle-side
    expand-separator
    :label="$t('Downloads')"
    header-class="bg-primary text-white"
    class="q-ma-sm"
    >
  <q-card
    v-for="uds in downStatusLst" :key="'down-' + (uds.LogFileName || 'no-log')"
    class="up-down-card q-my-sm"
    >

    <q-card-section class="q-pb-sm">
      <div
        class="row reverse-wrap items-center"
        >
        <q-btn
          v-if="!isDeleteKind(uds.Kind)"
          @click="onFolderTreeClick('down', uds.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-file-tree"
          :title="(((folderSelected || '') !== uds.Folder || (upDownSelected || '') !== 'down') ? $t('Expand') : $t('Collapse')) + ': ' + uds.Folder"
          />
        <q-btn
          v-if="!isDeleteKind(uds.Kind) && !isProgress(uds.Status)"
          @click="onDeleteClick('down', uds.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-delete"
          :title="$t('Delete') + ': ' + uds.Folder"
          />
        <q-btn
          v-else
          disable
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-delete-clock"
          :title="$t('Deleting') + ': ' + uds.Folder"
          />
        <span class="col-auto no-wrap q-mr-xs">
          <q-btn
            :disable="!uds.Lines.length"
            @click="uds.isShowLog = !uds.isShowLog"
            no-caps
            unelevated
            dense
            color="primary"
            class="rounded-borders tab-switch-button q-pr-xs"
            :class="isReady(uds.Status) || isProgress(uds.Status) ? 'bg-primary' : 'bg-warning'"
            >
            <q-icon :name="uds.isShowLog ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
            <span>{{ uds.LogFileName }}</span>
          </q-btn>
        </span>
        <model-bar
          v-if="isModelKind(uds.Kind)"
          :model-digest="uds.ModelDigest"
          @model-info-click="doShowModelNote(uds.ModelDigest)"
          >
        </model-bar>
        <run-bar
          v-if="isRunKind(uds.Kind)"
          :model-digest="uds.ModelDigest"
          :run-digest="uds.RunDigest"
          @run-info-click="doShowRunNote(uds.ModelDigest,uds.RunDigest)"
          >
        </run-bar>
        <workset-bar
          v-if="isWorksetKind(uds.Kind)"
          :model-digest="uds.ModelDigest"
          :workset-name="uds.WorksetName"
          @set-info-click="doShowWorksetNote(uds.ModelDigest, uds.WorksetName)"
          >
        </workset-bar>
      </div>

    </q-card-section>
    <q-separator inset />

    <template v-if="uds.isShowLog">
      <q-card-section class="q-py-sm">
        <div>
          <pre>{{uds.Lines.join('\n')}}</pre>
        </div>
      </q-card-section>
      <q-separator inset />
    </template>

    <q-card-section class="q-pt-sm">

      <q-list>
        <q-item
          v-if="uds.IsZip"
          clickable
          tag="a"
          target="_blank"
          :href="'/download/' + encodeURIComponent(uds.ZipFileName)"
          class="q-pl-none"
          :title="$t('Download') + ' ' + uds.ZipFileName"
          >
          <q-item-section avatar>
            <q-avatar rounded icon="mdi-download-circle" size="md" font-size="1.25rem" color="primary" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ uds.ZipFileName }}</q-item-label>
            <q-item-label caption>{{ fileTimeStamp(uds.ZipModTime) }}<span>&nbsp;&nbsp;</span>{{ fileSizeStr(uds.ZipSize) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <template v-if="uds.IsFolder && uds.Folder === folderSelected && upDownSelected === 'down'">
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
  </q-expansion-item>

  <q-expansion-item
    :disable="!isUploadEnabled"
    v-model="uploadExpand"
    group="up-down-expand"
    switch-toggle-side
    expand-separator
    :label="$t('Uploads')"
    header-class="bg-primary text-white"
    class="q-ma-sm"
    >
  <q-card
    v-for="uds in upStatusLst" :key="'up-' + (uds.LogFileName || 'no-log')"
    class="up-down-card q-my-sm"
    >

    <q-card-section class="q-pb-sm">
      <div
        class="row reverse-wrap items-center"
        >
        <q-btn
          v-if="!isDeleteKind(uds.Kind)"
          @click="onFolderTreeClick('up', uds.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-file-tree"
          :title="(((folderSelected || '') !== uds.Folder || (upDownSelected || '') !== 'up') ? $t('Expand') : $t('Collapse')) + ': ' + uds.Folder"
          />
        <q-btn
          v-if="!isDeleteKind(uds.Kind) && !isProgress(uds.Status)"
          @click="onDeleteClick('up', uds.Folder)"
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-delete"
          :title="$t('Delete') + ': ' + uds.Folder"
          />
        <q-btn
          v-else
          disable
          flat
          dense
          class="col-auto bg-primary text-white rounded-borders q-mr-xs"
          icon="mdi-delete-clock"
          :title="$t('Deleting') + ': ' + uds.Folder"
          />
        <span class="col-auto no-wrap q-mr-xs">
          <q-btn
            :disable="!uds.Lines.length"
            @click="uds.isShowLog = !uds.isShowLog"
            no-caps
            unelevated
            dense
            color="primary"
            class="rounded-borders tab-switch-button q-pr-xs"
            :class="isReady(uds.Status) || isProgress(uds.Status) ? 'bg-primary' : 'bg-warning'"
            >
            <q-icon :name="uds.isShowLog ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
            <span>{{ uds.LogFileName }}</span>
          </q-btn>
        </span>
        <workset-bar
          v-if="isUploadKind(uds.Kind)"
          :model-digest="uds.ModelDigest"
          :workset-name="uds.WorksetName"
          @set-info-click="doShowWorksetNote(uds.ModelDigest, uds.WorksetName)"
          >
        </workset-bar>
      </div>
    </q-card-section>
    <q-separator inset />

    <template v-if="uds.isShowLog">
      <q-card-section class="q-py-sm">
        <div>
          <pre>{{uds.Lines.join('\n')}}</pre>
        </div>
      </q-card-section>
      <q-separator inset />
    </template>

    <q-card-section class="q-pt-sm">

      <q-list>
        <q-item
          v-if="uds.IsZip"
          clickable
          tag="a"
          target="_blank"
          :href="'/upload/' + encodeURIComponent(uds.ZipFileName)"
          class="q-pl-none"
          :title="$t('Download') + ' ' + uds.ZipFileName"
          >
          <q-item-section avatar>
            <q-avatar rounded icon="mdi-download-circle" size="md" font-size="1.25rem" color="primary" text-color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ uds.ZipFileName }}</q-item-label>
            <q-item-label caption>{{ fileTimeStamp(uds.ZipModTime) }}<span>&nbsp;&nbsp;</span>{{ fileSizeStr(uds.ZipSize) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <template v-if="uds.IsFolder && uds.Folder === folderSelected && upDownSelected === 'up'">
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
                @click="onFolderLeafClick(prop.node.label, '/upload/' + prop.node.link)"
                :href="'/upload/' + prop.node.link"
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
  </q-expansion-item>

  <model-info-dialog :show-tickle="modelInfoTickle" :digest="modelInfoDigest"></model-info-dialog>
  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="modelInfoDigest" :run-digest="runInfoDigest"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="modelInfoDigest" :workset-name="worksetInfoName"></workset-info-dialog>

  <refresh-workset-list
    v-if="digest"
    :digest="digest"
    :refresh-tickle="refreshTickle"
    :refresh-workset-list-tickle="refreshWsListTickle"
    @done="loadWsListWait = false"
    @wait="loadWsListWait = true">
  </refresh-workset-list>

  <delete-confirm-dialog
    @delete-yes="onYesUpDownDelete"
    :show-tickle="showDeleteDialogTickle"
    :item-name="folderToDelete"
    :kind="upDownToDelete"
    :dialog-title="$t('Delete download files') + '?'"
    >
  </delete-confirm-dialog>

  <q-inner-loading :showing="loadWsListWait">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

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

  // override card shadow inside of expansion item
  .q-expansion-item__content > div.up-down-card {
    box-shadow: $shadow-1;
  }
</style>
