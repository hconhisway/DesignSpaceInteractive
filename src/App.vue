<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/designspace">Design Space</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>
  <RouterView />
</template>

<style>
  body, html {
    overflow: hidden;
  }
</style>

<style scoped>

header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  line-height: 2;
  max-height: 100vh;
  background-color: var(--vt-c-green-1);
}

header a:hover {
  color: var(--vt-c-text-light-2);
  background-color: transparent;
}

nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
  font-size: 2rem;
  text-align: center;
  margin-top: 0.5rem;
}

nav a {
  color: var(--color-text);
  transition: none;
}

nav a.router-link-exact-active {
  font-weight: bolder;
  color: var(--color-text);
}

/* nav a.router-link-exact-active:hover {
  background-color: transparent;
} */

nav a {
  display: inline-block;
  padding: 0 1rem;
  /* border-left: 1px solid var(--color-border); */
}

/* nav a:first-of-type {
  border: 1;
} */

/* header {
  display: flex;
  place-items: center;
  padding-right: calc(var(--section-gap) / 2);
} */

/* .logo {
  margin: 0 2rem 0 0;
} */


header .wrapper {
  display: flex;
  place-items: flex-start;
  flex-wrap: wrap;
}

/* nav {
  text-align: left;
  margin-left: -1rem;
  font-size: 1rem;
  padding: 1rem 0;
  margin-top: 1rem;
} */
</style>
