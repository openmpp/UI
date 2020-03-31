import Vue from 'vue'
import Router from 'vue-router'
import ModelListPage from '@/components/ModelListPage'
import ModelPage from '@/components/ModelPage'
import ParameterListPage from '@/components/ParameterListPage'
import TableListPage from '@/components/TableListPage'
import RunListPage from '@/components/RunListPage'
import WorksetListPage from '@/components/WorksetListPage'
import ParameterPage from '@/components/ParameterPage'
import TablePage from '@/components/TablePage'
import NewRunPage from '@/components/NewRunPage'
import RunLogPage from '@/components/RunLogPage'
import SessionSettings from '@/components/SessionSettingsPage'
import LicensePage from '@/components/LicensePage'
import None404Page from '@/components/None404Page'
import UnderConstruction from '@/components/UnderConstructionPage'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      component: ModelListPage
    },
    {
      path: '/model/:digest',
      component: ModelPage,
      props: true,
      children: [
        {
          path: 'run-list',
          component: RunListPage,
          props: true
        },
        {
          path: 'set-list',
          component: WorksetListPage,
          props: true
        },
        {
          path: ':runOrSet/:nameOrDigest/parameter-list',
          component: ParameterListPage,
          props: true
        },
        {
          path: 'run/:nameOrDigest/table-list',
          component: TableListPage,
          props: true
        },
        {
          path: ':runOrSet/:nameOrDigest/parameter/:paramName',
          component: ParameterPage,
          props: true
        },
        {
          path: 'run/:nameOrDigest/table/:tableName',
          component: TablePage,
          props: true
        },
        {
          path: 'new-run-model/set/:nameOrDigest',
          component: NewRunPage,
          props: true
        },
        {
          path: 'run-log/:runStamp',
          component: RunLogPage,
          props: true
        },
        {
          path: '',
          component: RunListPage,
          props: true
        }
      ]
    },
    {
      path: '/service',
      component: UnderConstruction
    },
    {
      path: '/settings',
      component: SessionSettings
    },
    {
      path: '/license',
      component: LicensePage
    },
    {
      path: '*',
      component: None404Page
    }
  ]
})
