<template>
    <div class="ol-popup">
        <a href="#" class="ol-popup-closer" @click.prevent="closePopup"></a>
        <div class="popup-content">
            <div class="popup-display">
                <h3 class="area-name" v-if="areaName">{{ areaName }}</h3>
                <p class="area-description" v-if="areaDescription">{{ areaDescription }}</p>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'MapPopup',
    data() {
        return {
            areaName: '',
            areaDescription: '',
            feature: null
        }
    },
    methods: {
        closePopup() {
            this.$emit('close');
        },
        // 更新地图要素信息的方法
        updateFeature(newFeature) {
            // 如果传入了新的要素
            if (newFeature) {
                // 保存要素对象到组件实例中
                this.feature = newFeature;
                // 从要素中获取区域名称,如果不存在则设为空字符串
                this.areaName = newFeature.get('name') || '';
                // 从要素中获取区域描述,如果不存在则设为空字符串
                this.areaDescription = newFeature.get('describe') || '';
            }
        }
    }
}
</script>

<style scoped>
.ol-popup {
    position: absolute;
    background-color: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 10px;
    border: 1px solid #cccccc;
    bottom: 12px;
    left: -50px;
    min-width: 280px;
}

.ol-popup-closer {
    text-decoration: none;
    position: absolute;
    top: 2px;
    right: 8px;
}

.ol-popup-closer:after {
    content: "✖";
}

.area-name {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
    color: #333;
}

.area-description {
    font-size: 1em;
    color: #666;
    margin-bottom: 15px;
    line-height: 1.4;
}

.popup-display {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>