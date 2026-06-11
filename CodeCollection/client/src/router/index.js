import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

const routes = [
  { path: '/', component: LoginView },
  { path: '/login', component: LoginView },
  { path: '/student', component: () => import('../views/student/DashboardView.vue') },
  { path: '/docent', component: () => import('../views/docent/DocentStudenten.vue') },
  { path: '/stagementor', component: () => import('../views/stagementor/StagementorStudenten.vue') },
    { path: '/stagementorlogboeken', component: () => import('../views/stagementor/DashboardView.vue') },
  { path: '/stagecommissie', component: () => import('../views/stagecommissie/StagecommissieStudenten.vue') },
  { path: '/administratie', component: () => import('../views/administratie/DashboardView.vue') },
  { path: '/stagecommissie/studenten/:stageId/voorstel', component: () => import('../views/stagecommissie/StagecommissieVoorstellen.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router