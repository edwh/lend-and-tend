<template>
  <div class="admin-layout">
    <!-- Top Navigation Bar -->
    <b-navbar id="admin-navbar" type="dark" class="navback" fixed="top">
      <b-navbar-brand class="ps-3">
        <span class="admin-brand">{{ branding.siteNameShort }} Admin</span>
      </b-navbar-brand>
      <b-navbar-nav class="ms-auto">
        <b-nav-item-dropdown v-if="currentImpersonationUser" right>
          <template #button-content>
            <span class="me-2">👤</span>
            Impersonating: {{ currentImpersonationUser }}
          </template>
          <b-dropdown-item @click="stopImpersonation">Stop Impersonating</b-dropdown-item>
        </b-nav-item-dropdown>
        <b-nav-item-dropdown v-if="!currentImpersonationUser" right>
          <template #button-content>
            <v-icon icon="bars" />
          </template>
          <b-dropdown-item @click="logout">Logout</b-dropdown-item>
        </b-nav-item-dropdown>
      </b-navbar-nav>
    </b-navbar>

    <div class="admin-container d-flex">
      <!-- Sidebar Navigation -->
      <div class="admin-sidebar">
        <nav class="sidebar-nav">
          <NuxtLink to="/admin" class="nav-item" :class="{ active: isActive('/admin') }">
            <span class="nav-icon">📊</span>
            <span class="nav-label">Dashboard</span>
          </NuxtLink>

          <NuxtLink to="/admin/users" class="nav-item" :class="{ active: isActive('/admin/users') }">
            <span class="nav-icon">👤</span>
            <span class="nav-label">Users</span>
          </NuxtLink>

          <NuxtLink to="/admin/messages" class="nav-item" :class="{ active: isActive('/admin/messages') }">
            <span class="nav-icon">💬</span>
            <span class="nav-label">Flagged Messages</span>
          </NuxtLink>

          <NuxtLink to="/admin/agreements" class="nav-item" :class="{ active: isActive('/admin/agreements') }">
            <span class="nav-icon">📋</span>
            <span class="nav-label">Agreements</span>
          </NuxtLink>
        </nav>
      </div>

      <!-- Main Content Area -->
      <div class="admin-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import branding from '@/branding.config'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentImpersonationUser = computed(() => {
  // Check if we're impersonating someone by looking for special header or cookie
  // This would be set by the server when impersonation is active
  return null
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function stopImpersonation() {
  try {
    await $fetch('/apiv2/admin/impersonate', { method: 'DELETE' })
    // Refresh user data
    await authStore.fetchUser()
    router.push('/admin')
  } catch (e) {
    console.error('Failed to stop impersonation', e)
  }
}

async function logout() {
  try {
    await authStore.logout()
    router.push('/')
  } catch (e) {
    console.error('Failed to logout', e)
  }
}
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #ffffff;
}

#admin-navbar {
  background-color: #1a2210 !important;
  border-bottom: 1px solid #ddd;
  padding: 0.75rem 1rem;

  .admin-brand {
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
}

.admin-container {
  flex: 1;
  margin-top: 60px;
}

.admin-sidebar {
  width: 220px;
  background-color: #f9faf5;
  border-right: 1px solid #ddd;
  padding: 1rem 0;
  position: fixed;
  height: calc(100vh - 60px);
  overflow-y: auto;
  left: 0;
  top: 60px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  list-style: none;
  padding: 0;
  margin: 0;

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    color: #5c6b4a;
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
    font-size: 0.95rem;

    &:hover {
      background-color: #f0f0f0;
      color: #1a2210;
    }

    &.active {
      background-color: #e8f5e0;
      border-left-color: #6b9e3c;
      color: #4a7a26;
      font-weight: 500;
    }

    .nav-icon {
      font-size: 1.1rem;
      width: 20px;
      text-align: center;
    }

    .nav-label {
      flex: 1;
    }
  }
}

.admin-content {
  flex: 1;
  margin-left: 220px;
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 60px);

  /* Use Bootstrap table styles */
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border: 1px solid #ddd;

    thead {
      background-color: #f9faf5;
      border-bottom: 2px solid #ddd;

      th {
        padding: 0.875rem 1rem;
        text-align: left;
        font-weight: 600;
        color: #1a2210;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid #eee;
        transition: background-color 0.15s ease;

        &:hover {
          background-color: #fafafa;
        }

        td {
          padding: 0.875rem 1rem;
          font-size: 0.95rem;
          color: #1a2210;
        }
      }
    }
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .admin-sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid #ddd;
    padding: 0.5rem 0;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0 1rem;

    .nav-item {
      flex-shrink: 0;
      border-bottom: 3px solid transparent;
      border-left: none;
      padding: 0.75rem 1rem;

      &.active {
        border-bottom-color: #6b9e3c;
        border-left: none;
      }
    }
  }

  .admin-content {
    margin-left: 0;
    padding: 1rem;
  }
}
</style>
