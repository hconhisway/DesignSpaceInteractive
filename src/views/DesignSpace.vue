<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import DesignSpaceView from '../components/DesignspaceView.vue'
import GalleryView from '../components/GalleryView.vue';

export default defineComponent({
  components: {
    GalleryView,
    DesignSpaceView
  },
  setup() {
    const rawCsvData = ref('')
    const currentProjection = ref<string[]>([])

    // 加载CSV文件的异步方法
    const loadCSV = async () => {
      try {
        const csvModule = await import('@/assets/Gallery.csv?raw')
        rawCsvData.value = csvModule.default
        // const response = await fetch('../assets/Gallery.csv')
        // if (!response.ok) throw new Error('Failed to load CSV')
        // rawCsvData.value = await response.text()
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
      handleProjectionSelect
    }
  }
})
</script>

<template>
  <div class="designspace">
    <div class="column">
      <DesignSpaceView :projection-list="currentProjection" />
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