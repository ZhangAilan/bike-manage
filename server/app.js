const express = require('express');
const cors = require('cors'); // 引入 cors 模块
const app = express();
const pool = require('./config/db'); // 引入数据库连接
const geojsonRouter = require('./routes/geojson');  // 引入geojson路由
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
// 详细配置 CORS
app.use(cors({
    origin: '*',  // 允许所有来源
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

let region = [
    {
        id: "1",
        name: "南京-1",
        capacity: 1000,
        exist: 900,
        level: 5
    },
    {
        id: "2",
        name: "南京-3",
        capacity: 1000,
        exist: 500,
        level: 3
    },
    {
        id: "3",
        name: "南京-3",
        capacity: 1000,
        exist: 100,
        level: 1
    }
]

let markers = [];

// 路由
app.use('/geojson', geojsonRouter);  //先注册具体的路由
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.get('/regions', (req, res) => {
    res.json(region);
});
app.get('/markers', (req, res) => {
    res.json(markers);
});

//添加保存标注点
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



// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
