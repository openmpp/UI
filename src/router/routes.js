const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout'),
    children: [
      { path: '', component: () => import('pages/ModelList') },
      {
        path: 'model/:digest',
        component: () => import('pages/ModelPage'),
        props: true,
        children: [
          {
            path: 'run-list',
            component: () => import('pages/RunList'),
            props: true
          },
          {
            path: 'set-list',
            component: () => import('pages/WorksetList'),
            props: true
          },
          {
            path: 'run/:runDigest/parameter/:parameterName',
            component: () => import('pages/ParameterPage'),
            props: true
          },
          {
            path: 'set/:worksetName/parameter/:parameterName',
            component: () => import('pages/ParameterPage'),
            props: true
          },
          {
            path: 'run/:runDigest/table/:tableName',
            component: () => import(/* webpackChunkName: "table-page" */ 'pages/TablePage'),
            props: true
          },
          {
            name: 'new-model-run',
            path: 'new-run',
            component: () => import('pages/NewRun'),
            props: true
          },
          {
            path: 'run-log/:stamp',
            component: () => import('pages/RunLog'),
            props: true
          },
          {
            path: 'updown-list',
            component: () => import('pages/UpDownList'),
            props: true
          }
        ]
      },
      {
        path: 'updown-list/model/:digest',
        component: () => import('pages/UpDownList'),
        props: true
      },
      { path: 'service-state', component: () => import('pages/ServiceState') },
      { path: 'settings', component: () => import('pages/SessionSettings') },
      { path: 'license', component: () => import('pages/LicensePage') }
    ]
  },
  // Always leave this as last one, but you can also remove it
  {
    path: '*',
    component: () => import('pages/None404')
  }
]

export default routes
