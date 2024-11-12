const express = require('express');
const cors = require('cors'); // 引入 cors 模块
const app = express();
const pool = require('./config/db'); // 引入数据库连接
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(cors()); // 允许所有域名访问
// 或者设置特定的域名： app.use(cors({ origin: 'http://localhost:8080' }));

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

// 路由
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.get('/regions', (req, res) => {
    res.json(region);
});



// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
