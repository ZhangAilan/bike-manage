<template>
  <div id="app">
    <AppNavbar @changeMap="updateMap" @showObj="showObj" @togglePopup="handlePopupToggle" @loadGeoJson="handleLoadGeoJson" />
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
    this.initPopupOverlay();
    markerUtil.map = this.map;  // 将地图实例传递给markerUtil
    markerUtil.initMarkerLayer();  // 初始化标注图层
    this.loadMarkersFromServer();
    geometryUtil.initVectorLayer(this.map);  //初始化几何绘制图层
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
              this.$refs.popup.updateFeature(feature);
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
    // 加载GeoJSON数据的方法
    // 该方法接收一个geojsonData参数,包含要在地图上显示的GeoJSON格式的数据
    handleLoadGeoJson(geojsonData) {
      console.log('开始加载 GeoJSON 数据');
      // 如果已存在GeoJSON图层,先将其移除
      if (this.geojsonLayer) {
        this.map.removeLayer(this.geojsonLayer);
      }

      // 创建新的矢量图层
      this.geojsonLayer = new ol.layer.Vector({
        // 创建矢量数据源
        source: new ol.source.Vector({
          // 将GeoJSON数据转换为OpenLayers的Feature对象
          // 并指定投影为Web墨卡托(EPSG:3857)
          features: new ol.format.GeoJSON().readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857',
          }),
        }),
        // 定义要素的样式
        style: (feature) => {
          return new ol.style.Style({
            // 填充样式 - 半透明的绿色
            fill: new ol.style.Fill({
              color: 'rgba(0, 150, 136, 0.5)',
            }),
            // 边框样式 - 实线绿色,宽度3像素
            stroke: new ol.style.Stroke({
              color: '#009688',
              width: 3,
            }),
            // 如果要素有name属性,则添加文本标注
            text: feature.get('name') ? new ol.style.Text({
              font: '14px Calibri,sans-serif', // 字体设置
              fill: new ol.style.Fill({
                color: '#000',  // 黑色文字
              }),
              offsetX: 0,      // 文本X轴偏移
              offsetY: 20,     // 文本Y轴偏移20像素
              textBaseline: 'middle', // 文本基线居中对齐
              textAlign: 'center',    // 文本水平居中
              text: feature.get('name'), // 显示要素的name属性值
            }) : null,
          });
        },
      });

      // 将新创建的图层添加到地图中
      this.map.addLayer(this.geojsonLayer);
      console.log('GeoJSON 图层已添加到地图');
    },
  }
}
</script>

<style></style>