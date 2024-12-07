const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 获取数据库中bicycle表中数据
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        uuid,
        ST_AsGeoJSON(geometry)::json as geometry
      FROM public.bicycle
    `;
    
    const result = await pool.query(query);
    
    // 转换为GeoJSON格式
    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        properties: {
          id: row.id,
          uuid: row.uuid
        },
        geometry: row.geometry
      }))
    };

    res.json(geojson);
  } catch (error) {
    console.error('获取自行车数据错误:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

module.exports = router;

