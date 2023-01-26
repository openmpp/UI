<template>
<div class="text-body1">

  <q-card class="q-ma-sm">

    <q-card-section>

      <div class="row items-center full-width">

        <span class="col-auto q-mr-sm">
          <q-btn
            @click="onModelRunClick"
            :disable="isInitRun || !runOpts.runName || isNoTables"
            color="primary"
            class="rounded-borders q-pr-xs"
            >
            <q-icon name="mdi-run" class=" q-mr-xs"/>
            <span>{{ $t('Run the Model') }}</span>
          </q-btn>
        </span>

        <span class="col-grow">
          <q-btn
            @click="isRunOptsShow = !isRunOptsShow"
            no-caps
            unelevated
            :ripple="false"
            color="primary"
            align="left"
            class="full-width"
            >
            <q-icon :name="isRunOptsShow ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
            <span class="text-body1">{{ $t('Model Run Options') }}</span>
          </q-btn>
        </span>

      </div>

      <table v-show="isRunOptsShow">

        <tr>
          <td class="q-pr-xs"><span v-if="!runOpts.runName" class="text-negative text-weight-bold">* </span><span>{{ $t('Run Name') }}:</span></td>
          <td>
            <q-input
              v-model="runOpts.runName"
              maxlength="255"
              size="80"
              required
              @focus="onRunNameFocus"
              @blur="onRunNameBlur"
              :rules="[ val => (val || '') !== '' ]"
              outlined
              dense
              clearable
              hide-bottom-space
              :placeholder="$t('Name of the new model run') + ' (* ' + $t('Required') + ')'"
              :title="$t('Name of the new model run')"
              >
            </q-input>
          </td>
        </tr>

        <tr>
          <td class="q-pr-xs">{{ $t('Sub-Values (Sub-Samples)') }}:</td>
          <td>
            <q-input
              v-model="runOpts.subCount"
              type="number"
              maxlength="4"
              min="1"
              max="8192"
              :rules="[
                val => val !== void 0,
                val => val >= 1 && val <= 8192
              ]"
              outlined
              dense
              hide-bottom-space
              class="tc-max-width-10"
              input-class="tc-right"
              :title="$t('Number of sub-values (a.k.a. members or replicas or sub-samples)')"
              />
          </td>
        </tr>

        <tr>
          <td
            :disabled="!isReadonlyWorksetCurrent"
            class="q-pr-xs"
            >
            <q-checkbox v-model="useWorkset" :disable="!isReadonlyWorksetCurrent" :label="$t('Use Scenario') + ':'"/>
          </td>
          <td>
            <workset-bar
              :model-digest="digest"
              :workset-name="worksetCurrent.Name"
              @set-info-click="doShowWorksetNote"
              >
            </workset-bar>
          </td>
        </tr>

        <tr>
          <td
            :disabled="!isCompletedRunCurrent"
            class="q-pr-xs"
            >
            <q-checkbox
              v-model="useBaseRun"
              @click.native="onUseBaseRunClick"
              :disable="!isCompletedRunCurrent"
              :label="$t('Use Base Run') + ':'"/>
          </td>
          <td>
            <run-bar
              :model-digest="digest"
              :run-digest="runCurrent.RunDigest"
              @run-info-click="doShowRunNote"
              >
            </run-bar>
          </td>
        </tr>

        <tr
          v-for="(p, idx) in presetLst" :key="p.name"
          >
          <td class="q-pr-xs">
            <q-btn
              @click="doPresetSelected(presetLst[idx])"
              no-caps
              unelevated
              color="primary"
              align="between"
              class="rounded-borders full-width"
              >
              <span>{{ p.label }}</span>
              <q-icon name="mdi-menu-right" />
            </q-btn>
          </td>
          <td class="om-text-descr-title">{{ p.descr }}</td>
        </tr>

      </table>

    </q-card-section>

  </q-card>

  <q-card class="q-ma-sm">

    <q-expansion-item
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      >
      <template v-slot:header>
        <q-icon v-if="isNoTables" name="star" color="red" />
        <span>{{ $t('Output Tables') + ': ' + (tablesRetain.length !== tableCount ? (tablesRetain.length.toString() + ' / ' + tableCount.toString()) : $t('All')) }}</span>
      </template>

      <q-card-section
        class="q-pa-sm"
        >
        <template v-if="isNoTables">
          <span class="text-negative text-weight-bold">*&nbsp;</span><span>{{ $t('Please select output tables in order to run the model') }}</span>
        </template>
        <template v-else>
          <table-list
            :run-digest="''"
            :refresh-tickle="refreshTickle"
            :refresh-table-tree-tickle="refreshTableTreeTickle"
            :name-filter="tablesRetain"
            :is-in-list-clear="true"
            :in-list-clear-label="$t('Retain all output tables')"
            :is-remove="true"
            :is-remove-group="true"
            @table-remove="onTableRemove"
            @table-group-remove="onTableGroupRemove"
            @table-info-show="doShowTableNote"
            @table-group-info-show="doShowGroupNote"
            @table-clear-in-list="onRetainAllTables"
            >
          </table-list>
        </template>
      </q-card-section>

      <q-card-section
        class="primary-border-025 shadow-up-1 q-pa-sm"
        >
        <table-list
          :run-digest="''"
          :refresh-tickle="refreshTickle"
          :is-add="true"
          :is-add-group="true"
          @table-add="onTableAdd"
          @table-group-add="onTableGroupAdd"
          @table-info-show="doShowTableNote"
          @table-group-info-show="doShowGroupNote"
          >
        </table-list>
      </q-card-section>

    </q-expansion-item>

  </q-card>

  <q-card v-if="entityAttrCount > 0" class="q-ma-sm">

    <q-expansion-item
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      >
      <template v-slot:header>
        <span>{{ $t('Entities microdata') + ': ' + (entityAttrsUse.length !== entityAttrCount ? (entityAttrsUse.length.toString() + ' / ' + entityAttrCount.toString()) : $t('All')) }}</span>
        <span v-if="entityAttrsUse.length > 16">
          <q-icon name="mdi-exclamation-thick" color="red" class="bg-white q-pa-xs q-ml-md q-mr-xs"/><span>{{ $t('Excessive use of microdata may slow down model run or lead to failure') }}</span>
        </span>
      </template>

      <q-card-section
        class="q-pa-sm"
        >
        <template v-if="isNoEntityAttrsUse">
          <span>{{ $t('No entity microdata included into model run results') }}</span>
        </template>
        <template v-else>
          <entity-list
            :run-digest="''"
            :refresh-tickle="refreshTickle"
            :refresh-entity-tree-tickle="refreshEntityTreeTickle"
            :name-filter="entityAttrsUse"
            :is-in-list-enable="true"
            :is-in-list-clear="true"
            :in-list-clear-label="$t('Do not use entity microdata')"
            in-list-clear-icon="mdi-close-circle"
            :is-remove-entity-attr="true"
            :is-remove-entity="true"
            @entity-attr-remove="onAttrRemove"
            @entity-remove="onEntityRemove"
            @entity-attr-info-show="doShowAttrNote"
            @entity-info-show="doShowEntityNote"
            @entity-clear-in-list="onClearEntityAttrs"
            >
          </entity-list>
        </template>
      </q-card-section>

      <q-card-section
        class="primary-border-025 shadow-up-1 q-pa-sm"
        >
        <entity-list
          :run-digest="''"
          :refresh-tickle="refreshTickle"
          :is-add-entity-attr="true"
          :is-add-entity="true"
          @entity-attr-add="onAttrAdd"
          @entity-add="onEntityAdd"
          @entity-attr-info-show="doShowAttrNote"
          @entity-info-show="doShowEntityNote"
          >
        </entity-list>
      </q-card-section>

    </q-expansion-item>

  </q-card>

  <q-card class="q-ma-sm">

    <q-expansion-item
      v-model="langOptsExpanded"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      :label="$t('Description and Notes')"
      >

      <markdown-editor
        v-for="t in txtNewRun"
        :key="t.LangCode"
        :ref="'new-run-note-editor-' + t.LangCode"
        :the-key="t.LangCode"
        :the-descr="t.Descr"
        :descr-prompt="$t('Model run description') + ' (' + t.LangName + ')'"
        :the-note="t.Note"
        :note-prompt="$t('Model run notes') + ' (' + t.LangName + ')'"
        :description-editable="true"
        :notes-editable="true"
        :is-hide-save="true"
        :is-hide-cancel="true"
        class="q-px-sm q-py-xs"
      >
      </markdown-editor>

    </q-expansion-item>

  </q-card>

  <q-card class="q-ma-sm">
    <q-expansion-item
      v-model="advOptsExpanded"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      :label="$t('Advanced Run Options')"
      >
      <q-card-section>
        <table>

          <tr>
            <td class="q-pr-xs">{{ $t('Modelling Threads max') }}:</td>
            <td>
              <q-input
                v-model="runOpts.threadCount"
                type="number"
                maxlength="4"
                min="1"
                max="8192"
                :rules="[
                  val => val !== void 0,
                  val => val >= 1 && val <= 8192
                ]"
                outlined
                dense
                hide-bottom-space
                class="tc-max-width-10"
                input-class="tc-right"
                :title="$t('Maximum number of modelling threads')"
                />
            </td>
          </tr>

          <tr>
            <td class="q-pr-xs">{{ $t('Log Progress Percent') }}:</td>
            <td>
              <q-input
                v-model.number="runOpts.progressPercent"
                type="number"
                maxlength="3"
                min="1"
                max="100"
                :rules="[
                  val => val !== void 0,
                  val => val >= 1 && val <= 100
                ]"
                outlined
                dense
                hide-bottom-space
                class="tc-max-width-10"
                input-class="tc-right"
                :title="$t('Percent completed to log model progress')"
                />
            </td>
          </tr>

          <tr>
            <td class="q-pr-xs">{{ $t('Log Progress Step') }}:</td>
            <td>
              <q-input
                v-model.number="runOpts.progressStep"
                type="number"
                maxlength="8"
                min=0
                :rules="[
                  val => val !== void 0,
                  val => val >= 0
                ]"
                outlined
                dense
                hide-bottom-space
                class="tc-max-width-10"
                input-class="tc-right"
                :title="$t('Step to log model progress: number of cases or time passed')"
                />
            </td>
          </tr>
          <tr>
            <td class="q-pr-xs">{{ $t('Sparse Output Tables') }}:</td>
            <td class="tc-max-width-10 row panel-border rounded-borders">
              <q-space />
              <q-toggle
                v-model="runOpts.sparseOutput"
                :title="runOpts.sparseOutput ? $t('Use sparse output tables: do not store small values and zeros') : $t('Do not use sparse output tables: store all values')"
                />
            </td>
          </tr>

          <tr>
            <td class="q-pr-xs">{{ $t('Working Directory') }}:</td>
            <td>
              <q-input
                v-model="runOpts.workDir"
                maxlength="2048"
                size="80"
                @blur="onWorkDirBlur"
                outlined
                dense
                clearable
                hide-bottom-space
                :placeholder="$t('Relative path to working directory to run the model')"
                :title="$t('Path to working directory to run the model')"
                >
              </q-input>
            </td>
          </tr>

          <tr>
            <td class="q-pr-xs">{{ $t('CSV Directory') }}:</td>
            <td>
              <q-input
                v-model="runOpts.csvDir"
                maxlength="2048"
                size="80"
                @blur="onCsvDirBlur"
                outlined
                dense
                clearable
                hide-bottom-space
                :placeholder="$t('Relative path to parameters.csv directory')"
                :title="$t('Path to parameters.csv directory')"
                >
              </q-input>
            </td>
          </tr>

          <tr
            :disabled="!runOpts.csvDir"
            >
            <td class="q-pr-xs">{{ $t('CSV file(s) contain') }}:</td>
            <td class="tc-max-width-10 panel-border rounded-borders">
              <q-radio v-model="csvCodeId" val="enumCode" :label="$t('Enum Code')" class="q-pr-sm"/>
              <q-radio v-model="csvCodeId" val="enumId" :label="$t('Enum Id')" />
            </td>
          </tr>

          <tr
            :disabled="isEmptyProfileList"
            >
            <td class="q-pr-xs">{{ $t('Profile Name') }}:</td>
            <td>
              <q-select
                v-model="runOpts.profile"
                :options="profileLst"
                :disable="isEmptyProfileList"
                outlined
                dense
                clearable
                hide-bottom-space
                class="tc-min-width-10"
                :title="$t('Profile name in database to get model run options')"
                />
            </td>
          </tr>

          <tr
            :disabled="isEmptyRunTemplateList || runOpts.mpiNpCount > 0"
            >
            <td class="q-pr-xs">{{ $t('Model Run Template') }}:</td>
            <td>
              <q-select
                v-model="runOpts.runTmpl"
                :options="runTemplateLst"
                :disable="isEmptyRunTemplateList || runOpts.mpiNpCount > 0"
                outlined
                dense
                clearable
                hide-bottom-space
                class="tc-min-width-10"
                :title="$t('Template to run the model')"
                />
            </td>
          </tr>

          <template v-if="enableIni">
            <tr>
              <td class="q-pr-xs">
                <q-checkbox v-model="runOpts.useIni" :label="$t('Use INI-file') + ':'" />
              </td>
              <td>{{ runOpts.iniName }}</td>
            </tr>

            <tr v-if="enableIniAnyKey">
              <td
                :disabled="!runOpts.useIni"
                class="q-pr-xs"
                >
                <q-checkbox v-model="runOpts.iniAnyKey" :disable="!runOpts.useIni" :label="$t('Development options') + ':'"/>
              </td>
              <td>{{ runOpts.iniName }}</td>
            </tr>
          </template>

        </table>
      </q-card-section>
    </q-expansion-item>
  </q-card>

  <q-card class="q-ma-sm">
    <q-expansion-item
    v-model="mpiOptsExpanded"
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      :label="$t('Cluster Run Options')"
      >
      <q-card-section>
        <table>

          <tr>
            <td class="q-pr-xs">{{ $t('MPI Number of Processes') }}:</td>
            <td>
              <q-input
                v-model.number="runOpts.mpiNpCount"
                @change="onMpiNpCount"
                type="number"
                maxlength="5"
                min="0"
                max="65536"
                :rules="[
                  val => val !== void 0,
                  val => val >= 0 && val <= 65536
                ]"
                outlined
                dense
                hide-bottom-space
                class="tc-max-width-10"
                input-class="tc-right"
                :title="$t('Number of parallel processes to run')"
                />
            </td>
          </tr>

          <tr
            :disabled="!serverConfig.IsJobControl"
            >
            <td class="q-pr-xs">{{ $t('Use Jobs Service') }}:</td>
            <td class="tc-max-width-10 row panel-border rounded-borders">
              <q-space />
              <q-toggle
                @click.native="onMpiUseJobs"
                v-model="runOpts.mpiUseJobs"
                :disable="!serverConfig.IsJobControl"
                :title="runOpts.mpiUseJobs ? $t('Use jobs service to run the model') : $t('Do not use jobs service to run the model')"
                />
            </td>
          </tr>

          <tr
            :disabled="runOpts.mpiNpCount <= 0 && !runOpts.mpiUseJobs"
            >
            <td class="q-pr-xs">{{ $t('Use MPI Root for Modelling') }}:</td>
            <td class="tc-max-width-10 row panel-border rounded-borders">
              <q-space />
              <q-toggle
                v-model="runOpts.mpiOnRoot"
                :disable="runOpts.mpiNpCount <= 0 && !runOpts.mpiUseJobs"
                :title="runOpts.mpiOnRoot ? $t('Use MPI root process to run the model') : $t('Do not use MPI root process to run the model')"
                />
            </td>
          </tr>

          <tr
            :disabled="runOpts.mpiNpCount <= 0 && !runOpts.mpiUseJobs"
            >
            <td class="q-pr-xs">{{ $t('MPI Model Run Template') }}:</td>
            <td>
              <q-select
                v-model="runOpts.mpiTmpl"
                :options="mpiTemplateLst"
                :disable="runOpts.mpiNpCount <= 0 && !runOpts.mpiUseJobs"
                outlined
                dense
                clearable
                hide-bottom-space
                class="tc-min-width-10"
                :title="$t('Template to run the model')"
                />
            </td>
          </tr>

        </table>
      </q-card-section>
    </q-expansion-item>
  </q-card>

  <new-run-init
    v-if="isInitRun"
    :model-digest="digest"
    :run-opts="runOpts"
    :tables-retain="retainTablesGroups"
    :run-notes="newRunNotes"
    @done="doneNewRunInit"
    @wait="()=>{}">
  </new-run-init>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runCurrent.RunDigest"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetCurrent.Name"></workset-info-dialog>
  <table-info-dialog :show-tickle="tableInfoTickle" :table-name="tableInfoName" :run-digest="''"></table-info-dialog>
  <group-info-dialog :show-tickle="groupInfoTickle" :group-name="groupInfoName"></group-info-dialog>
  <entity-info-dialog :show-tickle="entityInfoTickle" :entity-name="entityInfoName"></entity-info-dialog>
  <entity-attr-info-dialog :show-tickle="attrInfoTickle" :entity-name="entityInfoName" :attr-name="attrInfoName"></entity-attr-info-dialog>

  <q-inner-loading :showing="loadWait">
    <q-spinner-gears size="md" color="primary" />
  </q-inner-loading>

</div>
</template>

<script src="./new-run.js"></script>

<style lang="scss" scope="local">
  .panel-border {
    border-width: 1px;
    border-style: solid;
    border-color: lightgrey;
  }
  .tc-right {
    text-align: right;
  }
  .tc-max-width-10 {
    max-width: 10rem;
  }
  .tc-min-width-10 {
    min-width: 10rem;
  }
  .primary-border-025 {
    border: 0.25rem solid $primary;
  }
</style>
