<template>
  <div class="gallery-wrapper">
    <!-- 左侧信息区域 -->
    <div class="info-panel">
      <div class="info-content">
        <div v-if="selectedItem">
          <div class="item-link">
            <a :href="selectedItem.link" target="_blank">{{ selectedItem.link }}</a>
          </div>
          <div class="item-description">{{ selectedItem.description }}</div>
        </div>
        <div v-else>
          <p>please select an item</p>
        </div>
      </div>
    </div>
    <!-- 重写右侧 gallery view -->
    <div class="gallery-panel">
      <div class="gallery-container">
        <div 
          v-for="item in parsedData" 
          :key="item.id"
          class="gallery-item"
          :class="{ 
            'selected': item.id === selectedItemId,
            'expanded': item.id === expandedItemId
          }"
          @click="handleItemClick(item)"
        >
          <div class="item-inner" @click.stop="toggleExpand(item)">
            <img
              v-if="hasValidImage(item)"
              :src="item.image"
              alt="Projection preview"
              class="gallery-image"
            />
            <div v-else class="default-item">
              {{ "NaN" }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Papa from 'papaparse'

export default {
  name: 'GalleryView',
  props: {
    csvData: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      parsedData: [],
      selectedItemId: null,
      expandedItemId: null // 新增：跟踪展开的项目
    }
  },
  computed: {
    selectedItem() {
      return this.parsedData.find(item => item.id === this.selectedItemId)
    }
  },
  watch: {
    csvData: {
      immediate: true, // 立即执行一次
      handler(newVal) {
        this.parseCSV(newVal)
      }
    }
  },
  methods: {
    parseCSV(csvString) {
      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.parsedData = results.data.map(item => ({
            ...item,
            id: item['#'],
            projection: this.parseProjection(item.projection)
          }))
        },
        error: (err) => {
          console.error('CSV解析错误:', err)
        }
      })
    },

    parseProjection(projectionStr) {
      try {
        return projectionStr
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      } catch {
        return []
      }
    },

    hasValidImage(item) {
      return item.image && item.image.toLowerCase() !== 'nan'
    },

    itemStyle(item) {
      return {
        width: this.hasValidImage(item) ? 'auto' : '200px',
        height: '100px'
      }
    },

    handleItemClick(item) {
      this.selectedItemId = item.id  // 记录当前点击的 item
      this.$emit('item-selected', item.projection)
    },
    
    // 修改：处理项目放大/缩小时也要更新选中状态
    toggleExpand(item) {
      // 同时更新选择状态，确保左侧面板能显示相应的信息
      this.selectedItemId = item.id;
      this.$emit('item-selected', item.projection);
      
      // 处理放大/缩小逻辑
      if (this.expandedItemId === item.id) {
        this.expandedItemId = null; // 如果点击的是当前放大项，则缩小
      } else {
        this.expandedItemId = item.id; // 否则放大该项
      }
    }
  }
}
</script>

<style scoped>
/* 修改整体布局 */
.gallery-wrapper {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 左侧布局 */
.info-panel {
  flex: 1;
  border-right: 1px solid #ccc;
  height: 100%;
  overflow-y: auto;
}

.info-content {
  padding: 15px;
}

/* 重写右侧布局为紧凑网格 */
.gallery-panel {
  flex: 2;
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.gallery-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  padding: 12px;
}

.gallery-item {
  position: relative;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 展开项目样式 */
.gallery-item.expanded {
  grid-column: span 4;
  grid-row: span 4;
  z-index: 10;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.item-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: transform 0.3s ease;
}

.gallery-item:hover .item-inner {
  border-color: #E45756;
}

.gallery-item.selected .item-inner {
  border: 2px solid #E45756;
}

.gallery-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.gallery-item.expanded .gallery-image {
  transform: scale(1); /* 确保是放大3倍 */
}

.default-item {
  padding: 8px;
  text-align: center;
  font-size: 0.9em;
  word-break: break-word;
}

.item-link a {
  font-weight: bold;
  color: inherit;
  text-decoration: none;
}

.item-link a:hover {
  text-decoration: underline;
}

.item-description {
  font-size: 0.9em;
  color: #666;
  margin-top: 8px;
}
</style>
