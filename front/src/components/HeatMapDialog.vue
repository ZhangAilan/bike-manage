<template>
    <div class="heat-map-dialog">
        <div class="params-info">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">数据点数：</span>
                    <span class="info-value">{{ dataPoints }} 个</span>
                </div>
                <div class="info-item">
                    <span class="info-label">数据状态：</span>
                    <span class="info-value">{{ dataStatus }}</span>
                </div>
            </div>
        </div>

        <div class="form-container">
            <div class="form-item">
                <label>热点半径：</label>
                <input 
                    type="number" 
                    v-model="radius" 
                    placeholder="请输入热点半径（米）"
                >
            </div>
            <div class="form-item">
                <label>模糊尺寸：</label>
                <input 
                    type="number" 
                    v-model="blur" 
                    placeholder="请输入模糊尺寸"
                >
            </div>
            <div class="form-item">
                <label>最小透明度：</label>
                <input 
                    type="number" 
                    v-model="minOpacity" 
                    step="0.1" 
                    min="0" 
                    max="1" 
                    placeholder="请输入最小透明度（0-1）"
                >
            </div>
            <div class="form-item">
                <label>渐变色：</label>
                <select v-model="gradient">
                    <option value="default">默认配色</option>
                    <option value="rainbow">彩虹色</option>
                    <option value="thermal">热力色</option>
                </select>
            </div>
            <div class="button-container">
                <button 
                    class="confirm-btn" 
                    :disabled="!isValid || isLoading"
                    @click="generateHeatmap"
                >
                    {{ isLoading ? '加载中...' : '生成热力图' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
/* global ol */
export default {
    name: 'HeatMapDialog',
    inject: ['handleHeatmap'],
    data() {
        return {
            dataPoints: 0,
            dataStatus: '未加载',
            radius: 20,
            blur: 15,
            minOpacity: 0.3,
            gradient: 'default',
            isLoading: false,
            bikeFeatures: []
        }
    },
    computed: {
        isValid() {
            return this.radius > 0 && this.blur > 0 && 
                   this.minOpacity >= 0 && this.minOpacity <= 1;
        },
        gradientColors() {
            const gradients = {
                default: ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
                rainbow: ['#ffffff', '#ffebeb', '#ffd6d6', '#ffc2c2', '#ffadad', '#ff9999', '#ff8585'],
                thermal: ['#ffffff', '#cce6ff', '#99ccff', '#66b3ff', '#3399ff', '#0080ff', '#0066cc']
            };
            return gradients[this.gradient] || gradients.default;
        }
    },
    methods: {
        async fetchBikeData() {
            try {
                this.isLoading = true;
                this.dataStatus = '加载中...';
                
                const response = await fetch('http://localhost:3000/bikes');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const geojson = await response.json();
                this.bikeFeatures = geojson.features;
                
                // 计算 MultiPoint 中所有点的总数
                this.dataPoints = this.bikeFeatures.reduce((total, feature) => {
                    // MultiPoint 的坐标是二维数组，每个子数组是一个点的坐标
                    return total + feature.geometry.coordinates.length;
                }, 0);
                
                this.dataStatus = '已加载';
                
                return this.bikeFeatures;
            } catch (error) {
                console.error('获取自行车数据失败:', error);
                this.dataStatus = '加载失败';
                throw error;
            } finally {
                this.isLoading = false;
            }
        },
        
        async generateHeatmap() {
            try {
                this.isLoading = true;
                
                // 获取数据
                const features = await this.fetchBikeData();
                
                if (!features || features.length === 0) {
                    throw new Error('没有获取到自行车数据');
                }
                
                // 创建热力图数据源，处理 MultiPoint
                const heatmapData = features.flatMap(feature => {
                    // 将每个 MultiPoint 的所有坐标点展开成单独的点
                    return feature.geometry.coordinates.map(coords => {
                        return new ol.Feature({
                            geometry: new ol.geom.Point(
                                ol.proj.fromLonLat([coords[0], coords[1]])
                            )
                        });
                    });
                });

                // 创建热力图层
                const heatmapLayer = new ol.layer.Heatmap({
                    source: new ol.source.Vector({
                        features: heatmapData
                    }),
                    blur: parseInt(this.blur),
                    radius: parseInt(this.radius),
                    minOpacity: parseFloat(this.minOpacity),
                    gradient: this.gradientColors
                });

                // 使用注入的方法来处理热力图层
                this.handleHeatmap(heatmapLayer);
                
            } catch (error) {
                console.error('生成热力图失败:', error);
                alert('生成热力图失败：' + error.message);
            } finally {
                this.isLoading = false;
            }
        }
    }
}
</script>

<style scoped>
.heat-map-dialog {
    padding: 15px;
    background-color: white;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

/* 美化滚动条 */
.heat-map-dialog::-webkit-scrollbar {
    width: 6px;
}

.heat-map-dialog::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.heat-map-dialog::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
}

.heat-map-dialog::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.params-info {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 15px;
}

.params-info h4 {
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
    width: 80px;
    color: #495057;
    font-size: 14px;
    text-align: right;
    margin-right: 10px;
    flex-shrink: 0;
}

.form-item input,
.form-item select {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
    min-width: 0;
}

.form-item input:focus,
.form-item select:focus {
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

/* 添加关闭按钮样式 */
.dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #666;
    cursor: pointer;
    padding: 0 5px;
}

.close-btn:hover {
    color: #333;
}
</style>
