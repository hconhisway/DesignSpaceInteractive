<script setup lang="ts">
import { onMounted, ref, watch, defineProps } from 'vue';
import { drawDSTree } from '../utils/dsview';
import * as d3 from 'd3';

// const props = defineProps({
//   projectionList: {
//     type: Array,
//     required: true,
//     default: () => []
//   }
// });

const props = defineProps<{
  projectionList: string[] // 明确指定为字符串数组
}>();

const gElement = ref<SVGGElement | null>(null);
const svgDSV = ref<SVGSVGElement | null>(null);
let currentZoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

// 清理现有图形
const clearVisualization = () => {
  if (gElement.value) {
    d3.select(gElement.value)
      .selectAll('*')
      .remove();
  }
};

// 初始化缩放功能
const initZoom = () => {
  if (!svgDSV.value) return;
  
  const svg = d3.select<SVGSVGElement, unknown>(svgDSV.value);
  currentZoom = d3.zoom<SVGSVGElement, unknown>()
    .on('zoom', (event) => {
      d3.select(gElement.value).attr('transform', event.transform);
    });

  svg.call(currentZoom);
};

// 更新视图
const updateVisualization = () => {
  if (!gElement.value) return;
  
  clearVisualization();
//   drawDSTree(gElement.value);

  drawDSTree(gElement.value, props.projectionList);
};

// 初始化组件时
onMounted(() => {
  initZoom();
  updateVisualization();
//   if (props.projectionList.length > 0) {
//     updateVisualization();
//   }
});

// 监听projectionList变化
watch(
  () => [...props.projectionList], // 深度监听数组内容变化
  (newVal, oldVal) => {
    if (newVal.length !== oldVal.length || JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
      updateVisualization();
      
      // 重置缩放状态
    //   if (svgDSV.value && currentZoom) {
    //     d3.select(svgDSV.value)
    //       .transition()
    //       .duration(500)
    //       .call(currentZoom.transform, d3.zoomIdentity);
    //   }
    }
  }
);
</script>

<template>
  <div class="svg-container">
    <svg id="mainsvg" ref="svgDSV">
      <g ref="gElement"></g>
    </svg>
  </div>
</template>

<style scoped>
    .svg-container {
        /* background-color: var(--vt-c-green-1); */
        width: 100vw;
        height: 100%;
        display: flex;
    }

#mainsvg {
  width: 100%;
  height: 100%;
  /* border: 1px solid #e0e0e0; */
  /* background-color: #f8f9fa; */
}
</style>