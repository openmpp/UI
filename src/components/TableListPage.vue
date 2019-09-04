<template>

<div id="table-list-page" class="mdc-typography mdc-typography--body1">

  <div v-if="isTableList()">
    <ul class="main-list mdc-list mdc-list--two-line">

      <li v-for="t in TableList()" :key="'tt-' + t.Table.TableId" class="mdc-list-item">

        <span
          @click="showTableInfo(t)"
          class="om-note-link material-icons mdc-list-item__graphic"
          :title="t.Table.Name + ' notes'"
          :alt="t.Table.Name + ' notes'">description</span>
        <router-link
          :to="'/model/' + digest + '/run/' + pathNameDigest + '/table/' + t.Table.Name"
          class="ahref-next"
          :title="t.Table.Name"
          :alt="t.Table.Name"
          >
          <span class="mdc-list-item__text">
            <span class="mdc-list-item__primary-text">{{ t.Table.Name }}</span>
            <span class="mdc-list-item__secondary-text">{{ t.TableDescr }}</span>
          </span>
        </router-link>

      </li>

    </ul>
  </div>

  <table-info-dialog ref="noteDlg" id="table-note-dlg"></table-info-dialog>

</div>

</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import TableInfoDialog from './TableInfoDialog'

export default {
  components: { TableInfoDialog },

  props: {
    digest: '',
    nameDigest: ''
  },

  data () {
    return {
    }
  },

  computed: {
    // part of the route path: model run digest or run name if digest empty
    pathNameDigest () {
      let nd = this.nameDigest || ''
      if (nd === '') nd = this.theSelected.runDigestName
      return nd
    },
    ...mapGetters({
      theModel: GET.THE_MODEL,
      theSelected: GET.THE_SELECTED
    })
  },

  methods: {
    isTableList () { return Mdf.isTableTextList(this.theModel) },

    // array of TableTxt if model has table list
    TableList () {
      return Mdf.isTableTextList(this.theModel) ? this.theModel.TableTxt : []
    },

    // return description from DescrNote
    descrOf (t) {
      return Mdf.descrOfDescrNote(t)
    },

    // show table info
    showTableInfo (t) {
      this.$refs.noteDlg.showTableInfo(t.Table.Name, 0)
    }
  },

  mounted () {
    this.$emit('tab-mounted', 'table-list', {digest: this.digest, runOrSet: Mdf.RUN_OF_RUNSET, runSetKey: this.nameDigest})
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
