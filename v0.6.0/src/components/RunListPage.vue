<template>

<div id="run-list-page" class="mdc-typography mdc-typography--body1">

  <div v-if="isRunList">
    <ul class="main-list mdc-list mdc-list--two-line">

      <li v-for="r in runTextList" :key="'rt-' + (r.RunDigest === digestSelected ? updateCount : 0) + '-' + r.RunDigest" class="mdc-list-item">

        <span
          @click="showRunInfo(r)"
          class="om-note-link mdc-list-item__graphic material-icons"
          :title="'About: ' + r.Name"
          :alt="'About: ' + r.Name">
            <span v-if="isSuccess(r)">description</span>
            <span v-else-if="isInProgress(r)">directions_run</span>
            <span v-else>error_outline</span>
        </span>

        <span
          @click="doRunLogClick(r.RunStamp)"
          class="om-note-link mdc-list-item__graphic material-icons"
          :title="'Run Log: ' + r.Name"
          :alt="'Run Log: ' + r.Name">
            <span>subject</span>
        </span>

        <span
          @click="doRunClick(r.RunDigest)"
          class="link-next"
          :title="r.Name"
          :alt="r.Name"
          >
          <span class="mdc-list-item__text">
            <span class="mdc-list-item__primary-text">{{ r.Name }}</span>
            <span class="item-line mdc-list-item__secondary-text"><span class="mono">{{lastTime(r)}} </span>{{ descrOf(r) }}</span>
          </span>
        </span>

      </li>

    </ul>
  </div>

  <run-info-dialog ref="runInfoDlg" id="run-info-dlg"></run-info-dialog>

</div>

</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import RunInfoDialog from './RunInfoDialog'

export default {
  components: { RunInfoDialog },

  props: {
    digest: { type: String, default: '' }
  },

  data () {
    return {
      digestSelected: '',
      updateCount: 0
    }
  },

  computed: {
    isRunList () { return Mdf.isRunTextList(this.runTextList) },

    ...mapGetters({
      runTextList: GET.RUN_TEXT_LIST
    })
  },

  methods: {
    lastTime (rt) { return Mdf.dtStr(rt.UpdateDateTime) },
    isSuccess (rt) { return Mdf.isRunSuccess(rt) },
    isInProgress (rt) { return Mdf.isRunInProgress(rt) },
    descrOf (rt) { return Mdf.descrOfTxt(rt) },

    // click on run: select this run as current run
    doRunClick (runDigest) {
      if ((runDigest || '') !== '') this.$emit('run-select', runDigest)
    },

    // click on run log: select this run as current run
    doRunLogClick (stamp) {
      this.$emit('run-log-select', stamp)
    },

    // update selected item: handler for run text loaded
    refreshItem (dgst) {
      this.digestSelected = dgst || ''
      this.updateCount++
    },

    // show run info
    showRunInfo (rt) {
      this.$refs.runInfoDlg.showRunInfo(rt)
    }
  },

  mounted () {
    this.$emit('tab-mounted', 'run-list', { digest: this.digest })
  }
}
</script>

<!-- local scope css: this component only -->
<style lang="scss" scoped>
  @import "@material/theme/mdc-theme";
  @import "@/om-mcw.scss";

  /* main body list */
  .main-list {
    padding-left: 0;
  }

  /* link to next page */
  .item-link-next {
    display: block;
    width: 100%;
    height: 100%;
    text-decoration: none;
    @extend .mdc-theme--text-primary-on-background;
  }
  .link-next {
    @extend .item-link-next;
    &:hover {
      cursor: pointer;
      background: rgba(0, 0, 0, 0.1);
    }
  }
  .ahref-next {
    @extend .item-link-next;
    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }
</style>
