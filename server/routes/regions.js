const express = require('express');
const router = express.Router();
const pool = require('../config/db');

//获取数据库中region表中数据
router.get('/', async (req, res) => {
    try {
        console.log('开始查询数据库...');
        
        // 查询数据库并转换为GeoJSON格式
        const result = await pool.query(`
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(geometry)::json,
                        'properties', json_build_object(
                            'id', id,
                            'name', name,
                            'capacity', capacity,
                            'exist', exist
                        )
                    )
                )
            ) as geojson
            FROM region;
        `);

        // 检查是否有数据
        if (result.rows.length === 0 || !result.rows[0].geojson) {
            return res.status(404).json({
                success: false,
                message: '没有找到数据'
            });
        }

        console.log('数据查询成功');
        res.json(result.rows[0].geojson);

    } catch (error) {
        console.error('查询数据库出错:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: error.message
        });
    }
});

module.exports = router;
