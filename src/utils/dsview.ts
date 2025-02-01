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
  collapsed?: boolean;
}

/**
 * 确保每个节点都有 collapsed 属性（默认 false）
 * 如果原始数据中没有该属性，则赋予默认值 false，
 * 这样在第一次渲染时所有节点都展开。
 */
function ensureCollapsedState(data: DSTreeNode): void {
  if (data.collapsed === undefined) {
    data.collapsed = false;
  }
  if (data.children) {
    data.children.forEach(child => ensureCollapsedState(child));
  }
}

/**
 * 计算每个节点的 wid 属性
 * @param node 当前节点（d3.hierarchy 构造的节点）
 * @param nodeWidth 单个节点宽度（单位宽度）
 * @param nodeHeight 单个节点高度
 * @returns 叶节点的数量
 *
 * 注意：如果节点为叶节点（包括因 collapsed 而无子节点的情况），
 * 则宽度固定为 nodeWidth；否则宽度为所有子节点叶节点数量的和乘以 nodeWidth。
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
 * 读取 dstree 数据并生成层次布局，同时根据节点 collapsed 状态控制布局与渲染：
 *  - collapsed 为 true 的节点视为叶节点，宽度固定为单位宽度，且其子节点不参与布局
 *  - collapsed 为 false 的节点，继续展开其子节点，宽度按叶节点数量计算（与之前一致）
 * @param svgElement 要绘制的 SVG 元素
 */
export function drawDSTree(svgElement: SVGElement): void {
  // 清空之前的内容，防止重复叠加
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }

  // 确保所有节点都有 collapsed 属性（第一次渲染时赋默认值 false，
  // 如果节点已被点击修改过，则保留原有状态）
  ensureCollapsedState(dstreeData as DSTreeNode);

  // 构造层级数据时，根据 collapsed 状态决定是否返回子节点：
  // 如果 collapsed 为 true，则不返回子节点，节点将被视为叶节点
  const root: d3.HierarchyNode<DSTreeNode> = d3.hierarchy(dstreeData as DSTreeNode, d => {
    return d.collapsed ? null : d.children;
  });

  const nodeWidth = 100;
  const nodeHeight = 42;

  // 先计算每个节点的 wid 和 size
  calculateWid(root, nodeWidth, nodeHeight);

  // 生成 flextree 布局
  const treeLayout = flextree<DSTreeNode>({});
  const treeData = treeLayout(root);

  // 计算所有节点 x 与 y 坐标的最小值，用于后续平移坐标
  const minX = Math.min(...treeData.descendants().map(d => d.x)) - nodeWidth;
  const minY = Math.min(...treeData.descendants().map(d => d.y)) - nodeHeight;

  // 遍历所有节点进行绘制
  treeData.descendants().forEach((d) => {
    // 根据节点 size 计算当前节点的宽度以及左上角坐标
    const width = d.data.size ? d.data.size[0] : nodeWidth;
    const x = d.x - minX - width / 2;
    const y = d.y - minY;

    const padding = 5;
    const smallBarHeight = 10;
    const arrowSize = 5;
    const textPadding = 7;

    // 绘制顶部横线和两侧短竖线
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

    // 如果有子节点，则绘制左右虚线及箭头
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

    // 绘制节点文本
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // 使文本居中：x 坐标取 d.x - minX
    text.setAttribute('x', (d.x - minX).toString());
    // y 坐标在节点上半部分，用 textPadding 调整
    text.setAttribute('y', (d.y - minY - nodeHeight / 2 + textPadding).toString());
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = d.data.name;
    svgElement.appendChild(text);

    // 如果文本过长，则缩放文本
    const textLength = text.getBBox().width;
    if (textLength > width * 0.75) {
      const scale = (width * 0.75) / textLength;
      text.setAttribute('transform', `scale(${scale})`);
      text.setAttribute('transform-origin', `${d.x - minX} ${(d.y - minY - nodeHeight / 2)}`);
    }

    // 绘制条件图标（如 EQUAL/LESS），置于节点顶部（如有）
    if (d.data.sum !== 'None') {
      let imageURL = '';
      if (d.data.sum === 'EQUAL') {
        imageURL = equalsvg;
      } else if (d.data.sum === 'LESS') {
        imageURL = lesssvg;
      }
      const imgWidth = 40;
      const imgHeight = 20;
      const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      imageEl.setAttribute('href', imageURL);
      imageEl.setAttribute('x', (d.x - minX - imgWidth / 2).toString());
      imageEl.setAttribute('y', (d.y - minY - 2.7).toString());
      imageEl.setAttribute('width', imgWidth.toString());
      imageEl.setAttribute('height', imgHeight.toString());
      svgElement.appendChild(imageEl);
    }

    // 绘制逻辑运算符图标（AND/OR）在子节点之间（如有）
    if (d.children && d.children.length > 1 && d.data.logicalOperators && d.data.logicalOperators.length > 0) {
      const operatorCount = Math.min(d.children.length - 1, d.data.logicalOperators.length);
      for (let i = 0; i < operatorCount; i++) {
        const child1 = d.children[i];
        const child2 = d.children[i + 1];
        const width1 = child1.data.size ? child1.data.size[0] : nodeWidth;
        const width2 = child2.data.size ? child2.data.size[0] : nodeWidth;
        // 计算两个子节点中心 x 坐标的中点
        const midX = ((child1.x - minX + width1 / 2) + (child2.x - minX - width2 / 2)) / 2;
        // 运算符图标与父节点文字处于同一水平线
        const operatorY = d.y - minY + nodeHeight / 2 + textPadding;

        const operatorType = d.data.logicalOperators[i];
        let imageURL = '';
        if (operatorType === 'AND') {
          imageURL = andsvg;
        } else if (operatorType === 'OR') {
          imageURL = orsvg;
        } else {
          // 若遇到其他值，可按需处理；这里直接跳过
          continue;
        }

        const imgWidth = 20;
        const imgHeight = 20;
        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageEl.setAttribute('href', imageURL);
        // 使图标中心位于 (midX, operatorY)
        imageEl.setAttribute('x', (midX - imgWidth / 2).toString());
        imageEl.setAttribute('y', (operatorY - imgHeight / 2).toString());
        imageEl.setAttribute('width', imgWidth.toString());
        imageEl.setAttribute('height', imgHeight.toString());
        svgElement.appendChild(imageEl);
      }
    }

    // 创建一个透明的点击区域，用于切换 collapsed 状态
    const clickableArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    clickableArea.setAttribute('x', (x + padding).toString());
    clickableArea.setAttribute('y', (y - 5).toString());
    clickableArea.setAttribute('width', (width - 2 * padding).toString());
    clickableArea.setAttribute('height', (smallBarHeight + 10).toString());
    clickableArea.setAttribute('fill', 'transparent');
    clickableArea.setAttribute('class', 'clickable-area');
    clickableArea.setAttribute('rx', '5');
    clickableArea.setAttribute('ry', '5');
    svgElement.appendChild(clickableArea);

    // 点击时切换 collapsed 状态，并重新绘制整个树
    clickableArea.addEventListener('click', () => {
      d.data.collapsed = !d.data.collapsed;
      drawDSTree(svgElement);
    });
  });

  console.log(treeData);
}
