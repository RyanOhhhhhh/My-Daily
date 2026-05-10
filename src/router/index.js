import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/',
    component: () => import('../views/MainLayout.vue'),
    redirect: '/record/new',
    children: [
      {
        path: 'timeline',
        name: 'Timeline',
        component: () => import('../views/Timeline.vue'),
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('../views/MapView.vue'),
      },
      {
        path: 'record/new',
        name: 'NewRecord',
        component: () => import('../views/RecordEdit.vue'),
      },
      {
        path: 'record/:id',
        name: 'RecordDetail',
        component: () => import('../views/RecordDetail.vue'),
      },
      {
        path: 'record/:id/edit',
        name: 'EditRecord',
        component: () => import('../views/RecordEdit.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫：未登录跳转登录页
router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token')
  if (to.name !== 'Login' && !token) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
