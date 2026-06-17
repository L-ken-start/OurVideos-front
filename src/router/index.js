import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Profile from '@/views/Profile.vue'
import VideoDetail from '@/views/VideoDetail.vue'
import SearchResults from '@/views/SearchResults.vue'
import UploadVideo from '@/views/UploadVideo.vue'
import MyVideos from '@/views/MyVideos.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  },
  {
    path: '/video/:id',
    name: 'VideoDetail',
    component: VideoDetail
  },
  {
    path: '/search',
    name: 'SearchResults',
    component: SearchResults
  },
  {
    path: '/upload',
    name: 'UploadVideo',
    component: UploadVideo
  },
  {
    path: '/my-videos',
    name: 'MyVideos',
    component: MyVideos
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const publicPaths = ['/login', '/register']

router.beforeEach((to) => {
  const token = localStorage.getItem('ourvideos_token')
  // 首页和视频相关页面允许未登录浏览
  if (to.path === '/' || to.path.startsWith('/video')) return
  if (!token && !publicPaths.includes(to.path)) {
    return '/login'
  }
})

export default router
