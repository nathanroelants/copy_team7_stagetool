import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import OndertekeningView from '../views/shared/OndertekeningView.vue'


const routes = [
  { path: '/', component: LoginView },
  { path: '/login', component: LoginView },
  { path: '/student', component: () => import('../views/student/DashboardView.vue') },
  { path: '/docent', component: () => import('../views/docent/DocentStudenten.vue') },
  { path: '/mentor', component: () => import('../views/mentor/DashboardView.vue') },
  { path: '/stagecommissie', component: () => import('../views/stagecommissie/StagecommissieStudenten.vue') },
  { path: '/administratie', component: () => import('../views/administratie/DashboardView.vue') },
  { path: '/stagecommissie/studenten/:stageId/voorstel', component: () => import('../views/stagecommissie/StagecommissieVoorstellen.vue') },
  { path: '/student/stages/:stageId/ondertekenen',   component: () => import('../views/shared/OndertekeningView.vue/index.js'), props: { rol: 'student' } },
  { path: '/docent/studenten/:stageId/ondertekenen', component: () => import('../views/shared/OndertekeningView.vue/index.js'), props: { rol: 'docent' } },
  { path: '/mentor/stages/:stageId/ondertekenen',    component: () => import('../views/shared/OndertekeningView.vue/index.js'), props: { rol: 'stagementor' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router