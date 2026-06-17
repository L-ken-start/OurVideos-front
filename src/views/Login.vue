<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { message } from 'ant-design-vue'
import { setToken } from '@/utils/auth'

const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const particles = ref([])
const showPassword = ref(false)

let animFrame = null

onMounted(() => {
  const count = 50
  particles.value = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    speed: Math.random() * 0.3 + 0.1,
    opacity: Math.random() * 0.6 + 0.2,
    delay: Math.random() * 5
  }))
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})

const handleLogin = async () => {
  if (loading.value) return
  errorMsg.value = ''

  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    const { data } = await axios.post('/api/user/login', {
      username: username.value,
      password: password.value
    })
    setToken(data.token)
    message.success('登录成功')
    router.push('/')
  } catch (err) {
    console.log(err.response?.data)
    errorMsg.value = err.response?.data.error || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">

    <!-- 背景粒子 -->
    <div class="particles">
      <span
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: p.x + '%',
          top: p.y + '%',
          width: p.size + 'px',
          height: p.size + 'px',
          opacity: p.opacity,
          animationDelay: p.delay + 's',
          animationDuration: (3 / p.speed) + 's'
        }"
      />
    </div>

    <!-- 顶部导航 -->
    <header class="top-bar">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
        <span class="logo-text">OurVideos</span>
      </div>
    </header>

    <!-- 主体 -->
    <div class="main-content">
      <div class="login-wrapper">
        <!-- 左侧品牌区 -->
        <div class="brand-panel">
          <div class="brand-glow" />
          <div class="brand-content">
            <div class="brand-icon">
              <div class="play-btn">
                <div class="play-triangle" />
              </div>
              <div class="icon-ring" />
            </div>
            <h1 class="brand-title">OurVideos</h1>
            <p class="brand-desc">发现精彩视频，记录美好生活</p>
            <div class="brand-stats">
              <div class="stat">
                <span class="stat-num">10K+</span>
                <span class="stat-label">视频资源</span>
              </div>
              <div class="stat-divider" />
              <div class="stat">
                <span class="stat-num">50K+</span>
                <span class="stat-label">活跃用户</span>
              </div>
              <div class="stat-divider" />
              <div class="stat">
                <span class="stat-num">100+</span>
                <span class="stat-label">热门频道</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧登录表单 -->
        <div class="form-panel">
          <div class="form-header">
            <h2 class="form-title">欢迎回来</h2>
            <p class="form-subtitle">登录您的账户继续观看</p>
          </div>

          <Transition name="fade">
            <div v-if="errorMsg" class="error-bar">
              <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {{ errorMsg }}
            </div>
          </Transition>

          <form @submit.prevent="handleLogin" class="login-form">
            <div class="input-group">
              <label class="input-label" for="username">
                <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                用户名
              </label>
              <div class="input-wrapper">
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  placeholder="请输入用户名"
                  autocomplete="username"
                  :disabled="loading"
                  class="input-field"
                />
              </div>
            </div>

            <div class="input-group">
              <label class="input-label" for="password">
                <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                密码
              </label>
              <div class="input-wrapper">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  :disabled="loading"
                  class="input-field"
                />
                <button
                  type="button"
                  class="toggle-pwd"
                  @click="showPassword = !showPassword"
                  tabindex="-1"
                >
                  <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-options">
              <label class="remember-me">
                <input type="checkbox" class="checkbox" />
                <span class="checkmark" />
                <span class="remember-text">记住我</span>
              </label>
              <a href="#" class="forgot-link">忘记密码？</a>
            </div>

            <button
              type="button"
              class="submit-btn"
              :disabled="loading"
              :class="{ loading }"
              @click="handleLogin"
            >
              <span v-if="!loading" class="btn-content">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                立即登录
              </span>
              <span v-else class="btn-content">
                <span class="spinner" />
                登录中...
              </span>
            </button>

            <p class="register-tip">
              还没有账户？<a href="#" class="register-link" @click.prevent="router.push('/register')">立即注册</a>
            </p>
          </form>
        </div>
      </div>
    </div>

    <!-- 底部版权 -->
    <footer class="footer">
      <span>&copy; {{ new Date().getFullYear() }} OurVideos. All rights reserved.</span>
    </footer>
  </div>
</template>

<style scoped>
/* ========== 全局容器 ========== */
.login-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0a0a0a;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 背景网格 + 渐变 */
.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 30% 50%, rgba(229, 9, 20, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 70% 40%, rgba(229, 9, 20, 0.05) 0%, transparent 60%),
    linear-gradient(180deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%);
  z-index: 0;
}

.login-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 60px 60px;
  z-index: 0;
  pointer-events: none;
}

/* ========== 粒子 ========== */
.particles {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  background: rgba(229, 9, 20, 0.6);
  border-radius: 50%;
  animation: float linear infinite;
}

@keyframes float {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  10%  { opacity: var(--opacity, 0.4); }
  90%  { opacity: var(--opacity, 0.4); }
  100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
}

/* ========== 顶部导航 ========== */
.top-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 0 64px;
  height: 72px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: #e50914;
}

.logo-text {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}

/* ========== 主体 ========== */
.main-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
}

.login-wrapper {
  display: flex;
  width: 100%;
  min-height: 580px;
  background: rgba(20, 20, 20, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* ========== 左侧品牌区 ========== */
.brand-panel {
  position: relative;
  flex: 11;
  background: linear-gradient(160deg, #1a0000 0%, #0d0d0d 40%, #0a0a0a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 64px;
  overflow: hidden;
}

.brand-glow {
  position: absolute;
  top: -30%;
  left: -20%;
  width: 140%;
  height: 160%;
  background: radial-gradient(ellipse at center, rgba(229, 9, 20, 0.15) 0%, transparent 60%);
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50%      { transform: scale(1.1); opacity: 1; }
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

/* 播放按钮图标 */
.brand-icon {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto 40px;
}

.icon-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(229, 9, 20, 0.3);
  animation: ring-pulse 2s ease-out infinite;
}

@keyframes ring-pulse {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}

.play-btn {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #e50914, #b20710);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(229, 9, 20, 0.4);
  transition: transform 0.3s;
}

.play-btn:hover {
  transform: scale(1.08);
}

.play-triangle {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 18px 0 18px 32px;
  border-color: transparent transparent transparent #fff;
  margin-left: 6px;
}

.brand-title {
  font-size: 36px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 12px;
  letter-spacing: -1px;
}

.brand-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 48px;
}

.brand-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 28px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
}

/* ========== 右侧表单区 ========== */
.form-panel {
  flex: 9;
  padding: 80px 64px 80px 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-header {
  margin-bottom: 36px;
}

.form-title {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
}

.form-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

/* ========== 错误条 ========== */
.error-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(229, 9, 20, 0.12);
  border: 1px solid rgba(229, 9, 20, 0.3);
  color: #ff6b6b;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 24px;
  font-size: 14px;
  line-height: 1.4;
}

.error-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #e50914;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ========== 表单 ========== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5px;
}

.label-icon {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.4);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.25s;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.input-field:focus {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(229, 9, 20, 0.5);
  box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1);
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-pwd {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.2s;
  display: flex;
}

.toggle-pwd:hover {
  color: rgba(255, 255, 255, 0.6);
}

.eye-icon {
  width: 20px;
  height: 20px;
}

/* ========== 记住我 + 忘记密码 ========== */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.remember-me .checkbox {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s;
}

.remember-me .checkbox:checked + .checkmark {
  background: #e50914;
  border-color: #e50914;
}

.remember-me .checkbox:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.remember-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.forgot-link {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #e50914;
}

/* ========== 登录按钮 ========== */
.submit-btn {
  position: relative;
  width: 100%;
  padding: 14px 0;
  background: linear-gradient(135deg, #e50914, #b20710);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 1px;
  overflow: hidden;
  transition: all 0.3s;
}

.submit-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transition: left 0.5s;
}

.submit-btn:hover:not(:disabled)::before {
  left: 100%;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(229, 9, 20, 0.35);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

/* Loading 旋转器 */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== 注册提示 ========== */
.register-tip {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.register-link {
  color: #e50914;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.register-link:hover {
  opacity: 0.8;
}

/* ========== 底部 ========== */
.footer {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
}

/* ========== 响应式 ========== */
@media (max-width: 800px) {
  .top-bar {
    padding: 0 24px;
    height: 60px;
  }

  .login-wrapper {
    flex-direction: column;
    min-height: auto;
  }

  .brand-panel {
    flex: auto;
    padding: 44px 36px 24px;
  }

  .brand-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 20px;
  }

  .play-triangle {
    border-width: 10px 0 10px 18px;
    margin-left: 3px;
  }

  .brand-title {
    font-size: 24px;
  }

  .brand-desc {
    font-size: 13px;
    margin-bottom: 24px;
  }

  .brand-stats {
    display: none;
  }

  .form-panel {
    flex: auto;
    padding: 24px 36px 52px;
  }

  .form-title {
    font-size: 22px;
  }
}
</style>
