<template>

<div id="workset-list-page" class="mdc-typography mdc-typography--body1">

  <div v-if="isWsList">
    <ul class="main-list mdc-list mdc-list--two-line">

      <li v-for="w in worksetTextList" :key="'wt-' + (w.Name === nameSelected ? updateCount.toString() : '') + '-' + w.Name" class="mdc-list-item">

        <span
          @click="showWsInfo(w)"
          class="om-note-link material-icons mdc-list-item__graphic"
          :title="w.Name + ' notes'"
          :alt="w.Name + ' notes'">description</span>
        <span
          @click="doWsClick(w.Name)"
          class="link-next"
          :title="w.Name"
          :alt="w.Name"
          >
          <span class="mdc-list-item__text">
            <span class="mdc-list-item__primary-text">{{w.Name}}</span>
            <span class="item-line mdc-list-item__secondary-text">
              <span class="mono">{{lastTime(w)}} </span>{{descrOf(w)}}
            </span>
          </span>
        </span>

      </li>

    </ul>
  </div>

  <workset-info-dialog ref="wsInfoDlg" id="ws-info-dlg"></workset-info-dialog>

</div>

</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import WorksetInfoDialog from './WorksetInfoDialog'

export default {
  components: { WorksetInfoDialog },

  props: {
    digest: ''
  },

  data () {
    return {
      nameSelected: '',
      updateCount: 0
    }
  },

  computed: {
    isWsList () { return Mdf.isWorksetTextList(this.worksetTextList) },

    ...mapGetters({
      worksetTextList: GET.WORKSET_TEXT_LIST,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME
    })
  },

  methods: {
    lastTime (wt) { return Mdf.dtStr(wt.UpdateDateTime) },
    descrOf (wt) { return Mdf.descrOfTxt(wt) },

    // click on workset: select this workset as current
    doWsClick (name) {
      if ((name || '') !== '') this.$emit('workset-select', name)
    },

    // update selected item: handle for workset text loaded
    refreshItem (name) {
      this.nameSelected = name || ''
      this.updateCount = 2 - (this.updateCount + 1)
    },

    // on click: show workset info dialog
    showWsInfo (wt) {
      this.$refs.wsInfoDlg.showWsInfo(wt)
    }
  },

  mounted () {
    this.$emit('tab-mounted', 'workset-list', {digest: this.digest})
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
