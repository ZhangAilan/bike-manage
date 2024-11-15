const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'webgis',
    password: '123',
    port: 5432,
});

// 添加连接测试
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('数据库连接成功');
    }
});

module.exports = pool;
