import * as d3 from "d3";
import dstreeData from '../assets/dstree.json';
import { flextree } from "d3-flextree";
import orsvg from '../assets/or.svg';
import andsvg from '../assets/and.svg';
import equalsvg from '../assets/equal.svg';
import lesssvg from '../assets/less.svg';

interface DSTreeNode {
  name: string;
  logicalOperators: string[];
  sum: string;
  children: DSTreeNode[];
  wid?: number;
  size?: [number, number];
}

/**
 * 计算每个节点的wid属性
 * @param {d3.HierarchyNode<DSTreeNode>} node - 当前节点
 * @param {number} nodeWidth - 单个节点宽度
 * @param {number} nodeHeight - 单个节点高度
 * @returns {number} - 叶节点的数量
 */
function calculateWid(node: d3.HierarchyNode<DSTreeNode>, nodeWidth: number, nodeHeight: number): number {
  if (!node.children || node.children.length === 0) {
    node.data.wid = 1;
    node.data.size = [nodeWidth, nodeHeight];
    return 1;
  }
  const wid = node.children.reduce((sum, child) => sum + calculateWid(child, nodeWidth, nodeHeight), 0);
  node.data.wid = wid;
  node.data.size = [nodeWidth * wid, nodeHeight];
  return wid;
}

/**
 * 读取dstree数据并生成层次布局
 * @param {SVGElement} svgElement - 要修改的SVG元素
 */
export function drawDSTree(svgElement: SVGElement): void {
  const root: d3.HierarchyNode<DSTreeNode> = d3.hierarchy(dstreeData as DSTreeNode);

  const nodeWidth = 100;
  const nodeHeight = 42;

  // 先计算每个节点的 wid 和 size
  calculateWid(root, nodeWidth, nodeHeight);

  const treeLayout = flextree<DSTreeNode>({});
  const treeData = treeLayout(root);

  // 计算 x 和 y 的最小值，用于后面坐标平移
  const minX = Math.min(...treeData.descendants().map(d => d.x)) - nodeWidth;
  const minY = Math.min(...treeData.descendants().map(d => d.y)) - nodeHeight;

  // 遍历树上所有节点，绘制图形
  treeData.descendants().forEach((d) => {
    // 计算当前节点左上角 (x, y)（在可视区域中的偏移后）
    const width = d.data.size ? d.data.size[0] : nodeWidth;
    const x = d.x - minX - width / 2;
    const y = d.y - minY;

    // 一些用于绘制的基础参数
    const padding = 5;
    const smallBarHeight = 10;
    const arrowSize = 5;
    const textPadding = 7;

    // 顶部横线 + 两侧短竖线
    const topLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const topLineData = `
      M ${x + padding} ${y} H ${x - padding + width} 
      M ${x + padding} ${y} V ${y + smallBarHeight} 
      M ${x - padding + width} ${y} V ${y + smallBarHeight}
    `;
    topLine.setAttribute('d', topLineData);
    topLine.setAttribute('stroke', 'black');
    topLine.setAttribute('fill', 'none');
    svgElement.appendChild(topLine);

    // 如果有子节点，则在左右各画一条竖直虚线带箭头
    if (d.children && d.children.length > 0) {
      const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const leftLineData = `
        M ${x + padding} ${y + smallBarHeight} V ${y + nodeHeight} 
        M ${x + padding} ${y + nodeHeight} l -${arrowSize} -${arrowSize} 
        M ${x + padding} ${y + nodeHeight} l ${arrowSize} -${arrowSize}
      `;
      leftLine.setAttribute('d', leftLineData);
      leftLine.setAttribute('stroke', 'lightgray');
      leftLine.setAttribute('fill', 'none');
      leftLine.setAttribute('stroke-dasharray', '5,5');
      svgElement.appendChild(leftLine);

      const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const rightLineData = `
        M ${x + width - padding} ${y + smallBarHeight} V ${y + nodeHeight} 
        M ${x + width - padding} ${y + nodeHeight} l ${arrowSize} -${arrowSize} 
        M ${x + width - padding} ${y + nodeHeight} l -${arrowSize} -${arrowSize}
      `;
      rightLine.setAttribute('d', rightLineData);
      rightLine.setAttribute('stroke', 'lightgray');
      rightLine.setAttribute('fill', 'none');
      rightLine.setAttribute('stroke-dasharray', '5,5');
      svgElement.appendChild(rightLine);
    }

    // 父节点文本
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // 注意 text 的 x 坐标居中放在 d.x - minX
    text.setAttribute('x', (d.x - minX).toString());
    // y 坐标放在节点的上半部分，用 textPadding 调整
    text.setAttribute('y', (d.y - minY - nodeHeight / 2 + textPadding).toString());
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = d.data.name;
    svgElement.appendChild(text);

    // 如果文本过长，缩放一下
    const textLength = text.getBBox().width;
    if (textLength > width * 0.75) {
      const scale = (width * 0.75) / textLength;
      text.setAttribute('transform', `scale(${scale})`);
      text.setAttribute('transform-origin', `${d.x - minX} ${(d.y - minY - nodeHeight / 2)}`);
    }

    // ========= 在这里插入 AND/OR SVG 图标的逻辑 =========
    // 条件：如果子节点 >= 2，才有可能在它们之间插图标
    // 逻辑：对于第 i 和第 i+1 个子节点之间，根据 d.data.logicalOperators[i] 来选择 and.svg / or.svg
    if (d.data.sum!=='None') {
      let imageURL = '';
      if (d.data.sum === 'EQUAL'){
        imageURL = equalsvg;
      } else if (d.data.sum === 'LESS'){
        imageURL = lesssvg;
      }
      const imgWidth = 40;
      const imgHeight = 20;
      const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      // Modern 浏览器可直接使用 'href'
      imageEl.setAttribute('href', imageURL);
      imageEl.setAttribute('x', (d.x - minX - imgWidth / 2).toString());
      imageEl.setAttribute('y', (d.y - minY - 2.7).toString());
      imageEl.setAttribute('width', imgWidth.toString());
      imageEl.setAttribute('height', imgHeight.toString());
      svgElement.appendChild(imageEl);
    }

    if (d.children && d.children.length > 1 && d.data.logicalOperators && d.data.logicalOperators.length > 0) {
      // 最多画 n-1 个逻辑运算符，n 是子节点数
      const operatorCount = Math.min(d.children.length - 1, d.data.logicalOperators.length);

      for (let i = 0; i < operatorCount; i++) {
        const child1 = d.children[i];
        const child2 = d.children[i + 1];
        const width1 = child1.data.size ? child1.data.size[0] : nodeWidth;
        const width2 = child2.data.size ? child2.data.size[0] : nodeWidth;
        // 计算两个子节点中心 x 坐标的中点
        const midX = ((child1.x - minX + width1 / 2) + (child2.x - minX - width2 / 2)) / 2;
        // 和父节点的文字处于同一水平线
        const operatorY = d.y - minY + nodeHeight / 2 + textPadding;

        const operatorType = d.data.logicalOperators[i];
        let imageURL = '';
        if (operatorType === 'AND') {
          imageURL = andsvg;
        } else if (operatorType === 'OR') {
          imageURL = orsvg;
        } else {
          // 如果遇到不是 AND/OR 的值，可以做一些容错处理，这里简单跳过
          continue;
        }

        // 插入 <image> 元素
        const imgWidth = 20;
        const imgHeight = 20;
        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        // Modern 浏览器可直接使用 'href'
        imageEl.setAttribute('href', imageURL);
        // 若有兼容性需求，使用 xlink:href
        // imageEl.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageURL);

        // 让图标中心放在 midX, operatorY
        imageEl.setAttribute('x', (midX - imgWidth / 2).toString());
        imageEl.setAttribute('y', (operatorY - imgHeight / 2).toString());
        imageEl.setAttribute('width', imgWidth.toString());
        imageEl.setAttribute('height', imgHeight.toString());

        svgElement.appendChild(imageEl);
      }
    }
    // ========= 在这里插入 AND/OR SVG 图标的逻辑结束 =========
  });

  console.log(treeData);
}

// /**
//  * 修改传入的SVG元素
//  * @param {SVGElement} svgElement - 要修改的SVG元素
//  */
// import * as d3 from "d3";
// import dstreeData from '../assets/dstree.json';
// import { flextree } from "d3-flextree";

// interface DSTreeNode {
//   name: string;
//   logicalOperators: string[];
//   sum: string;
//   children: DSTreeNode[];
//   wid?: number;
//   size?: [number, number];
// }

// /**
//  * 计算每个节点的wid属性
//  * @param {d3.HierarchyNode<DSTreeNode>} node - 当前节点
//  * @returns {number} - 叶节点的数量
//  */
// function calculateWid(node: d3.HierarchyNode<DSTreeNode>, nodeWidth: number, nodeHeight: number): number {
//   if (!node.children || node.children.length === 0) {
//     node.data.wid = 1;
//     node.data.size = [nodeWidth, nodeHeight];
//     return 1;
//   }
//   const wid = node.children.reduce((sum, child) => sum + calculateWid(child, nodeWidth, nodeHeight), 0);
//   node.data.wid = wid;
//   node.data.size = [nodeWidth * wid, nodeHeight];
//   return wid;
// }

// /**
//  * 读取dstree数据并生成层次布局
//  * @param {SVGElement} svgElement - 要修改的SVG元素
//  */
// export function drawDSTree(svgElement: SVGElement): void {
//   const root: d3.HierarchyNode<DSTreeNode> = d3.hierarchy(dstreeData as DSTreeNode);

//   const nodeWidth = 100;
//   const nodeHeight = 42;

//   // Calculate the 'wid' property and 'size' for each node
//   calculateWid(root, nodeWidth, nodeHeight);
//   console.log(root);

//   const treeLayout = flextree<DSTreeNode>({});
//   const treeData = treeLayout(root);

//   // Calculate the minimum x and y coordinates
//   const minX = Math.min(...treeData.descendants().map(d => d.x)) - nodeWidth;
//   const minY = Math.min(...treeData.descendants().map(d => d.y)) - nodeHeight;

//   treeData.descendants().forEach((d) => {
//     const width = d.data.size ? d.data.size[0] : nodeWidth;
//     const x = d.x - minX - width / 2;
//     const y = d.y - minY;
//     const padding = 5;
//     const smallBarHeight = 10;
//     const arrowSize = 5;
//     const textPadding = 7;

//     // Create the top horizontal line with short vertical segments at both ends
//     const topLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
//     const topLineData = `
//         M ${x + padding} ${y} H ${x - padding + width} 
//         M ${x + padding} ${y} V ${y + smallBarHeight} 
//         M ${x - padding + width} ${y} V ${y + smallBarHeight}
//     `;
//     topLine.setAttribute('d', topLineData);
//     topLine.setAttribute('stroke', 'black');
//     topLine.setAttribute('fill', 'none');
//     svgElement.appendChild(topLine);

//     if (d.children && d.children.length > 0) {
//       // Create the left vertical dashed line with arrow
//       const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
//       const leftLineData = `
//           M ${x + padding} ${y + smallBarHeight} V ${y + nodeHeight} 
//           M ${x + padding} ${y + nodeHeight} l -${arrowSize} -${arrowSize} 
//           M ${x + padding} ${y + nodeHeight} l ${arrowSize} -${arrowSize}
//       `;
//       leftLine.setAttribute('d', leftLineData);
//       leftLine.setAttribute('stroke', 'lightgray');
//       leftLine.setAttribute('fill', 'none');
//       leftLine.setAttribute('stroke-dasharray', '5,5');
//       svgElement.appendChild(leftLine);

//       // Create the right vertical dashed line with arrow
//       const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
//       const rightLineData = `
//           M ${x + width - padding} ${y + smallBarHeight} V ${y + nodeHeight} 
//           M ${x + width - padding} ${y + nodeHeight} l ${arrowSize} -${arrowSize} 
//           M ${x + width - padding} ${y + nodeHeight} l -${arrowSize} -${arrowSize}
//       `;
//       rightLine.setAttribute('d', rightLineData);
//       rightLine.setAttribute('stroke', 'lightgray');
//       rightLine.setAttribute('fill', 'none');
//       rightLine.setAttribute('stroke-dasharray', '5,5');
//       svgElement.appendChild(rightLine);
//     }

//     const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
//     text.setAttribute('x', (d.x - minX).toString());
//     text.setAttribute('y', (d.y - minY - nodeHeight / 2 + textPadding).toString());
//     text.setAttribute('dominant-baseline', 'middle');
//     text.setAttribute('text-anchor', 'middle');
//     text.textContent = d.data.name;
//     svgElement.appendChild(text);

//     // Adjust text size if it exceeds 75% of the width
//     const textLength = text.getBBox().width;
//     if (textLength > width * 0.75) {
//       const scale = (width * 0.75) / textLength;
//       text.setAttribute('transform', `scale(${scale})`);
//       text.setAttribute('transform-origin', `${d.x - minX} ${(d.y - minY - nodeHeight / 2)}`);
//     }
//   });

//   console.log(treeData);
// }