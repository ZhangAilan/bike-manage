<template>
  <div id="app">
    <AppNavbar @changeMap="updateMap" @openFileDialog="openFileDialog" @showObj="showObj"/>
    <!-- 文件选择框 -->
    <input type="file" accept=".obj,.mtl" multiple ref="fileInput" style="display: none;" @change="handleFileUpload">
    <!-- Map Container -->
    <div id="map" style="height: 100vh;"></div>
  </div>
</template>

<script>
/* global ol */
import AppNavbar from './components/AppNavbar.vue';
import {addCubeToMap } from './threeObjLoader';

export default {
  name: 'App',
  components: {
    AppNavbar,
  },

  data(){
    return{
      map: null,
      threeScene: null,
      geojsonlayer:null,
    };
  },

  mounted() {
  this.initMap(); 
  this.loadGeoJson('geojson/region.json');
  },

  methods: {
    //底图相关操作
    initMap() {
      console.log('Initializing map...'); // 添加调试信息
      //先清除元素内的内容
      document.getElementById('map').innerHTML = '';

      //创建openlayers地图实例
      this.map=new ol.Map({
        target:'map',
        layers:[
          new ol.layer.Tile({
            source:new ol.source.OSM()
          }),
        ],
        view: new ol.View
        ({
          //地图中心为南京工业大学
          center:ol.proj.fromLonLat([118.7967,32.0594]),
          zoom:10
        }),
      });
      console.log('Map initialized:', this.map); // 确认地图是否初始化成功
    },

    updateMap(url) {
      if (!this.map) {
        this.initMap();
        return;
      }
      this.map.getLayers().forEach((layer) => {
        if(layer instanceof ol.layer.Tile){
          this.map.removeLayer(layer);
        }
      });
      const newTileLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: url,
          maxzoom:30,
        }),
      });
      this.map.addLayer(newTileLayer);
    },

    clearMap() {
      if (!this.map) {
        console.error('Map is not initialized yet.');
        return;
      }
      this.map.getLayers().clear();
      this.map.setTarget(null);
      this.map=null;
      console.log('Map and all layers have been removed.');
    },

    // 加载 GeoJSON 数据并叠加在底图上
    loadGeoJson(filePath) {
      // 检查并移除已有的 GeoJSON 图层，但保留底图
      if (this.geojsonLayer) {
        this.map.removeLayer(this.geojsonLayer);
      }

      // 使用 fetch API 加载本地 GeoJSON 数据
      fetch(filePath)
        .then((response) => response.json())
        .then((data) => {
          // 创建一个新的 GeoJSON 图层
          this.geojsonLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
              features: new ol.format.GeoJSON().readFeatures(data, {
                featureProjection: 'EPSG:3857', // 确保与底图一致的投影
              }),
            }),
            style: (feature) => {
                return new ol.style.Style({
                // 填充样式
                fill: new ol.style.Fill({
                  color: 'rgba(0, 150, 136, 0.5)', // 填充色
                }),
                // 边界样式
                stroke: new ol.style.Stroke({
                  color: '#009688', // 边界颜色
                  width: 3, // 边界宽度
                }),
                // 文字标签样式
                text: feature.get('name') ? new ol.style.Text({
                  font: '14px Calibri,sans-serif', // 字体样式
                  fill: new ol.style.Fill({
                  color: '#000', // 字体颜色
                  }),
                  offsetX: 0, // 水平偏移
                  offsetY: 20, // 垂直偏移
                  textBaseline: 'middle', // 文字基线
                  textAlign: 'center', // 文字对齐方式
                  text: feature.get('name'), // 仅显示有 'name' 属性的要素
                }) : null,
              });
            },
          });

          // 添加 GeoJSON 图层而不覆盖底图
          this.map.addLayer(this.geojsonLayer);

          // 缩放地图视图以适应 GeoJSON 图层范围
          this.map.getView().fit(this.geojsonLayer.getSource().getExtent());
        })
        .catch((error) => console.error('Error loading GeoJSON data:', error));
    },

    // 文件上传相关操作
    openFileDialog() {
      this.$refs.fileInput.click();
    },
    handleFileUpload(event) {
      const files = event.target.files;
      let objFile = null;
      let mtlFile = null;
      for (const file of files) {
        if (file.name.endsWith('.obj')) {
          objFile = file; // 必须文件
        } else if (file.name.endsWith('.mtl')) {
          mtlFile = file; // 可选文件
        }
      }
      // 确保OBJ文件存在
      if (objFile) {
        this.loadObjFile(objFile, mtlFile);
      } else {
        alert('请上传一个OBJ文件！'); // 提示用户必须上传OBJ文件
      }
    },
    loadObjFile(objFile, mtlFile) {
      // 创建OBJ文件的URL
      const objFilePath = URL.createObjectURL(objFile);
      let mtlFilePath = null;

      // 如果有MTL文件，创建MTL文件的URL
      if (mtlFile) {
        mtlFilePath = URL.createObjectURL(mtlFile);
      }
      console.log('Loading OBJ file:', objFilePath); // 添加调试信息
      console.log('Loading MTL file:', mtlFilePath); // 添加调试信息
    },

    showObj() {
      console.log('Show OBJ file...');
      this.clearMap();
      addCubeToMap(this.map);
    }
  }
}
</script>

<style>
</style>