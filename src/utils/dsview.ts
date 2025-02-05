import * as d3 from "d3";
import { flextree } from "d3-flextree";
// import dstreeData from '../assets/dstree.json';
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
 * 确保每个节点都有 collapsed 属性（如果没有则赋默认值 false）
 */
function ensureCollapsedState(data: DSTreeNode): void {

  if (data.collapsed === undefined) {
    data.collapsed = false;
  }
  if (data.children) {
    data.children.forEach(child => ensureCollapsedState(child));
  }
}

function expandRelatedNodes(node: DSTreeNode, projectionSet: Set<string>) {
  let needExpand = false;

  // 检查当前节点是否需要展开
  if (projectionSet.has(node.name)) {
    node.collapsed = false;
    needExpand = true;
  }

  // 递归处理子节点
  if (node.children) {
    node.children.forEach(child => {
      const childNeedExpand = expandRelatedNodes(child, projectionSet);
      needExpand = needExpand || childNeedExpand;
    });
  }

  // 如果子节点需要展开，则当前节点必须展开
  if (needExpand) {
    node.collapsed = false;
  }

  return needExpand;
}

/**
 * 计算每个节点的 wid 和 size 属性  
 * 如果节点没有子节点（包括因 collapsed 而“屏蔽”子节点），则宽度固定为 nodeWidth；  
 * 否则宽度为所有叶子节点数量的和乘以 nodeWidth  
 */
function calculateWid(
  node: d3.HierarchyNode<DSTreeNode>,
  nodeWidth: number,
  nodeHeight: number
): number {
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
 * 采用 D3 data-join 模式渲染树（初始绘制和后续更新都调用 update()）  
 * - 每个节点放到一个 <g class="node"> 中  
 * - 父节点与子节点之间的逻辑运算符图标放到 <g class="operators"> 中  
 * 点击节点时，仅更新相关节点（位置、宽度）并通过 transition 实现动画，而不重绘整个树
 */
export function drawDSTree(gElement: SVGGElement, projectionList: string[] = [], dstreeData: DSTreeNode): void {
  // console.log(projectionList);
  // 全局数据保持不变，点击时修改各节点的 collapsed 属性
  ensureCollapsedState(dstreeData);

  // 使用 D3 选择 svg，并创建容器组（后续所有更新均在这些容器内进行）
  const svg = d3.select(gElement);
  svg.selectAll("*").remove(); // 清空旧内容
  const gNodes = svg.append("g").attr("class", "nodes");
  const gOperators = svg.append("g").attr("class", "operators");

  // 定义一些常量参数
  const nodeWidth = 100;
  const nodeHeight = 42;
  const padding = 5;
  const smallBarHeight = 10;
  const arrowSize = 5;
  const textPadding = 7;
  const transitionDuration = 500;
  const projectionSet = new Set(projectionList);
  expandRelatedNodes(dstreeData, projectionSet);
  
  // update 函数：计算新布局并更新节点和逻辑运算符图标的显示位置
  function update() {
    
    // console.log(projectionList);
    // galleryCollapse(dstreeData as DSTreeNode, projectionList);
    // 构造层次数据：若 collapsed 为 true，则不返回子节点
    const root = d3.hierarchy(dstreeData, d => d.collapsed ? null : d.children);
    calculateWid(root, nodeWidth, nodeHeight);
    const treeLayout = flextree<DSTreeNode>({});
    const treeData = treeLayout(root);

    // 计算所有节点的全局坐标偏移（保证所有图形均正显示在视图中）
    const minX = d3.min(treeData.descendants(), d => d.x)! - nodeWidth;
    const minY = d3.min(treeData.descendants(), d => d.y)! - nodeHeight;

    // =================== 处理节点 ===================
    const nodes = treeData.descendants();

    // 用节点的 name 作为 key（假设唯一），完成 data-join
    const nodeSelection = gNodes.selectAll<SVGGElement, d3.HierarchyPointNode<DSTreeNode>>(".node")
      .data(nodes, d => d.data.name);

    // ENTER：对于新进入的节点，创建 <g class="node"> 并绘制内部各图形
    const nodeEnter = nodeSelection.enter()
      .append("g")
      .attr("class", "node")
      // 初始位置设为计算好的新位置（也可以用父节点位置实现渐入效果）
      .attr("transform", d => {
        const width = d.data.size ? d.data.size[0] : nodeWidth;
        // 这里设 group 原点为全局坐标 (d.x - minX, d.y - minY)
        return `translate(${d.x - minX},${d.y - minY})`;
      });

    nodeEnter.each(function(d) {
      const g = d3.select(this);
      // 节点宽度（可能因 collapsed 而为单位宽度）
      const width = d.data.size ? d.data.size[0] : nodeWidth;

      // 为了方便后续动画，内部所有图形均以节点中心为参照。
      // 由于之前全局位置设为 (d.x - minX, d.y - minY)，
      // 为使节点内容水平居中，内部 x 坐标统一偏移 -width/2 。
      const offsetX = -width / 2;

      // 1. 顶部横线和两侧短竖线
      g.append("path")
        .attr("class", "top-line")
        .attr("d", `
          M ${offsetX + padding} 0 H ${offsetX + width - padding}
          M ${offsetX + padding} 0 V ${smallBarHeight}
          M ${offsetX + width - padding} 0 V ${smallBarHeight}
        `)
        .attr("stroke-width", d.data.collapsed ? 3 : 1)
        .attr("stroke", "black")
        .attr("fill", "none");

      // 2. 如果存在子节点，则绘制左右带箭头的虚线
      if (d.children && d.children.length > 0) {
        g.append("path")
          .attr("class", "left-line")
          .attr("d", `
            M ${offsetX + padding} ${smallBarHeight} V ${nodeHeight}
            M ${offsetX + padding} ${nodeHeight} l -${arrowSize} -${arrowSize}
            M ${offsetX + padding} ${nodeHeight} l ${arrowSize} -${arrowSize}
          `)
          .attr("stroke", "lightgray")
          .attr("fill", "none")
          .attr("stroke-dasharray", "5,5");

        g.append("path")
          .attr("class", "right-line")
          .attr("d", `
            M ${offsetX + width - padding} ${smallBarHeight} V ${nodeHeight}
            M ${offsetX + width - padding} ${nodeHeight} l ${arrowSize} -${arrowSize}
            M ${offsetX + width - padding} ${nodeHeight} l -${arrowSize} -${arrowSize}
          `)
          .attr("stroke", "lightgray")
          .attr("fill", "none")
          .attr("stroke-dasharray", "5,5");
      }

      // 3. 节点文本，按原来逻辑在节点上方显示
      // g.append("text")
      //   .attr("class", "node-text")
      //   .attr("x", 0)
      //   // 文本 y 坐标相对于全局位置（0 表示当前组原点）再向上偏移 nodeHeight/2 后加 textPadding
      //   .attr("y", -nodeHeight / 2 + textPadding)
      //   .attr("text-anchor", "middle")
      //   .attr("dominant-baseline", "middle")
      //   .attr("fill", projectionList.includes(d.data.name) ? "#E45756" : "black")
      //   .style("font-weight", projectionList.includes(d.data.name) ? 600 : "normal")
      //   .text(d.data.name)
      //   .each(function() {
      //     const text = this as SVGTextElement;
      //     const textLength = text.getBBox().width;
      //     if (textLength > width * 0.75) {
      //       const scale = (width * 0.75) / textLength;
      //       text.setAttribute('transform', `scale(${scale})`);
      //       // text.setAttribute('transform-origin', `${d.x - minX} ${(d.y - minY - nodeHeight / 2)}`);
      //     }
      //   });
      g.append("text")
      .attr("class", "node-text")
      .attr("x", 0)
      // The text y coordinate is adjusted relative to the group origin:
      .attr("y", -nodeHeight / 2 + textPadding)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", projectionList.includes(d.data.name) ? "white" : "black")
      .style("font-weight", projectionList.includes(d.data.name) ? 600 : "normal")
      .text(d.data.name)
      .each(function () {
        // 'this' is the text element
        const textElem = this as SVGTextElement;
        // Get the rendered text length (this takes CSS into account)
        const computedLength = textElem.getComputedTextLength();
        let scale = 1;
        if (computedLength > width * 0.75) {
          // If the text is too long, compute a scaling factor so that its length is at most width*0.75.
          scale = (width * 0.75) / computedLength;
          textElem.setAttribute("transform", `scale(${scale})`);
        }
        
        // Only add a rectangle if the node name is in the projection list
        if (projectionList.includes(d.data.name)) {
          // Get the bounding box of the text element.
          const bbox = textElem.getBBox();
          
          // Ensure that the parent node exists and cast it as Element
          if (textElem.parentNode !== null) {
            const parent = textElem.parentNode as Element;
            // Insert a rectangle behind the text element.
            d3.select(parent)
              .insert("rect", "text") // insert before the text element so it appears behind
              .attr("x", bbox.x)
              .attr("y", bbox.y)
              .attr("width", bbox.width)
              .attr("height", bbox.height)
              .attr("fill", "#E45756")
              .attr("stroke", "#E45756")
              .attr("transform", scale !== 1 ? `scale(${scale})` : null);
          }
        }
      });
    



      // 4. 如果有条件（EQUAL/LESS），则显示图标（放在节点上方）
      if (d.data.sum !== 'None') {
        let imageURL = '';
        if (d.data.sum === 'EQUAL') {
          imageURL = equalsvg;
        } else if (d.data.sum === 'LESS') {
          imageURL = lesssvg;
        }
        const imgWidth = 40, imgHeight = 20;
        g.append("image")
          .attr("class", "sum-image")
          .attr("href", imageURL)
          .attr("x", -imgWidth / 2)
          .attr("y", +imgHeight / 2 - 12.5)
          .attr("width", imgWidth)
          .attr("height", imgHeight);
      }
      // 5. 在节点上方添加一个透明矩形作为点击区域，点击时切换 collapsed 状态
      if (d.data.children && d.data.children.length > 0) {
        g.append("rect")
        .attr("class", "clickable-area")
        .attr("x", offsetX + padding)
        .attr("y", 0)
        .attr("width", width - 2 * padding)
        .attr("height", smallBarHeight + 10)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("click", function(event) {
          // 阻止冒泡（如果有嵌套事件）
          event.stopPropagation();
          // 切换当前节点的 collapsed 状态
          d.data.collapsed = !d.data.collapsed;
          update(); // 更新布局和过渡动画
        });
      }
      

    });

      // UPDATE：对已有节点进行过渡更新
      nodeSelection.transition()
      .duration(transitionDuration)
      .attr("transform", d => {
        const width = d.data.size ? d.data.size[0] : nodeWidth;
        return `translate(${d.x - minX},${d.y - minY})`;
      })
      .each(function(d) {
        const g = d3.select(this);
        const width = d.data.size ? d.data.size[0] : nodeWidth;
        const offsetX = -width / 2;
        const newD = `
          M ${offsetX + padding} 0 H ${offsetX + width - padding}
          M ${offsetX + padding} 0 V ${smallBarHeight}
          M ${offsetX + width - padding} 0 V ${smallBarHeight}
        `;
        // 对 top-line 单独创建 transition，实现 d 属性的插值动画和粗细变化
        g.select(".top-line")
          .transition()
          .duration(transitionDuration)
          .attrTween("d", function() {
            const pathElement = this as SVGPathElement;
            const previous = pathElement.getAttribute("d") ?? "";
            return d3.interpolateString(previous, newD);
          })
          .attr("stroke-width", d.data.collapsed ? 3 : 1);
    
        // 更新点击区域尺寸和位置
        g.select(".clickable-area")
          .transition()
          .duration(transitionDuration)
          .attr("width", width - 2 * padding)
          .attr("x", offsetX + padding);
    
        // 根据 collapsed 状态处理左右竖线
        if (!d.data.collapsed && d.children && d.children.length > 0) {
          g.select(".left-line")
            .attr("d", `
              M ${offsetX + padding} ${smallBarHeight} V ${nodeHeight}
              M ${offsetX + padding} ${nodeHeight} l -${arrowSize} -${arrowSize}
              M ${offsetX + padding} ${nodeHeight} l ${arrowSize} -${arrowSize}
            `);
          g.select(".right-line")
            .attr("d", `
              M ${offsetX + width - padding} ${smallBarHeight} V ${nodeHeight}
              M ${offsetX + width - padding} ${nodeHeight} l ${arrowSize} -${arrowSize}
              M ${offsetX + width - padding} ${nodeHeight} l -${arrowSize} -${arrowSize}
            `);
        } else {
          // 折叠时，删除左右竖线
          g.select(".left-line").attr("d", null);
          g.select(".right-line").attr("d", null);
        }
    
        // 更新节点文本缩放
        g.select(".node-text")
          .each(function() {
            const text = this as SVGTextElement;
            text.removeAttribute('transform');
            const textLength = text.getBBox().width;
            if (textLength > width * 0.75) {
              const scale = (width * 0.75) / textLength;
              text.setAttribute('transform', `scale(${scale})`);
            }
          });
      });

    // EXIT：对需要移除的节点淡出后删除
    nodeSelection.exit()
      .transition()
      .duration(transitionDuration)
      .style("opacity", 0)
      .remove();

    // =================== 处理逻辑运算符图标 ===================
    // 对于每个有多个子节点且 data.logicalOperators 有定义的父节点，
    // 根据子节点中心位置计算运算符图标的全局坐标。
    let operatorsData: {
      key: string;
      operator: string;
      x: number;
      y: number;
    }[] = [];
    nodes.forEach(d => {
      if (d.children && d.children.length > 1 && d.data.logicalOperators && d.data.logicalOperators.length > 0) {
        const operatorCount = Math.min(d.children.length - 1, d.data.logicalOperators.length);
        for (let i = 0; i < operatorCount; i++) {
          const child1 = d.children[i];
          const child2 = d.children[i + 1];
          const width1 = child1.data.size ? child1.data.size[0] : nodeWidth;
          const width2 = child2.data.size ? child2.data.size[0] : nodeWidth;
          // 根据之前的逻辑计算两个子节点中心的中点（全局坐标）
          const midX = ((child1.x - minX + width1 / 2) + (child2.x - minX - width2 / 2)) / 2;
          const operatorY = d.y - minY + nodeHeight / 2 + textPadding;
          operatorsData.push({
            key: d.data.name + "_" + i,
            operator: d.data.logicalOperators[i],
            x: midX,
            y: operatorY
          });
        }
      }
    });

    // data-join 运算符图标（使用 <image> 元素）
    const operatorSelection = gOperators.selectAll<SVGImageElement, typeof operatorsData[0]>("image.operator")
      .data(operatorsData, d => d.key);

    // ENTER
    const operatorEnter = operatorSelection.enter()
      .append("image")
      .attr("class", "operator")
      .attr("width", 20)
      .attr("height", 20)
      .attr("href", d => {
        if (d.operator === "AND") return andsvg;
        if (d.operator === "OR") return orsvg;
        return "";
      })
      .attr("x", d => d.x - 10)
      .attr("y", d => d.y - 10)
      .style("opacity", 0);

    operatorEnter.transition()
      .duration(transitionDuration)
      .style("opacity", 1);

    // UPDATE
    operatorSelection.transition()
      .duration(transitionDuration)
      .attr("x", d => d.x - 10)
      .attr("y", d => d.y - 10);

    // EXIT
    operatorSelection.exit()
      .transition()
      .duration(transitionDuration)
      .style("opacity", 0)
      .remove();
  }

  // 初始绘制
  update();
}
