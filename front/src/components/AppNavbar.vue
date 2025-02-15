<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand d-flex align-items-center" href="#">
        <img src="@/assets/logo.png" alt="Logo" class="navbar-logo" @click="switchMap" />
        <span class="ms-2" @click="switchMap">城市共享单车投放管理系统</span>
      </a>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <input type="text" v-model="markerText" class="marker-input" placeholder="输入标注文字">
            <button @click="toggleMarkerMode" class="marker-button">{{ markerMode ? '禁用标注' : '启用标注' }}</button>
            <button @click="saveMarkers" class="marker-button">保存</button>
            <button class="marker-button" @click="togglePopupMode" :class="{ 'active': popupEnabled }">
              {{ popupEnabled ? 'PopHide' : 'PopUp' }}
            </button>
            <button class="marker-button" @click="calculateShortestPath">最短路径</button>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
              几何绘制
            </a>
            <ul class="dropdown-menu">
              <li class="dropdown-item">
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="drawType" id="lineString" value="LineString"
                    v-model="selectedDrawType">
                  <label class="form-check-label" for="lineString">
                    线段
                  </label>
                </div>
              </li>
              <li class="dropdown-item">
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="drawType" id="polygon" value="Polygon"
                    v-model="selectedDrawType">
                  <label class="form-check-label" for="polygon">
                    多边形
                  </label>
                </div>
              </li>
              <li>
                <hr class="dropdown-divider">
              </li>
              <li>
                <!-- 这是一个下拉菜单项,用于控制几何图形的绘制 -->
                <!-- 使用 d-flex 和 justify-content-between 使文本和状态点分布在两端 -->
                <a class="dropdown-item d-flex justify-content-between align-items-center" href="#"
                  @click="toggleDrawing" :class="{ 'disabled': !selectedDrawType }">
                  <!-- 根据 isDrawing 状态动态显示文本 -->
                  {{ isDrawing ? '停止绘制' : '开始绘制' }} <!-- isDrawing为true时显示'停止绘制',为false时显示'开始绘制' -->
                  <!-- 使用圆点(●)显示当前绘制状态,样式由 drawingStatusClass 控制 -->
                  <span class="badge" :class="drawingStatusClass">●</span>
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="#" @click="clearDrawing">
                  清除绘制
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item">
            <a class="nav-link text-center" href="#" @click="async () => { await loadGeoJsonFromServer('http://localhost:3000/regions'); showDialog('查询投放区域'); }">查询投放区域</a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-center" href="#" @click="showDialog('增设投放区域')">增设投放区域</a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-center" href="#" @click="loadBikeLocations">单车定位查询</a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-center" href="#" @click="showDialog('单车热点分析')">单车热点分析</a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-center" href="#" @click="loadGeoJsonFromServer('http://localhost:3000/geojson')">加载区域</a>
          </li>
          <li class="nav-item">
            <a class="nav-link text-center" href="#" @click="showObj">三维模型</a>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="isDialogVisible" class="dialog" @mousedown="startDrag" @mousemove="onDrag" @mouseup="stopDrag"
      @mouseleave="stopDrag"
      :style="{ width: dialogWidth + 'px', height: dialogHeight + 'px', left: dialogX + 'px', top: dialogY + 'px' }">
      <div class="dialog-header" @mousedown.stop="startResize">
        <h3>{{ dialogTitle }}</h3>
        <button @click="toggleDialog">关闭</button>
      </div>
      <div class="dialog-content">
        <component :is="dialogComponent" />
      </div>
      <div class="resize-handle"></div>
    </div>

  </nav>
</template>

<script>
/* global ol */
import AreaQueryDialog from './AreaQueryDialog.vue';
import AddAreaDialog from './AddAreaDialog.vue';
import HeatMapDialog from './HeatMapDialog.vue';
import markerUtil from '../utils/marker';
import geometry from '../utils/geometry';
import routeCalculator from '../utils/routeCalculator';

export default {
  name: 'AppNavbar',
  data() {
    return {
      isDialogVisible: false,
      isDragging: false,
      isResizing: false,
      dialogX: window.innerWidth * 0.2, // 初始位置
      dialogY: window.innerWidth * 0.2, // 初始位置
      dialogWidth: 800, // 初始宽度
      dialogHeight: 500, // 初始高度
      dialogTitle: '',
      dialogComponent: null,  //动态加载对话框组件

      mapUrls: [
        'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'http://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'http://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'http://localhost:8989/geoserver/wms',
      ],
      mapLayers: [],  //存储底图层
      currentMapIndex: 0,//当前底图索引

      markerMode: false,
      markerText: '',

      selectedDrawType: null,
      isDrawing: false,
      popupEnabled: false, // 添加 popup 控制状态
      pathPoints: [], // 存储用于计算路径的两个点
    };
  },

  computed: {
    // 计算绘制状态的样式类
    drawingStatusClass() {
      // 如果正在绘制,返回成功文本颜色类(绿色)
      // 如果已选择绘制类型但未开始绘制,返回警告文本颜色类(黄色)
      return this.isDrawing ? 'text-success' : 'text-warning';
    }
  },

  watch: {
    // 监听绘制类型的变化
    //当被监听的数据发生变化时，会触发对应的回调函数
    selectedDrawType(newType) {
      if (newType) {
        console.log(`选择绘制类型: ${newType === 'LineString' ? '线段' : '多边形'}`);

        // 如果正在绘制，直接切换到新的绘制类型
        if (this.isDrawing) {
          console.log('切换绘制类型，重新开始绘制');
          geometry.stopDrawing();
          geometry.startDrawing(this.$parent.map, newType);
        }
      }
    }
  },

  methods: {
    showDialog(type) {
      this.dialogTitle = type;
      this.dialogComponent = this.getDialogComponent(type);
      this.isDialogVisible = true;
    },
    getDialogComponent(type) {
      switch (type) {
        case '查询投放区域':
          return AreaQueryDialog;
        case '增设投放区域':
          return AddAreaDialog;
        case '单车热点分析':
          return HeatMapDialog;
        default:
          return null;
      }
    },
    toggleDialog() {
      this.isDialogVisible = !this.isDialogVisible;
    },
    startDrag(event) {
      if (this.isResizing) return;
      this.isDragging = true;
      this.offsetX = event.clientX - this.dialogX;
      this.offsetY = event.clientY - this.dialogY;
    },
    onDrag(event) {
      if (this.isDragging) {
        this.dialogX = event.clientX - this.offsetX;
        this.dialogY = event.clientY - this.offsetY;
      }
    },
    stopDrag() {
      this.isDragging = false;
    },
    startResize(event) {
      this.isResizing = true;
      this.startWidth = this.dialogWidth;
      this.startHeight = this.dialogHeight;
      this.startX = event.clientX;
      this.startY = event.clientY;

      window.addEventListener('mousemove', this.resize);
      window.addEventListener('mouseup', this.stopResize);
    },
    resize(event) {
      if (this.isResizing) {
        this.dialogWidth = this.startWidth + (event.clientX - this.startX);
        this.dialogHeight = this.startHeight + (event.clientY - this.startY);
      }
    },
    stopResize() {
      this.isResizing = false;
      window.removeEventListener('mousemove', this.resize);
      window.removeEventListener('mouseup', this.stopResize);
    },

    //切换底图
    switchMap() {
      this.currentMapIndex = (this.currentMapIndex + 1) % this.mapUrls.length;
      const currentUrl = this.mapUrls[this.currentMapIndex];
      
      if (currentUrl.includes('geoserver')) {
        // 如果是GeoServer图层,需要创建WMS图层
        const wmsSource = new ol.source.TileWMS({
          url: currentUrl,
          params: {
            'LAYERS': 'webgis:nanjing_railway', // 替换为您的工作空间和图层名
            'TILED': true,
            'FORMAT': 'image/png',
          },
          serverType: 'geoserver'
        });
        
        // 发送WMS图层配置给父组件
        this.$emit('changeMap', {
          type: 'wms',
          source: wmsSource
        });
      } else {
        // 普通XYZ图层
        this.$emit('changeMap', currentUrl);
      }
    },

    //显示三维模型
    showObj() {
      this.$emit('showObj');
    },

    //标注点绘制
    toggleMarkerMode() {
      this.markerMode = !this.markerMode;
      if (this.markerMode) {
        //启用标注模式
        this.$parent.map.on('click', this.handleMapClick);
        console.log('标注模式已启用');
      } else {
        //禁用标注模式
        this.$parent.map.un('click', this.handleMapClick);
        console.log('标注模式已禁用');
      }
    },
    //地图点击事件
    handleMapClick(event) {
      if (!this.markerMode) return;
      const coordinate = event.coordinate;
      const text = this.markerText || `点 ${this.pathPoints.length + 1}`;
      markerUtil.addMarker(coordinate, text);
      
      // 存储最新的两个点用于路径计算
      this.pathPoints.push(coordinate);
      if (this.pathPoints.length > 2) {
        this.pathPoints.shift(); // 只保留最新的两个点
      }
      
      console.log(`添加标注: 坐标(${coordinate[0]}, ${coordinate[1]}), 文本: "${text}"`);
    },
    //保存标注点到服务器
    async saveMarkers() {
      try {
        const markers = markerUtil.getAllMarkers();
        const response = await fetch('http://localhost:3000/markers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(markers),
        });
        if (response.ok) {
          console.log('标注点保存成功');
        } else {
          console.error('标注点保存失败');
        }
      } catch (error) {
        console.error('标注点保存失败', error);
      }
    },

    // 切换绘制状态
    toggleDrawing() {
      if (!this.selectedDrawType) {
        alert('请先选择绘制类型！');
        console.log('未选择绘制类型，无法开始绘制');
        return;
      }

      this.isDrawing = !this.isDrawing;

      if (this.isDrawing) {
        // 开始绘制
        console.log(`开始绘制${this.selectedDrawType === 'LineString' ? '线段' : '多边形'}`);
        geometry.startDrawing(this.$parent.map, this.selectedDrawType);
      } else {
        // 停止绘制
        console.log('停止绘制');
        geometry.stopDrawing();
      }
    },

    // 清除绘制
    clearDrawing() {
      console.log('清除所有绘制内容');
      geometry.clearDrawing();
    },

    // 添加 popup 控制方法
    togglePopupMode() {
      this.popupEnabled = !this.popupEnabled;
      console.log(`${this.popupEnabled ? '启用' : '禁用'}信息框模式`);
      // 通知父组件 popup 状态变化
      this.$emit('togglePopup', this.popupEnabled);
    },

    async loadGeoJsonFromServer(url) {
      try {
        console.log('开始从服务器加载 GeoJSON 数据');
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const geojsonData = await response.json();
        console.log('成功获取 GeoJSON 数据:', geojsonData);
        
        // 通过事件发送数据给父组件
        this.$emit('loadGeoJson', geojsonData);
        
      } catch (error) {
        console.error('加载 GeoJSON 数据失败:', error);
      }
    },

    async loadBikeLocations() {
      try {
        const response = await fetch('http://localhost:3000/bikes');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const bikeData = await response.json();
        this.$emit('loadBikeLocations', bikeData);
      } catch (error) {
        console.error('加载单车位置数据失败:', error);
      }
    },

    // 修改计算最短路径的方法
    async calculateShortestPath() {
      try {
        if (this.pathPoints.length !== 2) {
          alert('请先标注起点和终点（最新的两个标注点将作为起终点）');
          return;
        }

        console.log('开始计算最短路径...');
        console.log('起点:', this.pathPoints[0]);
        console.log('终点:', this.pathPoints[1]);

        // 切换到 GeoServer 底图
        const geoserverUrl = this.mapUrls[3]; // GeoServer URL
        this.$emit('changeMap', {
          type: 'wms',
          source: new ol.source.TileWMS({
            url: geoserverUrl,
            params: {
              'LAYERS': 'webgis:nanjing_railway',
              'TILED': true,
              'FORMAT': 'image/png',
            },
            serverType: 'geoserver'
          })
        });

        // 等待一下确保底图切换完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 创建路径计算实例并初始化
        const pathFinder = new routeCalculator();
        console.log('正在构建路网...');
        try {
          await pathFinder.buildNetwork();
          console.log('路网构建完成');
        } catch (error) {
          console.error('路网构建失败:', error);
          throw error;
        }

        // 计算最短路径
        console.log('开始计算路径...');
        const path = await pathFinder.findShortestPath(this.pathPoints[0], this.pathPoints[1]);
        
        if (path) {
          console.log('路径计算成功:', path);
          // 发送路径数据给父组件进行绘制
          this.$emit('drawPath', path);
        } else {
          console.error('未找到有效路径');
          alert('无法找到有效路径');
        }
      } catch (error) {
        console.error('路径计算过程出错:', error);
        alert('路径计算失败: ' + error.message);
      }
    },
  },
};
</script>

<style>
.dialog {
  position: absolute;
  background: white;
  padding: 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1001;
}

.dialog-header {
  padding: 10px;
  background: #000;
  /* 黑色背景 */
  color: white;
  /* 字体颜色为白色 */
  cursor: move;
  /* 移动手型 */
  display: flex;
  align-items: center;
  /* 垂直居中 */
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.dialog-header h3 {
  margin: 0;
  /* 去掉默认的外边距 */
  flex-grow: 1;
  /* 占据剩余空间 */
  text-align: left;
  /* 左对齐 */
  font-size: 24px;
  /* 设置字体大小 */
}

.dialog-content {
  padding: 20px;
}

.resize-handle {
  width: 10px;
  height: 10px;
  background: #ccc;
  position: absolute;
  bottom: 0;
  right: 0;
  cursor: se-resize;
  /* 调整大小手型 */
}

button {
  background-color: #007bff;
  /* 蓝色背景 */
  color: white;
  /* 字体颜色为白色 */
  border: none;
  /* 去掉边框 */
  padding: 8px 12px;
  /* 内距 */
  border-radius: 4px;
  /* 圆角 */
  cursor: pointer;
  /* 鼠标手型 */
  transition: background-color 0.3s;
  /* 动画效果 */
}

button:hover {
  background-color: #0056b3;
  /* 悬停时的颜色 */
}

/* 美化输入框 */
.marker-input {
  border: 1px solid #ccc;
  width: 120px;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
  margin-right: 10px;
}

/* 美化按钮 */
.marker-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 5px;
}

.marker-button:hover {
  background-color: #0056b3;
}

/* 添加下拉菜单样式 */
.dropdown-menu {
  background-color: #343a40;
}

.dropdown-item {
  color: white;
}

.dropdown-item:hover {
  background-color: #495057;
  color: white;
}

/* 添加选中状态的样式 */
.dropdown-item.active {
  background-color: #007bff;
  color: white;
}

/* 添加分隔线样式 */
.dropdown-divider {
  border-top: 1px solid #444;
  margin: 0.5rem 0;
}

/* 添加单选框样式 */
.form-check {
  padding-left: 1.5rem;
}

.form-check-input {
  cursor: pointer;
}

.form-check-label {
  cursor: pointer;
  color: white;
  margin-left: 0.5rem;
}

/* 状态指示器样式 */
.badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.4rem;
}

.text-success {
  color: #28a745 !important;
}

.text-warning {
  color: #ffc107 !important;
}

.text-secondary {
  color: #6c757d !important;
}

/* 禁用状态样式 */
.dropdown-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 下拉菜单项样式调整 */
.dropdown-item {
  padding: 0.5rem 1rem;
}

.dropdown-item:hover:not(.disabled) {
  background-color: #495057;
}

/* 添加 popup 控制按钮样式 */
.nav-link.btn-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
}

.nav-link.btn-link:hover {
  color: #007bff;
}

.nav-link.btn-link.active {
  color: #28a745;
}

/* 当点击下拉菜单时保持显示状态 */
.dropdown:focus-within .dropdown-menu {
  display: block !important;
}

/* 修改 logo 相关样式 */
.navbar-logo {
  height: 32px;
  width: 32px;
  /* 设置固定宽度，确保是正圆形 */
  object-fit: cover;
  /* 改为 cover 以确保图片填充整个圆形区域 */
  border-radius: 50%;
  /* 使图片变为圆形 */
  border: 2px solid #fff;
  /* 添加白色边框 */
  padding: 2px;
  /* 内边距，使边框图片之间有一些空间 */
  background-color: #fff;
  /* 背景色为白色 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* 添加轻微阴影效果 */
}

/* 优化标题样式 */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 稍微增加 logo 和文字之间的间距 */
}

.navbar-brand span {
  font-size: 1.2rem;
  font-weight: 500;
}
</style>