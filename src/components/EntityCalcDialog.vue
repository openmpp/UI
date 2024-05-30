<template>
<q-dialog v-model="showDlg" seamless position="bottom">
  <q-card>

    <q-bar class="bg-primary text-white">
      <q-btn
        @click="onApply()"
        :disable="!isEdited || !calcList.length || isAnyEmpty()"
        icon="mdi-check-bold"
        :label="$t('Apply')"
        outline rounded v-close-popup
        />
      <q-space />
      <q-btn icon="mdi-close" :label="$t('Cancel')" outline rounded v-close-popup />
    </q-bar>

    <q-card-section class="text-body1">
      <table class="om-p-table full-width">
          <thead>
            <tr>
              <th class="om-p-head-center text-weight-medium"></th>
              <th class="om-p-head-center text-weight-medium">{{ $t('Aggregation') }}</th>
              <th class="om-p-head-center text-weight-medium">{{ $t('Name') }}</th>
              <th class="om-p-head-center text-weight-medium">{{ $t('Id') }}</th>
            </tr>
          </thead>
        <tbody>
          <template v-for="(c, idx) in calcList">
            <tr :key="'cne-' + (c.name || idx.toString())">
              <td rowspan="2" class="om-p-cell">
                <q-btn
                  @click="onDelete(idx)"
                  unelevated
                  round
                  dense
                  class="col-auto text-primary round"
                  icon="mdi-delete"
                  :title="$t('Delete')"
                  :aria-label="$t('Delete')" />
              </td>
              <td class="om-p-cell mono">
                <q-input
                  v-model="c.calc"
                  maxlength="255"
                  size="80"
                  required
                  @blur="onCalcBlur"
                  :rules="[ val => (val || '') !== '' ]"
                  dense
                  outlined
                  hide-bottom-space
                  :placeholder="$t('Aggregation expression') + ' (' + $t('Required') + ')'"
                  :title="$t('Aggregation expression')"
                  >
                </q-input>
              </td>
              <td class="om-p-cell mono">{{ c.name }}&nbsp;</td>
              <td class="om-p-cell mono">{{ !!c.calcId ? c.calcId.toString() : '' }}</td>
            </tr>
            <tr :key="'clb-' + (c.name || idx.toString())">
              <td colspan="3" class="om-p-cell">
                <q-input
                  v-model="c.label"
                  maxlength="255"
                  size="80"
                  @blur="onDescrBlur"
                  dense
                  outlined
                  clearable
                  hide-bottom-space
                  :placeholder="$t('Description') + ' (' + $t('label') + ')'"
                  :title="$t('Description') + ' (' + $t('label') + ')'"
                  >
                </q-input>
              </td>
            </tr>
          </template>
          <tr>
            <td class="om-p-cell">
              <q-btn
                @click="onAppend()"
                :disable="isAnyEmpty()"
                unelevated
                round
                dense
                class="col-auto text-primary round"
                icon="mdi-plus-thick"
                :title="$t('Append')"
                :aria-label="$t('Append')" />
            </td>
            <td colspan="3" class="om-p-head"></td>
          </tr>
        </tbody>
      </table>
    </q-card-section>

  </q-card>
</q-dialog>
</template>

<script>
import * as Mdf from 'src/model-common'

export default {
  name: 'EntityCalcDialog',

  props: {
    showTickle: { type: Boolean, default: false, required: true },
    updateTickle: { type: Boolean, default: false },
    calcEnums: { type: Array, default: () => [] }
  },

  data () {
    return {
      showDlg: false,
      isEdited: false,
      calcList: []
    }
  },

  computed: {
  },

  watch: {
    updateTickle () {
      this.updateCalc()
    },
    showTickle () {
      this.updateCalc()
      this.showDlg = true
    }
  },
  methods: {
    // check if any calculation is empty
    isAnyEmpty () { return this.calcList.findIndex(c => (c?.calc || '').trim() === '') >= 0 },

    // check if there are any different values as resut of editing
    isAnyDiff () {
      if (this.calcList.length !== this.calcEnums.length) return true

      for (let k = 0; k < this.calcEnums.length; k++) {
        const ce = this.calcEnums[k]
        if (ce?.value !== this.calcList[k]?.calcId) return true
        if (ce?.name !== this.calcList[k]?.name) return true
        if (ce?.calc !== this.calcList[k]?.calc) return true
        if (ce?.label !== this.calcList[k]?.label) return true
      }
    },

    // copy calcEnums into calculation list for editing
    updateCalc () {
      this.isEdited = false
      this.calcList = []

      for (let k = 0; k < this.calcEnums.length; k++) {
        const ce = this.calcEnums[k]
        if (!(ce?.calc || '').trim()) continue

        const nId = (ce.value || 0) ? ce.value : k + Mdf.CALCULATED_ID_OFFSET
        const nm = ce.name || ('ex_' + nId.toString())
        this.calcList.push({
          calcId: nId,
          name: nm,
          calc: ce.calc.trim(),
          label: ce.label || nm
        })
      }
    },

    // send updated version of calculted enums
    onApply () {
      this.$emit('calc-list-apply', this.calcList)
    },

    // delete row from calculations list
    onDelete (idx) {
      if (idx < 0 || idx >= this.calcList.length) return
      this.calcList.splice(idx, 1)

      let nId = Mdf.CALCULATED_ID_OFFSET

      for (let k = 0; k < this.calcList.length; k++) {
        if ((this.calcList[k].calc || '').trim()) {
          this.calcList[k].calcId = nId
          this.calcList[k].name = 'ex_' + nId.toString()
          nId++
        } else {
          this.calcList[k].calcId = 0
          this.calcList[k].name = ''
        }
      }
      this.isEdited = this.isAnyDiff()
    },

    // append extra calculation row
    onAppend () {
      if (this.isAnyEmpty()) return

      let nId = Mdf.CALCULATED_ID_OFFSET
      for (const c of this.calcList) {
        if ((c.calc || '').trim()) nId++
      }

      const nm = 'ex_' + nId.toString()
      this.calcList.push({
        calcId: nId,
        name: nm,
        calc: '',
        label: nm
      })
      this.isEdited = this.isAnyDiff()
    },

    // calcultion blur: trim and check if any calculation is empty
    onCalcBlur (e) {
      for (let k = 0; k < this.calcList.length; k++) {
        if ((this.calcList[k]?.calc || '') === '' || typeof (this.calcList[k]?.calc || '') !== typeof 'string') {
          this.calcList[k].calc = ''
        } else {
          this.calcList[k].calc = this.calcList[k].calc.trim()
        }
      }

      let nId = Mdf.CALCULATED_ID_OFFSET

      for (let k = 0; k < this.calcList.length; k++) {
        if (this.calcList[k].calc) {
          this.calcList[k].calcId = nId
          this.calcList[k].name = 'ex_' + nId.toString()
          nId++
        } else {
          this.calcList[k].calcId = 0
          this.calcList[k].name = ''
        }
      }
      this.isEdited = this.isAnyDiff()
    },

    // description label blur: trim labels
    onDescrBlur (e) {
      for (let k = 0; k < this.calcList.length; k++) {
        if ((this.calcList[k]?.label || '') === '' || typeof (this.calcList[k]?.label || '') !== typeof 'string') {
          this.calcList[k].label = ''
        } else {
          this.calcList[k].label = this.calcList[k].label.trim()
        }
      }
      this.isEdited = this.isAnyDiff()
    }
  }
}
</script>
