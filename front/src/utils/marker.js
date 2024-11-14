/* global ol */
export default {
    map: null,
    markerLayer: null,
    markerText: null,

    //初始化标注图层
    initMarkerLayer() {
        // 创建一个矢量图层用于显示标注
        this.markerLayer = new ol.layer.Vector({
            // 使用Vector数据源存储标注要素
            source: new ol.source.Vector(),
            // 使用createMarkerStyle方法定义标注的样式
            style: this.createMarkerStyle()
        });
        // 将标注图层添加到地图中
        this.map.addLayer(this.markerLayer);
        console.log('标注图层已初始化');
    },

    //创建标注的样式
    createMarkerStyle() {
        return (feature) => {  // 修改为返回一个函数，接收 feature 参数
            return new ol.style.Style({
                // 创建圆形标注
                image: new ol.style.Circle({
                    radius: 10,
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 0, 0, 0.6)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#ffffff',
                        width: 2
                    })
                }),
                // 添加文本样式
                text: new ol.style.Text({
                    text: feature.get('name'),  // 从 feature 获取 'name' 属性作为文本
                    textAlign: 'center',
                    textBaseline: 'middle',
                    font: '14px sans-serif',
                    fill: new ol.style.Fill({
                        color: '#000000'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#ffffff',
                        width: 3
                    }),
                    offsetY: -20
                })
            });
        };
    },

    //添加标注点
    // 添加标注点的方法,接收坐标和文本作为参数
    addMarker(coordinate, text) {
        // 创建一个新的要素对象,包含几何信息和属性
        const feature = new ol.Feature({
            // 使用传入的坐标创建点几何对象
            geometry: new ol.geom.Point(coordinate),
            // 设置要素的name属性为传入的文本
            name: text
        });
        // 将新创建的要素添加到标注图层的数据源中
        this.markerLayer.getSource().addFeature(feature);
        // 返回创建的要素对象
        return feature;
    },

    //获取所有标注点数据
    getAllMarkers() {
        if (!this.markerLayer) {
            console.error('标注图层未初始化');
            return [];
        }
        const features = this.markerLayer.getSource().getFeatures();  // 获取标注图层中的所有要素
        return features.map(feature => ({
            coordinate: feature.getGeometry().getCoordinates(),  // 获取要素的几何坐标
            text: feature.get('name')  // 获取要素的name属性作为文本
        }));
    },

    //从后端数据加载标注点
    loadMarkersFromServer(markersData){
        if(!Array.isArray(markersData)){
            console.error('标注数据格式不正确');
            return;
        }
        markersData.forEach(marker=>{
            this.addMarker(marker.coordinate, marker.text);
        });
    }
}