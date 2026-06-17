import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

const routes = [
  { path: '/', component: LoginView },
  { path: '/login', component: LoginView },
  { path: '/student', component: () => import('../views/student/MijnStageView.vue') },
  { path: '/studentlogboeken', component: () => import('../views/student/StudentLogboeken.vue') },
  { path: '/student/documenten', component: () => import('../views/student/StudentLogboeken.vue') },
  { path: '/student/evaluatie', component: () => import('../views/student/StudentEvaluatieView.vue') },
  { path: '/docent', component: () => import('../views/docent/DocentStudenten.vue') },
  { path: '/docent/logboeken/:studentId', component: () => import('../views/docent/DocentLogboeken.vue') },
  { path: '/stagementor', component: () => import('../views/stagementor/StagementorStudenten.vue') },
  { path: '/stagementorlogboeken/:studentId', component: () => import('../views/stagementor/StagementorLogboeken.vue') },
  { path: '/stagecommissie', component: () => import('../views/stagecommissie/StagecommissieStudenten.vue') },
  { path: '/stagecommissie/studenten/:stageId/voorstel', component: () => import('../views/stagecommissie/StagecommissieVoorstellen.vue') },
  { path: '/administratie', component: () => import('../views/administratie/AccountbeheerView.vue') },
  { path: '/administratie/competentiebeheer', component: () => import('../views/administratie/CompetentieBeheer.vue') },
  { path: '/kies-rol', component: () => import('../views/KiesRolView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router