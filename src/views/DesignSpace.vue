<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import DesignSpaceView from '../components/DesignspaceView.vue'
import GalleryView from '../components/GalleryView.vue';

async function fetchDstreeData() {
  try {
      const response = await fetch('https://raw.githubusercontent.com/hconhisway/DesignSpaceInteractive/refs/heads/main/src/assets/dstree.json');
      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const dstreeData = await response.json();
      console.log(dstreeData); // 你可以在这里处理数据
      return dstreeData;
  } catch (error) {
      console.error('Error fetching dstree.json:', error);
      return null;
  }
}

export default defineComponent({
  components: {
    GalleryView,
    DesignSpaceView
  },
  setup() {
    const rawCsvData = ref('')
    const currentProjection = ref<string[]>([])
    const dstreeData = ref(null); // 改为响应式引用

    // 新增数据获取逻辑
    (async () => {
      dstreeData.value = await fetchDstreeData();
    })();
    // 加载CSV文件的异步方法
    const loadCSV = async () => {
      // try {
      //   const csvModule = await import('@/assets/Gallery.csv?raw')
      //   rawCsvData.value = csvModule.default
      //   // const response = await fetch('../assets/Gallery.csv')
      //   // if (!response.ok) throw new Error('Failed to load CSV')
      //   // rawCsvData.value = await response.text()
      // } catch (error) {
      //   console.error('Error loading CSV:', error)
      // }
      try {
      const response = await fetch(
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgVvRNgeNqgC1yObFsqNq0sKTkIPTJ_nI10fdhw75zXZ8ZtRyMFkZ2CR7awzDx4udBe243GwFuNlip/pub?gid=1078384481&single=true&output=csv'
      )
      
      if (!response.ok) throw new Error('Failed to load CSV from Google Sheets')
      rawCsvData.value = await response.text()
      
      } catch (error) {
        console.error('Error loading CSV:', error)
      }
    }
    const handleProjectionSelect = (projection: string[]) => {
      currentProjection.value = projection
    }

    // 组件挂载时加载CSV
    onMounted(() => {
      loadCSV()
    })

    return {
      rawCsvData,
      currentProjection,
      dstreeData,
      handleProjectionSelect
    }
  }
})
</script>

<template>
  <div class="designspace">
    <div class="column">
      <!-- <DesignSpaceView :projection-list="currentProjection" :dstree-data="dstreeData"/> -->
      <DesignSpaceView
        v-if="dstreeData" 
        :projection-list="currentProjection" 
        :dstree-data="dstreeData"
      />
    </div>
    <div class="divider"></div>
    <div class="column">
      <!-- 添加加载状态提示 -->
      <div v-if="!rawCsvData" class="loading">Loading data...</div>
      <GalleryView 
        v-else
        :csv-data="rawCsvData"
        @item-selected="handleProjectionSelect"
      />
    </div>
  </div>
</template>

<style scoped>
/* 保持原有样式不变 */
.designspace {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: calc(92vh - 60px);
  margin-top: 50px;
  width: 97vw;
  flex-direction: column;
}

.column {
  overflow: auto;
  flex: 1;
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