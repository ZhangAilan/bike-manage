const express = require('express');
const cors = require('cors'); // 引入 cors 模块
const app = express();
const pool = require('./config/db'); // 引入数据库连接
const geojsonRouter = require('./routes/geojson');  // 引入geojson路由
const regionsRouter = require('./routes/regions');
const bikeRouter = require('./routes/bike');
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
// 详细配置 CORS
app.use(cors({
    origin: '*',  // 允许所有来源
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

let markers = [];

// 路由
app.use('/regions', regionsRouter);
app.use('/geojson', geojsonRouter);  //先注册具体的路由
app.use('/bikes', bikeRouter);
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.get('/markers', (req, res) => {
    res.json(markers);
});

app.post('/markers', (req, res) => {
    try {
        const newMarkers = req.body;
        markers = newMarkers;
        console.log('标注点保存成功', markers);
        res.json({
            success: true,
            message: '标注点保存成功',
            count: markers.length
        });
    } catch (error) {
        console.error('保存标注点时出错:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
        });
    }
});

app.post('/newarea', async (req, res) => {
    try {
        const newArea = req.body;       
        // 准备插入数据
        const query = `
            INSERT INTO region (name, capacity, exist, geometry) 
            VALUES (
                $1, 
                $2, 
                $3, 
                ST_Transform(
                    ST_SetSRID(ST_GeomFromGeoJSON($4), 3857),  -- 输入坐标系为 3857
                    4326  -- 转换为 4326
                )
            )
            RETURNING id
        `;       
        const values = [
            newArea.properties.name,
            newArea.properties.capacity,
            newArea.properties.initialAmount,
            JSON.stringify(newArea.geometry)
        ];
        // 执行数据库插入
        const result = await pool.query(query, values);        
        console.log('新区域保存成功，ID:', result.rows[0].id);
        res.json({
            success: true,
            message: '新区域保存成功',
            id: result.rows[0].id
        });        
    } catch (error) {
        console.error('保存新区域时出错:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误: ' + error.message
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
