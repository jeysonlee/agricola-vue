import { createRouter, createWebHistory } from '@ionic/vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    beforeEnter: (_to, _from, next) => {
      const auth = useAuthStore()
      if (auth.isAuthenticated) next('/tabs/home')
      else next()
    },
  },
  {
    path: '/tabs/',
    component: () => import('../views/TabsPage.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', name: 'Home', component: () => import('../views/HomePage.vue') },
      { path: 'users', name: 'Users', component: () => import('../views/users/UsersPage.vue') },
      { path: 'obreros', name: 'Obreros', component: () => import('../views/obreros/ListObrerosPage.vue') },
      { path: 'parcelas', name: 'Parcelas', component: () => import('../views/parcelas/ListParcelasPage.vue') },
      { path: 'tareas', name: 'Tareas', component: () => import('../views/tareas/ListTareasPage.vue') },
      { path: 'tareas/nueva', name: 'FormTarea', component: () => import('../views/tareas/FormTareaPage.vue') },
      { path: 'tareas/:id/editar', name: 'EditTarea', component: () => import('../views/tareas/FormTareaPage.vue') },
      { path: 'ventas', name: 'Ventas', component: () => import('../views/ventas/ListVentasPage.vue') },
      { path: 'cosechas', name: 'Cosechas', component: () => import('../views/cosechas/ListCosechasPage.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router
