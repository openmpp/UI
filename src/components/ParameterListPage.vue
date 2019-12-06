<template>

<div :id="'parameter-list-page-' + runOrSet" class="mdc-typography mdc-typography--body1">

  <div v-if="isParamList()">
    <ul class="main-list mdc-list mdc-list--two-line">

      <li v-for="p in paramList()" :key="'pt-' + p.Param.ParamId" class="mdc-list-item">

        <span
          @click="showParamInfo(p)"
          class="om-note-link material-icons mdc-list-item__graphic"
          :title="p.Param.Name + ' info'"
          :alt="p.Param.Name + ' info'">description</span>
        <template v-if="nameDigest !== '/'">
          <router-link
            :to="'/model/' + digest + '/' + runOrSet + '/' + nameDigest + '/parameter/' + p.Param.Name"
            class="ahref-next"
            :title="p.Param.Name"
            :alt="p.Param.Name"
            >
            <span class="mdc-list-item__text">
              <span class="mdc-list-item__primary-text">{{ p.Param.Name }}</span>
              <span class="mdc-list-item__secondary-text">{{ descrOf(p) }}</span>
            </span>
          </router-link>
        </template>
        <template v-else>
          <span class="ahref-next">
            <span class="mdc-list-item__text">
              <span class="mdc-list-item__primary-text">{{ p.Param.Name }}</span>
              <span class="mdc-list-item__secondary-text">{{ descrOf(p) }}</span>
            </span>
          </span>
        </template>

      </li>

    </ul>
  </div>

  <param-info-dialog ref="noteDlg" id="param-note-dlg"></param-info-dialog>

</div>

</template>

<script>
import { mapGetters } from 'vuex'
import { GET } from '@/store'
import * as Mdf from '@/modelCommon'
import ParamInfoDialog from './ParameterInfoDialog'

export default {
  components: { ParamInfoDialog },

  props: {
    digest: { type: String, default: '' },
    runOrSet: { type: String, default: '' },
    nameDigest: { type: String, default: '' }
  },

  data () {
    return {
    }
  },

  watch: {
    routeKey () {
      this.$emit('tab-new-route',
        this.runOrSet === 'run' ? 'parameter-run-list' : 'parameter-set-list',
        { digest: this.digest, runOrSet: this.runOrSet, runSetKey: this.nameDigest, ptName: this.paramName })
    }
  },
  computed: {
    routeKey () {
      return Mdf.paramRouteKey(this.digest, this.paramName, this.runOrSet, this.nameDigest)
    },
    ...mapGetters({
      theModel: GET.THE_MODEL,
      runTextByDigest: GET.RUN_TEXT_BY_DIGEST,
      worksetTextByName: GET.WORKSET_TEXT_BY_NAME
    })
  },

  methods: {
    // array of ParamTxt if model has parameter list
    isParamList () { return Mdf.isParamTextList(this.theModel) },
    paramList () { return Mdf.isParamTextList(this.theModel) ? this.theModel.ParamTxt : [] },

    // return description from DescrNote
    descrOf (p) {
      return Mdf.descrOfDescrNote(p)
    },

    // show parameter info
    showParamInfo (p) {
      const prs = Mdf.paramRunSetByName(
        ((this.runOrSet || '') === 'set') ? this.worksetTextByName(this.nameDigest) : this.runTextByDigest(this.nameDigest),
        p.Param.Name)

      this.$refs.noteDlg.showParamInfo(p, prs)
    }
  },

  mounted () {
    this.$emit('tab-mounted',
      this.runOrSet === 'run' ? 'parameter-run-list' : 'parameter-set-list',
      { digest: this.digest, runOrSet: this.runOrSet, runSetKey: this.nameDigest })
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
