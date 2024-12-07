<template>
    <div class="add-area-dialog">

        <!-- 添加区域信息显示部分 -->
        <div class="area-info">
            <h4>当前绘制区域信息</h4>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">面积：</span>
                    <span class="info-value">{{ areaSize.toFixed(2) }} 平方米</span>
                </div>
                <div class="info-item">
                    <span class="info-label">周长：</span>
                    <span class="info-value">{{ perimeter.toFixed(2) }} 米</span>
                </div>
                <div class="info-item">
                    <span class="info-label">质心坐标：</span>
                    <span class="info-value">{{ centroid }}</span>
                </div>
            </div>
        </div>

        <div class="form-container">
            <div class="form-item">
                <label>名称：</label>
                <input type="text" v-model="areaName" placeholder="请输入区域名称">
            </div>
            <div class="form-item">
                <label>容量：</label>
                <input type="number" v-model="capacity" placeholder="请输入容量">
            </div>
            <div class="form-item">
                <label>投放量：</label>
                <input type="number" v-model="initialAmount" placeholder="请输入初始投放量">
            </div>
            <div class="button-container">
                <button 
                    class="confirm-btn" 
                    :disabled="!hasDrawnArea || isSaving || !areaName || !capacity || !initialAmount"
                    @click="saveArea"
                >
                    {{ isSaving ? '保存中...' : '保存' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
/* global ol */
import geometryUtil from '@/utils/geometry'

export default {
    name: 'AddAreaDialog',
    data() {
        return {
            areaName: '',
            capacity: '',
            initialAmount: '',
            hasDrawnArea: false,
            areaSize: 0,
            perimeter: 0,
            centroid: '暂无',
            currentFeature: null,
            isSaving: false,
        }
    },
    mounted() {
        // 组件挂载时检查一次
        this.$nextTick(() => {
            this.checkNewFeature();
        });
    },
    methods: {
        checkNewFeature() {
            // 直接从 geometryUtil 获取 vectorSource
            const vectorSource = geometryUtil.vectorSource;
            if (!vectorSource) return;

            // 获取所有要素
            const features = vectorSource.getFeatures();
            
            // 找到最新绘制的要素（使用drawTime标识）
            const drawnFeature = features
                .filter(feature => feature.get('isDrawn'))
                .sort((a, b) => b.get('drawTime') - a.get('drawTime'))[0];
            
            if (drawnFeature && drawnFeature !== this.currentFeature) {
                this.currentFeature = drawnFeature;
                this.updateAreaInfo(drawnFeature);
            }
        },
        
        updateAreaInfo(feature) {
            const geometry = feature.getGeometry();
            
            this.hasDrawnArea = true;
            
            // 根据几何类型计算信息
            if (geometry.getType() === 'Polygon') {
                this.areaSize = ol.sphere.getArea(geometry);
                this.perimeter = ol.sphere.getLength(geometry);
                
                // 计算质心
                const centroidPoint = geometry.getInteriorPoint();
                // 获取质心坐标
                const [x, y] = centroidPoint.getCoordinates();
                // 转换为经纬度坐标 (EPSG:3857 -> EPSG:4326)
                const [lon, lat] = ol.proj.transform([x, y], 'EPSG:3857', 'EPSG:4326');
                // 格式化显示经纬度，保留6位小数
                this.centroid = `经度: ${lon.toFixed(6)}°, 纬度: ${lat.toFixed(6)}°`;
                
            } else if (geometry.getType() === 'LineString') {
                this.areaSize = 0;
                this.perimeter = ol.sphere.getLength(geometry);
                this.centroid = '不适用';
            }
            
            console.log('Geometry type:', geometry.getType());
            console.log('Centroid:', this.centroid);
        },

        async saveArea() {
            if (!this.currentFeature || !this.areaName || !this.capacity || !this.initialAmount) {
                alert('请填写完整信息');
                return;
            }

            try {
                this.isSaving = true;
                
                const geometry = this.currentFeature.getGeometry();
                const coordinates = geometry.getCoordinates();
                
                const geojson = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: coordinates
                    },
                    properties: {
                        name: this.areaName,
                        capacity: Number(this.capacity),
                        initialAmount: Number(this.initialAmount),
                        area: this.areaSize,
                        perimeter: this.perimeter,
                        centroid: this.centroid
                    }
                };

                // 使用 fetch 发送到后台
                const response = await fetch('http://localhost:3000/newarea', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'  // 明确指定接受 JSON 响应
                    },
                    body: JSON.stringify(geojson)
                });

                // 检查响应状态
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('服务器响应:', errorText);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 尝试解析 JSON
                const data = await response.json();
                
                if (data.success) {
                    alert('保存成功');
                    this.resetForm();
                    geometryUtil.clearDrawing();
                } else {
                    throw new Error(data.message || '保存失败');
                }
                
            } catch (error) {
                console.error('保存失败:', error);
                alert('保存失败，请检查服务器连接或重试');
            } finally {
                this.isSaving = false;
            }
        },

        resetForm() {
            this.areaName = '';
            this.capacity = '';
            this.initialAmount = '';
            this.hasDrawnArea = false;
            this.areaSize = 0;
            this.perimeter = 0;
            this.centroid = '暂无';
            this.currentFeature = null;
        }
    }
}
</script>

<style scoped>
.add-area-dialog {
    padding: 15px;
    background-color: white;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

/* 美化滚动条 */
.add-area-dialog::-webkit-scrollbar {
    width: 6px;
}

.add-area-dialog::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.add-area-dialog::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
}

.add-area-dialog::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.area-info {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 15px;
}

.area-info h4 {
    margin: 0 0 15px 0;
    color: #2c3e50;
    font-size: 16px;
    font-weight: 500;
    text-align: center;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
}

.info-item {
    display: flex;
    align-items: center;
    padding: 8px;
    background-color: white;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-label {
    color: #6c757d;
    font-size: 14px;
    margin-right: 8px;
}

.info-value {
    color: #2c3e50;
    font-weight: 500;
}

.form-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.form-item {
    display: flex;
    align-items: center;
}

.form-item label {
    width: 60px;
    color: #495057;
    font-size: 14px;
    text-align: right;
    margin-right: 10px;
    flex-shrink: 0;
}

.form-item input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
    min-width: 0;
    /* 防止输入框溢出 */
}

.form-item input:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-item input::placeholder {
    color: #adb5bd;
}

.button-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
}

.confirm-btn {
    padding: 8px 24px;
    font-size: 14px;
    color: white;
    background-color: #0d6efd;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.confirm-btn:hover:not(:disabled) {
    background-color: #0b5ed7;
    transform: translateY(-1px);
}

.confirm-btn:active:not(:disabled) {
    transform: translateY(0);
}

.confirm-btn:disabled {
    background-color: #e9ecef;
    color: #adb5bd;
    cursor: not-allowed;
    transform: none;
}
</style>
