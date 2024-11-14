//几何图形绘制，线、面、停止绘制、清除绘制
/* global ol */
export default {
    map: null,
    vectorLayer: null,
    vectorSource: null,
    isDrawing: false,
    currentPoints: [], // 存储当前绘制的点
    tempFeature: null, // 存储临时要素
    mousePosition: null, // 存储鼠标位置
    features: [], // 存储已完成的要素

    // 线条样式
    lineStyle: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#ff0000',
            width: 3
        })
    }),

    // 多边形样式
    polygonStyle: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 0, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#0000ff',
            width: 2
        })
    }),

    // 多边形预览样式（绘制过程中的样式）
    polygonPreviewStyle: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 0, 0.1)'
        }),
        stroke: new ol.style.Stroke({
            color: '#0000ff',
            width: 2,
            lineDash: [5, 5] // 添加虚线效果
        })
    }),

    //初始化矢量图层
    initVectorLayer(map) {
        this.map = map;
        this.vectorSource = new ol.source.Vector();
        this.vectorLayer = new ol.layer.Vector({
            source: this.vectorSource,
            style: (feature) => {
                const geomType = feature.getGeometry().getType();
                // 如果是临时要素，使用预览样式
                if (feature.get('temp')) {
                    return geomType === 'LineString' ? this.lineStyle : this.polygonPreviewStyle;
                }
                return geomType === 'LineString' ? this.lineStyle : this.polygonStyle;
            }
        });
        this.map.addLayer(this.vectorLayer);
    },

    //开始绘制
    startDrawing(map, type) {
        if (!this.vectorLayer) {
            this.initVectorLayer(map);
        }
        this.isDrawing = true;
        this.currentPoints = [];
        this.drawType = type;
        
        // 禁用双击缩放
        this.disableDoubleClickZoom();
        
        // 添加点击监听
        this.clickListener = (event) => {
            const coordinate = event.coordinate;
            
            // 检查是否是双击
            if (event.type === 'dblclick') {
                event.preventDefault();
                event.stopPropagation();
                // 如果点数足够，完成当前图形
                if ((this.drawType === 'LineString' && this.currentPoints.length >= 1) ||
                    (this.drawType === 'Polygon' && this.currentPoints.length >= 2)) {
                    // 添加最后一个点（双击的位置）
                    this.currentPoints.push(coordinate);
                    this.finishDrawing();
                }
                return false;
            }
            
            // 单击添加点
            this.currentPoints.push(coordinate);
            console.log('添加点:', coordinate);
            this.updateFeature();
        };

        // 添加鼠标移动监听
        this.mouseMoveListener = (event) => {
            this.mousePosition = event.coordinate;
            this.updatePreview();
        };
        
        // 添加事件监听
        this.map.on('click', this.clickListener);
        this.map.on('dblclick', this.clickListener);
        this.map.on('pointermove', this.mouseMoveListener);
        
        console.log(`开始绘制${type === 'LineString' ? '线段' : '多边形'}`);
    },

    // 更新预览
    updatePreview() {
        if (!this.isDrawing || this.currentPoints.length === 0) return;

        // 创建预览点数组
        const previewPoints = [...this.currentPoints];
        if (this.mousePosition) {
            previewPoints.push(this.mousePosition);
        }

        // 更新或创建预览要素
        let geometry;
        if (this.drawType === 'LineString') {
            geometry = new ol.geom.LineString(previewPoints);
        } else {
            if (previewPoints.length >= 3) {
                geometry = new ol.geom.Polygon([[...previewPoints, previewPoints[0]]]);
            } else {
                geometry = new ol.geom.LineString(previewPoints);
            }
        }

        if (!this.tempFeature) {
            this.tempFeature = new ol.Feature({
                geometry: geometry,
                temp: true
            });
            this.vectorSource.addFeature(this.tempFeature);
        } else {
            this.tempFeature.setGeometry(geometry);
        }
    },

    // 更新要素
    updateFeature() {
        if (this.currentPoints.length < 2) return;
        
        // 更新临时要素
        let geometry;
        if (this.drawType === 'LineString') {
            geometry = new ol.geom.LineString(this.currentPoints);
        } else {
            if (this.currentPoints.length >= 3) {
                geometry = new ol.geom.Polygon([[...this.currentPoints, this.currentPoints[0]]]);
            } else {
                geometry = new ol.geom.LineString(this.currentPoints);
            }
        }

        if (this.tempFeature) {
            this.tempFeature.setGeometry(geometry);
        }
    },

    // 完成绘制
    finishDrawing() {
        if ((this.drawType === 'LineString' && this.currentPoints.length < 2) ||
            (this.drawType === 'Polygon' && this.currentPoints.length < 3)) {
            console.log('点数不足，无法完成绘制');
            return;
        }

        // 创建最终要素
        let geometry;
        if (this.drawType === 'LineString') {
            geometry = new ol.geom.LineString(this.currentPoints);
        } else {
            // 确保多边形闭合
            const points = [...this.currentPoints];
            if (points[0] !== points[points.length - 1]) {
                points.push(points[0]);
            }
            geometry = new ol.geom.Polygon([points]);
        }

        if (geometry) {
            // 移除临时要素
            if (this.tempFeature) {
                this.vectorSource.removeFeature(this.tempFeature);
                this.tempFeature = null;
            }

            // 添加最终要素
            const feature = new ol.Feature({
                geometry: geometry
            });
            this.vectorSource.addFeature(feature);
            this.features.push(feature); // 保存已完成的要素
            
            console.log(`完成${this.drawType === 'LineString' ? '线段' : '多边形'}绘制`);
        }

        // 准备开始新的绘制
        this.currentPoints = [];
        this.mousePosition = null;
        
        // 不停止绘制，而是准备绘制下一个图形
        console.log('准备绘制下一个图形');
    },

    //停止绘制
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        // 移除事件监听
        if (this.clickListener) {
            this.map.un('click', this.clickListener);
            this.map.un('dblclick', this.clickListener);
        }
        if (this.mouseMoveListener) {
            this.map.un('pointermove', this.mouseMoveListener);
        }

        // 恢复双击缩放
        this.enableDoubleClickZoom();

        // 清理临时要素
        if (this.tempFeature) {
            this.vectorSource.removeFeature(this.tempFeature);
            this.tempFeature = null;
        }

        this.currentPoints = [];
        this.mousePosition = null;
        console.log('绘制已停止');
    },

    //清除绘制的图形
    clearDrawing() {
        if (this.vectorSource) {
            const featuresCount = this.vectorSource.getFeatures().length;
            this.vectorSource.clear();
            this.features = []; // 清空保存的要素
            this.currentPoints = [];
            this.tempFeature = null;
            this.mousePosition = null;
            
            // 如果正在绘制，恢复双击缩放
            if (this.isDrawing) {
                this.enableDoubleClickZoom();
            }
            
            console.log(`已清除 ${featuresCount} 个绘制图形`);
        }
    },

    // 禁用双击缩放
    disableDoubleClickZoom() {
        const interactions = this.map.getInteractions();
        interactions.forEach((interaction) => {
            if (interaction instanceof ol.interaction.DoubleClickZoom) {
                this.savedDoubleClickZoom = interaction;
                this.map.removeInteraction(interaction);
            }
        });
    },

    // 恢复双击缩放
    enableDoubleClickZoom() {
        if (this.savedDoubleClickZoom) {
            this.map.addInteraction(this.savedDoubleClickZoom);
            this.savedDoubleClickZoom = null;
        }
    }
}