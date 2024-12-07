<template>
    <div class="area-query-dialog">
        <p>这里是关于投放区域的详细信息。您可以查看各个区域的单车分布情况、区域热度等。</p>    
        <div class="table-container">
            <table class="area-table">
                <thead>
                    <tr>
                        <th>编号</th>
                        <th>名称</th>
                        <th>容量</th>
                        <th>当前存量</th>
                        <th>警告等级</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="region in regions" :key="region.id">
                        <td>{{region.id}}</td>
                        <td>{{region.name}}</td>
                        <td>{{region.capacity}}</td>
                        <td>{{region.exist}}</td>
                        <td>{{region.level}}</td>
                        <td>
                            <button @click="viewRegionDetails(region)">查看详情</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AreaQueryDialog',
  data(){
    return{
      regions: []
    };
  },
  methods: {
    closeDialog() {
      this.$emit('close');
    },
    async fetchRegionData() {
      try {
        // 只获取区域基础数据
        const response = await axios.get('http://localhost:3000/regions');
        const geojson = response.data;

        // 解析GeoJSON数据
        this.regions = geojson.features.map(feature => ({
          id: feature.properties.id,
          name: feature.properties.name,
          capacity: feature.properties.capacity,
          exist: feature.properties.exist,
          level: this.calculateWarningLevel(feature.properties.capacity, feature.properties.exist)
        }));
      } catch (error) {
        console.error('获取区域数据失败:', error);
      }
    },
    calculateWarningLevel(capacity, exist) {
      const ratio = exist / capacity;
      if (ratio < 0.2) return '严重不足';
      if (ratio < 0.4) return '警告';
      if (ratio > 0.9) return '即将饱和';
      return '正常';
    },
    viewRegionDetails(region) {
      console.log('查看区域详情:', region);
    }
  },
  mounted(){
    this.fetchRegionData();
  },
};
</script>

<style scoped>
.area-query-dialog {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.table-container {
    flex: 1;
    overflow-y: auto;
    margin-top: 20px;
    /* 添加一个最大高度 */
    max-height: 250px;
    /* 美化滚动条 */
    scrollbar-width: thin;
    scrollbar-color: #888 #f1f1f1;
}

/* 自定义滚动条样式（Webkit浏览器） */
.table-container::-webkit-scrollbar {
    width: 8px;
}

.table-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.area-table {
    width: 100%;
    border-collapse: collapse;
}

.area-table th, .area-table td {
    border: 1px solid #ccc;
    padding: 10px;
    text-align: center;
}

.area-table th {
    background-color: #f1f1f1;
    position: sticky;
    top: 0;
    z-index: 1;
}

.area-details {
    margin-top: 10px;
}
</style>