<template>
<div class="text-body1">

  <q-card class="q-ma-sm">

    <q-card-section>

      <div class="row items-center full-width">

        <span class="col-auto q-mr-sm">
          <q-btn
            @click="onModelRun"
            :disable="isInitRun || !runOpts.runName"
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
            <span>{{ $t('Model Run Options') }}</span>
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

        <tr
          v-for="(p, idx) in presetLst" :key="p.name"
          >
          <td class="q-pr-xs">
            <q-btn
              @click="onPresetSelected(idx)"
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
          <td class="q-pr-xs">{{ $t('Modelling Threads') }}:</td>
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
              :title="$t('Number of modelling threads')"
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
              :workset-name="worksetNameSelected"
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
              :run-digest="runDigestSelected"
              @run-info-click="doShowRunNote"
              >
            </run-bar>
          </td>
        </tr>

      </table>

    </q-card-section>

  </q-card>

  <q-card class="q-ma-sm">

    <q-expansion-item
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
      switch-toggle-side
      expand-separator
      header-class="bg-primary text-white"
      :label="$t('Advanced Run Options')"
      >
      <q-card-section>
        <table>
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
            :disabled="runOpts.mpiNpCount <= 0"
            >
            <td class="q-pr-xs">{{ $t('Use MPI Root for Modelling') }}:</td>
            <td class="tc-max-width-10 row panel-border rounded-borders">
              <q-space />
              <q-toggle
                v-model="runOpts.mpiOnRoot"
                :disable="runOpts.mpiNpCount <= 0"
                :title="runOpts.mpiOnRoot ? $t('Use MPI root process to run the model') : $t('Do not use MPI root process to run the model')"
                />
            </td>
          </tr>

          <tr
            :disabled="runOpts.mpiNpCount <= 0"
            >
            <td class="q-pr-xs">{{ $t('MPI Model Run Template') }}:</td>
            <td>
              <q-select
                v-model="runOpts.mpiTmpl"
                :options="mpiTemplateLst"
                :disable="runOpts.mpiNpCount <= 0"
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
    :run-notes="newRunNotes"
    @done="doneNewRunInit"
    @wait="()=>{}">
  </new-run-init>

  <run-info-dialog :show-tickle="runInfoTickle" :model-digest="digest" :run-digest="runDigestSelected"></run-info-dialog>
  <workset-info-dialog :show-tickle="worksetInfoTickle" :model-digest="digest" :workset-name="worksetNameSelected"></workset-info-dialog>

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
</style>
