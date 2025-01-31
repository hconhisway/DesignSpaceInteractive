<script setup lang="ts">
import DesignspaceView from '../components/DesignspaceView.vue'
</script>

<template>
    <div class="designspace">
      <div class="column">
        <DesignspaceView />
      </div>
      <div class="divider"></div>
      <div class="column">
        <h1>This is an design space page</h1>
      </div>
      
    </div>
  </template>
  
  <style scoped>
    .designspace {
      
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: calc(92vh - 60px);
      margin-top: 50px;
      width: 97vw;
      flex-direction: column;
      /* flex-wrap: nowrap; */
    }

    .column {
      /* border: 2px solid #4b4a4a; */
      /* padding: 20px; */
      /* margin: 10px; */
      /* width: 40%; */
      /* border-radius: 10px; */
      /* height: 80vh; */
      /* overflow: hidden; */
      overflow: auto;
      flex: 1;
      /* padding: 1rem; */
      display: flex;
      flex-direction: column;
    }

    .divider {
      width: 98%;
      height: 4px;
      background-color: var(--color-border);
      margin: 0 1rem;
    }
  </style>
