export default class NetworkPathFinder {
    /* global ol */
    constructor(map) {
      this.map = map;
      this.network = {
        nodes: new Map(), // 存储节点
        edges: new Map()  // 存储边
      };
      this.gridIndex = new Map(); // 添加网格索引
      this.gridSize = 0.01; // 网格大小（约1km）
    }
  
    // 从WFS获取铁路网络数据并构建图
    async buildNetwork() {
      try {
        console.log('开始构建路网...');
        
        // 使用相对路径构建请求URL
        const params = new URLSearchParams({
          service: 'WFS',
          request: 'GetFeature',
          typename: 'webgis:nanjing_railway',
          outputFormat: 'application/json',
          srsname: 'EPSG:4326'
        });

        const url = `/geoserver/wfs?${params.toString()}`;
        console.log('发送WFS请求到:', url);

        // 发送请求获取数据
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`WFS请求失败: ${response.status} ${response.statusText}`);
        }
        
        console.log('WFS响应状态:', response.status);
        
        // 解析响应数据
        const data = await response.json();
        console.log('获取到的铁路数据:', {
          type: data.type,
          featureCount: data.features?.length || 0,
          crs: data.crs,
          // 打印数据
          data: data
        });
  
        if (!data.features || data.features.length === 0) {
          throw new Error('未获取到任何铁路数据');
        }
  
        // 构建网络图
        console.log('开始构建网络图...');
        this.constructNetworkGraph(data);
        console.log('网络图构建完成');
  
        return true;
      } catch (error) {
        console.error('构建网络失败:', error);
        console.error('错误堆栈:', error.stack);
        throw error; // 向上传递错误，以便调用者处理
      }
    }
  
    // 构建网络图
    constructNetworkGraph(data) {
      try {
        console.log('开始处理铁路数据...');
        
        this.network.nodes.clear();
        this.network.edges.clear();
  
        data.features.forEach(feature => {
          if (feature.geometry.type === 'MultiLineString') {
            // 处理每个 MultiLineString 中的所有线段
            feature.geometry.coordinates.forEach(lineString => {
              // 为每个坐标点创建节点
              lineString.forEach((coord, index) => {
                const nodeId = this.getNodeId(coord);
                
                // 添加节点
                if (!this.network.nodes.has(nodeId)) {
                  this.network.nodes.set(nodeId, {
                    id: nodeId,
                    coordinate: coord,
                    connections: new Set()
                  });
                  this.addToGridIndex(nodeId, coord);
                }
  
                // 创建与下一个点的边
                if (index < lineString.length - 1) {
                  const nextCoord = lineString[index + 1];
                  const nextNodeId = this.getNodeId(nextCoord);
                  
                  // 添加连接关系
                  this.network.nodes.get(nodeId).connections.add(nextNodeId);
                  
                  // 添加边
                  const distance = this.calculateDistance(coord, nextCoord);
                  const edgeId = `${nodeId}-${nextNodeId}`;
                  this.network.edges.set(edgeId, {
                    from: nodeId,
                    to: nextNodeId,
                    distance: distance
                  });
                }
              });
            });
          }
        });
  
        // 打印网络图信息
        console.log('网络图构建完成，详细信息：', {
          nodesCount: this.network.nodes.size,
          edgesCount: this.network.edges.size,
          nodes: Array.from(this.network.nodes.entries()),
          edges: Array.from(this.network.edges.entries())
        });
      } catch (error) {
        console.error('构建网络图时出错:', error);
        throw error;
      }
    }
  
    // 生成节点ID
    getNodeId(coord) {
      // 增加精度到小数点后4位,提高点的密度
      return `${Math.round(coord[0] * 1000)}-${Math.round(coord[1] * 1000)}`;
    }
  
    // 计算两点间距离
    calculateDistance(coord1, coord2) {
      const dx = coord2[0] - coord1[0];
      const dy = coord2[1] - coord1[1];
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    // 添加网格索引方法
    addToGridIndex(nodeId, coord) {
      const gridX = Math.floor(coord[0] / this.gridSize);
      const gridY = Math.floor(coord[1] / this.gridSize);
      const gridKey = `${gridX},${gridY}`;
      
      if (!this.gridIndex.has(gridKey)) {
        this.gridIndex.set(gridKey, new Set());
      }
      this.gridIndex.get(gridKey).add(nodeId);
      
      // 添加调试日志
      console.log(`将节点 ${nodeId} 添加到网格 ${gridKey}`);
    }
  
    // 找到最近的网络节点
    findNearestNode(coord) {
      console.log('开始查找最近节点，目标坐标:', coord);
      
      const gridX = Math.floor(coord[0] / this.gridSize);
      const gridY = Math.floor(coord[1] / this.gridSize);
      
      let searchRadius = 2;
      let nearestNode = null;
      let minDistance = Infinity;
      
      while (searchRadius <= 5 && !nearestNode) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            const searchGridKey = `${gridX + dx},${gridY + dy}`;
            const nodesInGrid = this.gridIndex.get(searchGridKey);
            
            if (nodesInGrid && nodesInGrid.size > 0) {
              for (const nodeId of nodesInGrid) {
                const node = this.network.nodes.get(nodeId);
                if (!node) continue;
                
                const distance = this.calculateDistance(coord, node.coordinate);
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestNode = node;
                }
              }
            }
          }
        }
        searchRadius++;
      }
      
      if (!nearestNode) {
        console.log('在网格中未找到节点，开始遍历所有节点');
        for (const [nodeId, node] of this.network.nodes) {
          const distance = this.calculateDistance(coord, node.coordinate);
          if (distance < minDistance) {
            minDistance = distance;
            nearestNode = node;
            console.log(`找到更近的节点: ${nodeId}, 距离: ${distance}`);
          }
        }
      }
      
      if (nearestNode) {
        console.log('找到最近节点:', {
          nodeId: nearestNode.id,
          coordinate: nearestNode.coordinate,
          distance: minDistance
        });
      } else {
        console.warn('未找到任何有效节点！');
      }
      
      return nearestNode;
    }
  
    // 修改坐标转换方法
    convertToEPSG4326(coord) {
      // console.log('转换前的坐标 (EPSG:3857):', coord);
      
      try {
        // 使用OpenLayers进行坐标转换
        const [lon, lat] = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
        const converted = [lon, lat];
        
        // console.log('转换后的坐标 (EPSG:4326):', converted);
        return converted;
      } catch (error) {
        console.error('坐标转换失败:', error);
        // 如果转换失败，返回原始坐标
        return coord;
      }
    }
  
    // 添加EPSG:4326转EPSG:3857的方法
    convertToEPSG3857(coord) {
      // console.log('转换前的坐标 (EPSG:4326):', coord);
      
      try {
        // 使用OpenLayers进行坐标转换
        const [x, y] = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
        const converted = [x, y];
        
        // console.log('转换后的坐标 (EPSG:3857):', converted);
        return converted;
      } catch (error) {
        console.error('坐标转换失败:', error);
        return coord;
      }
    }
  
    // Dijkstra最短路径算法
    findShortestPath(startCoord, endCoord) {
      console.log('计算路径:', {
        start: startCoord,
        end: endCoord
      });
      
      const convertedStartCoord = this.convertToEPSG4326(startCoord);
      const convertedEndCoord = this.convertToEPSG4326(endCoord);
      
      const startNode = this.findNearestNode(convertedStartCoord);
      const endNode = this.findNearestNode(convertedEndCoord);

      if (!startNode || !endNode) {
        console.log('未找到有效的起点或终点网络节点');
        return null;
      }
  
      // 初始化
      const distances = new Map();
      const previous = new Map();
      const unvisited = new Set();
  
      // 设置初始距离
      for (const [nodeId] of this.network.nodes) {
        distances.set(nodeId, Infinity);
        unvisited.add(nodeId);
      }
      distances.set(startNode.id, 0);
  
      while (unvisited.size > 0) {
        let currentNodeId = null;
        let minDistance = Infinity;
  
        for (const nodeId of unvisited) {
          const distance = distances.get(nodeId);
          if (distance < minDistance) {
            minDistance = distance;
            currentNodeId = nodeId;
          }
        }
  
        if (currentNodeId === null || currentNodeId === endNode.id) break;
  
        unvisited.delete(currentNodeId);
        const currentNode = this.network.nodes.get(currentNodeId);
  
        // 更新邻接节点的距离
        for (const neighborId of currentNode.connections) {
          if (unvisited.has(neighborId)) {
            const edgeId = `${currentNodeId}-${neighborId}`;
            const edge = this.network.edges.get(edgeId);
            const newDistance = distances.get(currentNodeId) + edge.distance;
  
            if (newDistance < distances.get(neighborId)) {
              distances.set(neighborId, newDistance);
              previous.set(neighborId, currentNodeId);
            }
          }
        }
      }
  
      // 构建路径
      const path = [];
      let current = endNode.id;
  
      // 如果没有找到路径
      if (!previous.has(current) && current !== startNode.id) {
        console.log('未找到有效路径');
        return null;
      }
  
      // 只构建网络路径，不包括起终点标注
      while (current) {
        const nodeCoord = this.network.nodes.get(current).coordinate;
        path.unshift(nodeCoord); // 使用unshift从头部插入，保持正确的顺序
        current = previous.get(current);
      }
  
      // 将路径中的所有坐标转换回EPSG:3857
      console.log('开始转换路径坐标为EPSG:3857');
      const convertedPath = path.map(coord => this.convertToEPSG3857(coord));
      
      console.log('最终路径 (EPSG:3857):', convertedPath);
      console.log('路径计算完成，节点数:', path.length);
      return convertedPath;
    }
  }