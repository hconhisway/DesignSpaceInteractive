<script setup lang="ts">
    import { onMounted, ref } from 'vue';
    import { drawDSTree } from '../utils/dsview'; // 假设文件路径为 ../utils/modifySvg.js
    import * as d3 from 'd3';

    const gElement = ref<SVGGElement | null>(null);
    const svgDSV = ref<SVGSVGElement | null>(null);
        onMounted(() => {
        if (gElement.value && svgDSV.value) {
            drawDSTree(gElement.value);

            // Enable dragging and zooming
            const svg = d3.select<SVGSVGElement, unknown>(svgDSV.value);
            const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
            d3.select(gElement.value).attr('transform', event.transform);
            });

            svg.call(zoom);
        }
        });
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
        /* background-color: var(--vt-c-green-1); */
        width: 100%;
        height: 100%;
        flex: 1;
        /* cursor: move; */
    }
  </style>