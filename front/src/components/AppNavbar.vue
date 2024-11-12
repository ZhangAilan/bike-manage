<template>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center" href="#">
          <img src="images/bike.png" alt="Logo" width="50" height="auto" class="d-inline-block align-text-top" @click="switchMap">
          <span class="ms-2" @click="switchMap">城市共享单车投放管理系统</span>
        </a>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="nav-link text-center" href="#" @click="showDialog('查询投放区域')">查询投放区域</a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-center" href="#">增设投放区域</a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-center" href="#">单车定位查询</a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-center" href="#">单车热点分析</a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-center" href="#" @click="showObj">三维模型</a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-center" href="#" @click="selectObjFile">导入文件</a>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="isDialogVisible" class="dialog"
         @mousedown="startDrag" 
         @mousemove="onDrag" 
         @mouseup="stopDrag" 
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
import AreaQueryDialog from './dialogs/AreaQueryDialog.vue';

export default {
  name: 'AppNavbar',
  data() {
    return {
      isDialogVisible: false,
      isDragging: false,
      isResizing: false,
      dialogX: window.innerWidth*0.2, // 初始位置
      dialogY: window.innerWidth*0.2, // 初始位置
      dialogWidth: 800, // 初始宽度
      dialogHeight: 500, // 初始高度
      dialogTitle: '',
      dialogComponent: null,  //动态加载对话框组件

      mapUrls:[
        'http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}',
        'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'http://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'http://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 
      ],
      mapLayers:[],  //存储底图层
      currentMapIndex:0 //当前底图索引
    };
  },

  methods: {
    showDialog(type){
      this.dialogTitle=type;
      this.dialogComponent=this.getDialogComponent(type);
      this.isDialogVisible=true;
    },
    getDialogComponent(type){
      switch(type){
        case '查询投放区域':
          return AreaQueryDialog;
        // case '增设区域':
        //   return AddAreaDialog;
        // case '单车定位':
        //   return BikeLocationDialog;
        // case '热点分析':
        //   return HotspotAnalysisDialog;
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

    switchMap() {
      this.currentMapIndex = (this.currentMapIndex + 1) % this.mapUrls.length;
      const currentUrl = this.mapUrls[this.currentMapIndex];
      this.$emit('changeMap', currentUrl);
    },

    selectObjFile(){
      this.$emit('openFileDialog');
    },
    showObj(){
      this.$emit('showObj');
    }
  }
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
  background: #000; /* 黑色背景 */
  color: white; /* 字体颜色为白色 */
  cursor: move; /* 移动手型 */
  display: flex;
  align-items: center; /* 垂直居中 */
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.dialog-header h3 {
  margin: 0; /* 去掉默认的外边距 */
  flex-grow: 1; /* 占据剩余空间 */
  text-align: left; /* 左对齐 */
  font-size: 24px; /* 设置字体大小 */
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
  cursor: se-resize; /* 调整大小手型 */
}

button {
background-color: #007bff; /* 蓝色背景 */
color: white; /* 字体颜色为白色 */
border: none; /* 去掉边框 */
padding: 8px 12px; /* 内边距 */
border-radius: 4px; /* 圆角 */
cursor: pointer; /* 鼠标手型 */
transition: background-color 0.3s; /* 动画效果 */
}

button:hover {
background-color: #0056b3; /* 悬停时的颜色 */
}
</style>