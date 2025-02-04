<template>
    <div class="gallery-container">
      <div 
        v-for="item in parsedData" 
        :key="item.id"
        class="gallery-item"
        :class="{ selected: item.id === selectedItemId }"
        :style="itemStyle(item)"
        @click="handleItemClick(item)"
      >
        <img
          v-if="hasValidImage(item)"
          :src="item.image"
          alt="Projection preview"
          class="gallery-image"
        />
        <div v-else class="default-item">
          {{ item.title }}
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
        selectedItemId: null  // 用于记录被点击的 item 的 id
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
          width: this.hasValidImage(item) ? 'auto' : '100px',
          height: '50px'
        }
      },
  
      handleItemClick(item) {
        this.selectedItemId = item.id  // 记录当前点击的 item
        this.$emit('item-selected', item.projection)
        // console.log(item.projection)
      }
    }
  }
  </script>
  
  <style scoped>
  .gallery-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 15px;
    max-width: 100%;
    overflow: auto;
  }
  
  .gallery-item {
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s;
  }
  
  .gallery-item:hover {
    border-color: #E45756;
  }
  
  /* 被选中的 item 边框加粗 */
  .gallery-item.selected {
    border: 3px solid #E45756;
  }
  
  .gallery-image {
    height: 100%;
    width: auto;
    object-fit: contain;
  }
  
  .default-item {
    padding: 8px;
    text-align: center;
    font-size: 0.9em;
    word-break: break-word;
  }
  </style>
  