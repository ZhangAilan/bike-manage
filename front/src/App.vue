<template>
  <div id="app">
    <AppNavbar @changeMap="updateMap" @showObj="showObj" @togglePopup="handlePopupToggle" />
    <!-- Map Container -->
    <div id="map" style="height: 100vh;"></div>
    <!-- 弹窗组件 -->
    <MapPopup v-if="showPopup" ref="popup" @close="closePopup" />
  </div>
</template>

<script>
/* global ol */
import AppNavbar from './components/AppNavbar.vue';
import MapPopup from './components/MapPopup.vue';
import { addCubeToMap } from './utils/threeObjLoader';
import markerUtil from './utils/marker';
import geometryUtil from './utils/geometry';

export default {
  name: 'App',
  components: {
    AppNavbar,
    MapPopup,
  },

  data() {
    return {
      map: null,
      threeScene: null,
      geojsonLayer: null,
      overlay: null,
      showPopup: false,
      popupEnabled: false,
    };
  },

  mounted() {
    this.initMap();
    this.loadGeoJson('geojson/region.json');
    this.initPopupOverlay();
    //初始化标注图层
    markerUtil.map = this.map;  // 将地图实例传递给markerUtil
    markerUtil.initMarkerLayer();  // 初始化标注图层
    this.loadMarkersFromServer();
    //初始化几何绘制图层
    geometryUtil.initVectorLayer(this.map);
  },

  methods: {
    //底图相关操作
    initMap() {
      console.log('Initializing map...'); // 添加调试信息
      //先清除元素内的内容
      document.getElementById('map').innerHTML = '';
      //创建openlayers地图实例
      this.map = new ol.Map({
        target: 'map',
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          }),
        ],
        view: new ol.View
          ({
            //地图中心为南京工业大学
            center: ol.proj.fromLonLat([118.7967, 32.0594]),
            zoom: 10
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
        if (layer instanceof ol.layer.Tile) {
          this.map.removeLayer(layer);
        }
      });
      const newTileLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: url,
          maxzoom: 30,
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
      this.map = null;
      console.log('Map and all layers have been removed.');
    },

    // 加载 GeoJSON 数据并叠加在底图上
    loadGeoJson(filePath) {
      console.log('开始加载 GeoJSON 数据:', filePath);
      if (this.geojsonLayer) {
        this.map.removeLayer(this.geojsonLayer);
      }

      fetch(filePath)
        .then((response) => response.json())
        .then((data) => {
          console.log('GeoJSON 数据加载成功:', data);
          this.geojsonLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
              features: new ol.format.GeoJSON().readFeatures(data, {
                featureProjection: 'EPSG:3857',
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

          this.map.addLayer(this.geojsonLayer);
          console.log('GeoJSON 图层已添加到地图');
        })
        .catch((error) => console.error('加载 GeoJSON 数据失败:', error));
    },

    //展示三维模型
    showObj() {
      console.log('Show OBJ file...');
      this.clearMap();
      addCubeToMap(this.map);
    },

    //从后端加载标注点
    async loadMarkersFromServer() {
      try {
        const response = await fetch('http://localhost:3000/markers');
        if (response.ok) {
          const data = await response.json();
          markerUtil.loadMarkersFromServer(data);
          console.log('标注点从后端加载成功', data);
        } else {
          console.error('加载标注点失败', response.statusText);
        }
      } catch (error) {
        console.error('加载标注点失败', error);
      }
    },
    //初始化弹窗overlay
    initPopupOverlay() {
      console.log('初始化 Popup Overlay');
      this.overlay = new ol.Overlay({
        positioning: 'bottom-center',
        stopEvent: false,
        autoPan: true,
        autoPanAnimation: {
          duration: 250,
        },
      });
      
      this.map.addOverlay(this.overlay);
      console.log('Popup Overlay 已添加到地图');

      this.map.on('click', (evt) => {
        if (!this.popupEnabled) {
          console.log('信息框功能已禁用');
          return;
        }

        console.log('地图点击事件触发');
        const feature = this.map.forEachFeatureAtPixel(evt.pixel, 
          (feature) => {
            console.log('找到要素:', feature.getProperties());
            return feature;
          },
          {
            layerFilter: (layer) => {
              const isGeoJsonLayer = layer === this.geojsonLayer;
              console.log('图层检查:', isGeoJsonLayer);
              return isGeoJsonLayer;
            }
          }
        );

        if (feature) {
          console.log('点击了 GeoJSON 要素');
          const coordinate = evt.coordinate;
          this.showPopup = true;
          
          this.$nextTick(() => {
            if (this.$refs.popup) {
              console.log('设置 Popup 位置:', coordinate);
              this.overlay.setElement(this.$refs.popup.$el);
              this.overlay.setPosition(coordinate);
            } else {
              console.error('Popup 引用未找到');
            }
          });
        } else {
          console.log('点击在 GeoJSON 要素外');
          this.closePopup();
        }
      });
    },
    closePopup() {
      console.log('关闭Popup');
      this.showPopup = false;
      this.overlay.setPosition(undefined);
    },
    handlePopupToggle(enabled) {
      console.log(`${enabled ? '启用' : '禁用'}信息框功能`);
      this.popupEnabled = enabled;
      
      if (!enabled) {
        // 如果禁用，关闭当前显示的 popup
        this.closePopup();
      }
    },
  }
}
</script>

<style></style>