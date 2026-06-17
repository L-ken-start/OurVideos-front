[toolu_vrtx_01Bw6FTkD...] <script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { getToken, clearToken } from '@/utils/auth'

const router = useRouter()

// ---- 状态 ----
const searchQuery = ref('')
const isScrolled = ref(false)
const showUserMenu = ref(false)
const activeNav = ref('home')
const activeTag = ref('')
const loading = ref(true)

const trendingVideos = ref([])
const newReleases = ref([])
const recommendedVideos = ref([])
const carouselVideos = ref([])
const currentSlide = ref(0)
const slideDir = ref('right')  // 'left' | 'right'
let slideTimer = null

const navItems = [
  { key: 'home', label: '全部', category: '' },
  { key: 'movies', label: '电影', category: 'movie' },
  { key: 'series', label: '电视剧', category: 'series' },
  { key: 'anime', label: '动漫', category: 'anime' },
]

const tagItems = [
  { label: '全部', value: '' },
  { label: '科幻', value: '科幻' },
  { label: '冒险', value: '冒险' },
  { label: '动作', value: '动作' },
  { label: '喜剧', value: '喜剧' },
  { label: '悬疑', value: '悬疑' },
  { label: '剧情', value: '剧情' },
  { label: '犯罪', value: '犯罪' },
  { label: '奇幻', value: '奇幻' },
  { label: '战争', value: '战争' },
  { label: '动画', value: '动画' },
  { label: '恐怖', value: '恐怖' },
  { label: '爱情', value: '爱情' },
  { label: '纪录片', value: '纪录片' },
  { label: '历史', value: '历史' },
  { label: '武侠', value: '武侠' },
  { label: '家庭', value: '家庭' },
  { label: '青春', value: '青春' },
  { label: '励志', value: '励志' },
  { label: '谍战', value: '谍战' },
  { label: '古装', value: '古装' },
  { label: '都市', value: '都市' },
  { label: '职场', value: '职场' },
  { label: '机甲', value: '机甲' },
  { label: '灾难', value: '灾难' },
]

// ---- 工具函数 ----
function formatDuration(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function goVideo(id) {
  router.push(`/video/${id}`)
}

function isLoggedIn() {
  return !!getToken()
}

function handleLogout() {
  clearToken()
  showUserMenu.value = false
  router.push('/login')
}

function handleScroll() {
  isScrolled.value = window.scrollY > 60
}

function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  router.push(`/search?q=${encodeURIComponent(q)}`)
  searchQuery.value = ''
}

// ---- API 调用 ----
async function fetchHomeData(category = '', tag = '') {
  loading.value = true
  try {
    const [trendingRes, latestRes, recommendRes, featureRes] = await Promise.all([
      request.get('/videos', { params: { sort: 'popular', limit: 6, category, tag } }),
      request.get('/videos', { params: { sort: 'latest', limit: 6, category, tag } }),
      request.get('/videos', { params: { sort: 'rating', limit: 6, category, tag } }),
      request.get('/videos', { params: { sort: 'popular', limit: 5, category, tag } }),
    ])
    trendingVideos.value = trendingRes.data.videos || []
    newReleases.value = latestRes.data.videos || []
    recommendedVideos.value = recommendRes.data.videos || []
    carouselVideos.value = featureRes.data.videos || []
    currentSlide.value = 0
    startCarousel()
  } catch (err) {
    console.error('加载首页数据失败', err)
  } finally {
    loading.value = false
  }
}

function onNavClick(key) {
  activeNav.value = key
  const item = navItems.find(n => n.key === key)
  fetchHomeData(item?.category || '', activeTag.value)
}

function onTagClick(tag) {
  activeTag.value = tag
  const item = navItems.find(n => n.key === activeNav.value)
  fetchHomeData(item?.category || '', tag)
}

function nextSlide() {
  if (carouselVideos.value.length <= 1) return
  slideDir.value = 'right'
  currentSlide.value = (currentSlide.value + 1) % carouselVideos.value.length
}
function prevSlide() {
  if (carouselVideos.value.length <= 1) return
  slideDir.value = 'left'
  currentSlide.value = (currentSlide.value - 1 + carouselVideos.value.length) % carouselVideos.value.length
}
function goToSlide(idx) {
  slideDir.value = idx > currentSlide.value ? 'right' : 'left'
  currentSlide.value = idx
  resetCarousel()
}
function startCarousel() {
  clearInterval(slideTimer)
  if (carouselVideos.value.length <= 1) return
  slideTimer = setInterval(nextSlide, 5000)
}
function resetCarousel() {
  clearInterval(slideTimer)
  startCarousel()
}

// ---- 骨架屏 ----
const skeletonCount = 6

// ---- 生命周期 ----
onUnmounted(() => {
  clearInterval(slideTimer)
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  if (!isLoggedIn()) {
    router.push('/login')
    return
  }
  // URL 里有 q 参数 → 搜索模式
  const q = new URLSearchParams(window.location.search).get('q')
  if (q) {
    router.push({ path: '/', query: { q } })
  }
  fetchHomeData()
})

// 监听路由 query 变化 → 搜索
watch(() => router.currentRoute.value.query.q, (q) => {
  if (q) {
    loading.value = true
    request.get('/videos/search', { params: { q, limit: 24 } })
      .then(res => {
        trendingVideos.value = res.data.videos || []
        newReleases.value = []
        recommendedVideos.value = []
        carouselVideos.value = res.data.videos || []
        activeNav.value = ''
      })
      .catch(() => {})
      .finally(() => { loading.value = false })
  }
})
</script>

<template>
  <div class="home">
    <!-- 顶部导航 -->
    <header class="navbar" :class="{ scrolled: isScrolled }">
      <div class="nav-left">
        <router-link to="/" class="logo-link">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span class="logo-text">OurVideos</span>
        </router-link>
        <nav class="nav-links">
          <a v-for="item in navItems" :key="item.key" href="#" class="nav-item"
            :class="{ active: activeNav === item.key }"
            @click.prevent="onNavClick(item.key)">{{ item.label }}</a>
        </nav>
      </div>
      <div class="nav-right">
        <div class="search-box" :class="{ focused: searchQuery }">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="搜索视频..." class="search-input"
            @keyup.enter="handleSearch" />
        </div>
        <div class="user-menu" @click="showUserMenu = !showUserMenu">
          <div class="avatar">
            <svg viewBox="0 0 24 24" fill="currentColor" class="avatar-icon"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          </div>
          <Transition name="dropdown">
            <div v-if="showUserMenu" class="dropdown-menu">
              <div class="dropdown-item" @click.stop="router.push('/profile'); showUserMenu = false">个人中心</div>
              <div class="dropdown-item" @click.stop="router.push('/my-videos'); showUserMenu = false">我的视频</div>
              <div class="dropdown-item" @click.stop="router.push('/upload'); showUserMenu = false">视频投稿</div>
              <div class="dropdown-item logout" @click.stop="handleLogout">退出登录</div>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <!-- 标签分类条 -->
    <div class="tag-bar">
      <button
        v-for="t in tagItems" :key="t.value"
        class="tag-chip"
        :class="{ active: activeTag === t.value }"
        @click="onTagClick(t.value)"
      >{{ t.label }}</button>
    </div>

    <!-- 轮播 Banner -->
    <section class="hero" v-if="carouselVideos.length > 0">
      <div class="carousel-track">
        <Transition :name="'carousel-slide-' + slideDir" mode="out-in">
          <div class="hero-bg" :key="carouselVideos[currentSlide]?.id" :style="{ backgroundImage: `url(${carouselVideos[currentSlide]?.poster_url})` }">
            <div class="hero-overlay" />
            <div class="hero-gradient-bottom" />
          </div>
        </Transition>
      </div>
      <div class="hero-content" :key="'info-'+carouselVideos[currentSlide]?.id">
        <div class="hero-poster" @click="goVideo(carouselVideos[currentSlide]?.id)">
          <img :src="carouselVideos[currentSlide]?.poster_url" :alt="carouselVideos[currentSlide]?.title" />
        </div>
        <div class="hero-info">
          <div class="hero-tags" v-if="carouselVideos[currentSlide]?.tags">
            <span v-for="tag in carouselVideos[currentSlide]?.tags.split(',')" :key="tag" class="hero-tag">{{ tag.trim() }}</span>
          </div>
          <h1 class="hero-title">{{ carouselVideos[currentSlide]?.title }}</h1>
          <p class="hero-desc" v-if="carouselVideos[currentSlide]?.description">{{ carouselVideos[currentSlide]?.description }}</p>
          <div class="hero-meta">
            <span class="hero-rating" v-if="carouselVideos[currentSlide]?.rating">
              <svg viewBox="0 0 24 24" fill="#f5c518" class="star-icon"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {{ carouselVideos[currentSlide]?.rating?.toFixed(1) }}
            </span>
            <span class="hero-year" v-if="carouselVideos[currentSlide]?.year">{{ carouselVideos[currentSlide]?.year }}</span>
            <span v-if="carouselVideos[currentSlide]?.duration">{{ formatDuration(carouselVideos[currentSlide]?.duration) }}</span>
          </div>
          <div class="hero-actions">
            <button class="play-btn" @click="goVideo(carouselVideos[currentSlide]?.id)">
              <svg viewBox="0 0 24 24" fill="currentColor" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
              立即播放
            </button>
            <button class="info-btn" @click="goVideo(carouselVideos[currentSlide]?.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="info-icon">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              更多信息
            </button>
          </div>
        </div>
      </div>
      <!-- 左右箭头 -->
      <button class="carousel-arrow left" @click="prevSlide" v-if="carouselVideos.length > 1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="carousel-arrow right" @click="nextSlide" v-if="carouselVideos.length > 1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <!-- 圆点指示器 -->
      <div class="carousel-dots" v-if="carouselVideos.length > 1">
        <button
          v-for="(_, idx) in carouselVideos" :key="idx"
          class="dot" :class="{ active: idx === currentSlide }"
          @click="goToSlide(idx)"
        />
      </div>
    </section>

    <main class="main-content">
      <Transition name="page-fade" mode="out-in">
        <!-- 骨架屏 -->
        <div v-if="loading" :key="'skel-'+activeNav+'-'+activeTag" class="content-wrap">
          <section class="content-row" v-for="i in 2" :key="'skeleton-'+i">
            <div class="skeleton-title" />
            <div class="row-slider">
              <div class="skeleton-card" v-for="j in skeletonCount" :key="j">
                <div class="skeleton-thumb" />
                <div class="skeleton-line short" />
                <div class="skeleton-line long" />
              </div>
            </div>
          </section>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading && trendingVideos.length === 0" :key="'empty-'+activeNav+'-'+activeTag" class="content-wrap">
          <div class="empty-state">
            <svg viewBox="0 0 120 120" fill="none" class="empty-icon">
              <rect x="20" y="30" width="80" height="55" rx="8" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
              <polygon points="50,45 50,70 68,57.5" fill="rgba(255,255,255,0.15)"/>
              <line x1="30" y1="95" x2="90" y2="95" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
            </svg>
            <p class="empty-title">暂无视频</p>
            <p class="empty-desc">换个分类试试，或者稍后再来看看</p>
          </div>
        </div>

        <!-- 内容 -->
        <div v-else :key="'content-'+activeNav+'-'+activeTag" class="content-wrap">
        <section class="content-row" v-if="trendingVideos.length">
          <h2 class="row-title">热门推荐</h2>
          <div class="row-slider">
            <div v-for="item in trendingVideos" :key="item.id" class="video-card" @click="goVideo(item.id)">
              <div class="card-thumb">
                <img :src="item.poster_url" :alt="item.title" loading="lazy" />
                <div class="thumb-overlay"><div class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor" class="play-triangle"><path d="M8 5v14l11-7z"/></svg></div></div>
                <div class="card-badges">
                  <span class="rating-badge" v-if="item.rating">
                    <svg viewBox="0 0 24 24" fill="#f5c518" class="mini-star"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {{ item.rating?.toFixed(1) }}
                  </span>
                </div>
                <span class="duration-badge" v-if="item.duration">{{ formatDuration(item.duration) }}</span>
              </div>
              <div class="card-info">
                <h3 class="card-title">{{ item.title }}</h3>
                <span class="card-category">{{ item.category }}<span v-if="item.year"> · {{ item.year }}</span></span>
              </div>
            </div>
          </div>
        </section>

        <section class="content-row" v-if="newReleases.length">
          <h2 class="row-title">最新上线</h2>
          <div class="row-slider">
            <div v-for="item in newReleases" :key="item.id" class="video-card" @click="goVideo(item.id)">
              <div class="card-thumb">
                <img :src="item.poster_url" :alt="item.title" loading="lazy" />
                <div class="thumb-overlay"><div class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor" class="play-triangle"><path d="M8 5v14l11-7z"/></svg></div></div>
                <div class="card-badges"><span class="new-badge">NEW</span></div>
              </div>
              <div class="card-info">
                <h3 class="card-title">{{ item.title }}</h3>
                <span class="card-category">{{ item.category }}<span v-if="item.year"> · {{ item.year }}</span></span>
              </div>
            </div>
          </div>
        </section>

        <section class="content-row" v-if="recommendedVideos.length">
          <h2 class="row-title">为您推荐</h2>
          <div class="row-slider">
            <div v-for="item in recommendedVideos" :key="item.id" class="video-card" @click="goVideo(item.id)">
              <div class="card-thumb">
                <img :src="item.poster_url" :alt="item.title" loading="lazy" />
                <div class="thumb-overlay"><div class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor" class="play-triangle"><path d="M8 5v14l11-7z"/></svg></div></div>
              </div>
              <div class="card-info">
                <h3 class="card-title">{{ item.title }}</h3>
                <span class="card-category">{{ item.category }}<span v-if="item.year"> · {{ item.year }}</span></span>
              </div>
            </div>
          </div>
        </section>
        </div>
      </Transition>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <span class="footer-logo">OurVideos</span>
        <p class="footer-copy">&copy; {{ new Date().getFullYear() }} OurVideos. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>

/* ============ 全局容器 ============ */
.home {
  min-height: 100vh;
  margin: 0;
  background: #0d0d0d;
  color: #fff;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
}

/* ============ 顶部导航 ============ */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 56px; height: 68px;
  transition: background 0.4s;
  background: transparent;
}
.navbar.scrolled { background: rgba(13, 13, 13, 0.98); backdrop-filter: blur(16px); }
.nav-left { display: flex; align-items: center; gap: 40px; }
.logo-link { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.logo-icon { width: 30px; height: 30px; color: #e50914; }
.logo-text { font-size: 22px; font-weight: 700; color: #e50914; font-family: 'DM Serif Display', serif; letter-spacing: -0.5px; }
.nav-links { display: flex; align-items: center; gap: 4px; }
.nav-item { padding: 8px 14px; color: rgba(255,255,255,0.65); text-decoration: none; font-size: 13px; border-radius: 6px; transition: all 0.2s; }
.nav-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
.nav-item.active { color: #fff; font-weight: 600; }
.nav-right { display: flex; align-items: center; gap: 20px; }

/* ============ 标签分类条 ============ */
.tag-bar {
  position: fixed; top: 68px; left: 0; right: 0; z-index: 99;
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 12px 56px;
  background: transparent;
  backdrop-filter: blur(6px);
}
.tag-bar .tag-chip {
  padding: 6px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  white-space: nowrap;
}
.tag-bar .tag-chip:hover {
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.06);
}
.tag-bar .tag-chip.active {
  color: #e50914;
  font-weight: 600;
  background: transparent;
}
.search-box { display: flex; align-items: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0 14px; width: 240px; height: 38px; transition: all 0.3s; }
.search-box:focus-within, .search-box.focused { border-color: rgba(255,255,255,0.25); background: rgba(0,0,0,0.5); box-shadow: 0 0 0 3px rgba(229,9,20,0.12); width: 320px; }
.search-icon { width: 18px; height: 18px; color: rgba(255,255,255,0.35); flex-shrink: 0; }
.search-input { flex: 1; background: none; border: none; color: #fff; font-size: 13px; padding: 0 10px; outline: none; }
.search-input::placeholder { color: rgba(255,255,255,0.25); }
.user-menu { position: relative; cursor: pointer; }
.avatar { width: 36px; height: 36px; border-radius: 6px; background: linear-gradient(135deg, #e50914, #b20710); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
.avatar:hover { transform: scale(1.08); }
.avatar-icon { width: 22px; height: 22px; color: #fff; }
.dropdown-menu { position: absolute; top: 48px; right: 0; width: 180px; background: rgba(24,24,24,0.98); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 6px; backdrop-filter: blur(20px); box-shadow: 0 16px 48px rgba(0,0,0,0.6); }
.dropdown-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; color: rgba(255,255,255,0.7); font-size: 13px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
.dropdown-item.logout:hover { background: rgba(229,9,20,0.12); color: #ff6b6b; }
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.18s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px) scale(0.96); }

/* ============ Banner ============ */
.hero { position: relative; min-height: 680px; display: flex; align-items: center; padding: 88px 56px 0; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center top; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, #0d0d0d 0%, rgba(13,13,13,0.8) 30%, rgba(13,13,13,0.3) 60%, rgba(13,13,13,0.2) 100%), linear-gradient(0deg, #0d0d0d 0%, transparent 50%); }
.hero-gradient-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: linear-gradient(transparent, #0d0d0d); }

/* carousel */
.carousel-track { position: absolute; inset: 0; }
/* carousel slide */
.carousel-slide-right-enter-active,
.carousel-slide-right-leave-active,
.carousel-slide-left-enter-active,
.carousel-slide-left-leave-active { transition: all 0.5s ease; position: absolute; inset: 0; }
.carousel-slide-right-enter-from { transform: translateX(100%); opacity: 0.8; }
.carousel-slide-right-leave-to { transform: translateX(-30%); opacity: 0; }
.carousel-slide-left-enter-from { transform: translateX(-100%); opacity: 0.8; }
.carousel-slide-left-leave-to { transform: translateX(30%); opacity: 0; }
.carousel-arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; opacity: 0;
}
.hero:hover .carousel-arrow { opacity: 1; }
.carousel-arrow:hover { background: rgba(0,0,0,0.7); color: #fff; }
.carousel-arrow svg { width: 22px; height: 22px; }
.carousel-arrow.left { left: 20px; }
.carousel-arrow.right { right: 20px; }
.carousel-dots {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 5;
  display: flex; gap: 10px;
}
.dot {
  width: 28px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.2); border: none; cursor: pointer;
  transition: all 0.3s; padding: 0;
}
.dot.active { background: #e50914; width: 40px; }
.dot:hover { background: rgba(255,255,255,0.4); }
.hero-content { position: relative; z-index: 1; display: flex; align-items: center; gap: 48px; max-width: 1100px; }
.hero-poster { flex-shrink: 0; width: 260px; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 60px rgba(0,0,0,0.6); cursor: pointer; transition: transform 0.3s; }
.hero-poster:hover { transform: scale(1.04); }
.hero-poster img { width: 100%; display: block; }
.hero-info { flex: 1; min-width: 0; }
.hero-tags { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.hero-tag { padding: 5px 14px; background: rgba(229,9,20,0.15); border: 1px solid rgba(229,9,20,0.25); border-radius: 20px; font-size: 12px; color: #e50914; font-weight: 500; }
.hero-title { font-size: 48px; font-weight: 600; margin: 0 0 16px; line-height: 1.1; font-family: 'DM Serif Display', serif; }
.hero-desc { font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.5); margin: 0 0 20px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-width: 520px; }
.hero-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; color: rgba(255,255,255,0.5); font-size: 14px; }
.hero-rating { display: flex; align-items: center; gap: 6px; color: #fff; font-weight: 600; }
.star-icon { width: 20px; height: 20px; }
.hero-actions { display: flex; gap: 14px; }
.play-btn { display: flex; align-items: center; gap: 8px; padding: 14px 32px; background: #e50914; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.25s; font-family: inherit; }
.play-btn:hover { background: #f40612; transform: scale(1.04); box-shadow: 0 8px 30px rgba(229,9,20,0.4); }
.play-icon { width: 18px; height: 18px; }
.info-btn { display: flex; align-items: center; gap: 8px; padding: 14px 28px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.25s; font-family: inherit; }
.info-btn:hover { background: rgba(255,255,255,0.15); }
.info-icon { width: 18px; height: 18px; }

/* ============ 内容区 ============ */
.main-content { position: relative; z-index: 2; padding: 0 56px 40px; margin-top: 32px; }

/* ============ 页面切换过渡 ============ */
.page-fade-enter-active,
.page-fade-leave-active { transition: all 0.3s ease; }
.page-fade-enter-from { opacity: 0; transform: translateY(12px); }
.page-fade-leave-to { opacity: 0; transform: translateY(-8px); }
.content-row { margin-bottom: 48px; }
.row-title { font-size: 22px; font-weight: 600; margin: 0 0 16px; font-family: 'DM Serif Display', serif; }
.row-slider { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }

.video-card { cursor: pointer; transition: transform 0.25s; }
.video-card:hover { transform: translateY(-4px); }
.card-thumb { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 2/3; background: #1a1a1a; }
.card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.video-card:hover .card-thumb img { transform: scale(1.06); }
.thumb-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; }
.video-card:hover .thumb-overlay { opacity: 1; }
.play-circle { width: 40px; height: 40px; border-radius: 50%; background: rgba(229,9,20,0.9); display: flex; align-items: center; justify-content: center; }
.play-triangle { width: 14px; height: 14px; color: #fff; }
.card-badges { position: absolute; top: 8px; left: 8px; }
.rating-badge { display: flex; align-items: center; gap: 3px; padding: 3px 8px; background: rgba(0,0,0,0.7); border-radius: 4px; font-size: 12px; font-weight: 600; color: #fff; }
.mini-star { width: 12px; height: 12px; }
.new-badge { padding: 2px 8px; background: #e50914; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; }
.duration-badge { position: absolute; bottom: 8px; right: 8px; padding: 2px 6px; background: rgba(0,0,0,0.8); border-radius: 4px; font-size: 11px; color: #fff; }
.card-info { padding: 10px 2px 0; }
.card-title { font-size: 14px; font-weight: 600; margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
.card-category { font-size: 12px; color: rgba(255,255,255,0.4); }

/* ============ 骨架屏 ============ */
.skeleton-title { width: 120px; height: 22px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; margin-bottom: 16px; }
.skeleton-card { }
.skeleton-thumb { aspect-ratio: 2/3; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
.skeleton-line { height: 12px; background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; margin-top: 10px; }
.skeleton-line.short { width: 60%; }
.skeleton-line.long { width: 90%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ============ 空状态 ============ */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 0; }
.empty-icon { width: 120px; height: 120px; margin-bottom: 20px; }
.empty-title { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.3); margin: 0 0 8px; }
.empty-desc { font-size: 14px; color: rgba(255,255,255,0.15); margin: 0; }

/* ============ Footer ============ */
.footer { text-align: center; padding: 40px 0; border-top: 1px solid rgba(255,255,255,0.04); }
.footer-logo { font-size: 16px; font-weight: 600; color: #e50914; font-family: 'DM Serif Display', serif; }
.footer-copy { font-size: 12px; color: rgba(255,255,255,0.15); margin-top: 6px; }

@media (max-width: 800px) {
  .navbar { padding: 0 20px; }
  .search-box { width: 140px; }
  .search-box:focus-within { width: 200px; }
  .nav-links { display: none; }
  .hero { min-height: auto; padding: 88px 20px 0; }
  .hero-content { flex-direction: column; gap: 20px; }
  .hero-poster { width: 140px; }
  .hero-title { font-size: 26px; }
  .row-slider { grid-template-columns: repeat(3, 1fr); }
  .main-content { padding: 0 20px 32px; }
}
@media (max-width: 500px) {
  .row-slider { grid-template-columns: repeat(2, 1fr); }
}
</style>
