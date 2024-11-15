const express = require('express');
const router = express.Router();
const pool = require('../config/db');


router.get('/', async (req, res) => {
  try {
    // 添加错误日志来帮助调试
    console.log('开始查询数据库...');
    
    const query = `
      SELECT 
        id,
        name,
        description,
        properties,
        ST_AsGeoJSON(geom)::json as geometry
      FROM geojson_data
    `;
    
    const result = await pool.query(query);
    console.log('查询结果:', result.rows);  // 添加日志
    
    if (result.rows.length === 0) {
      console.log('没有找到数据');
      return res.json({
        type: 'FeatureCollection',
        features: []
      });
    }
    
    const features = result.rows.map(row => ({
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        name: row.name,
        description: row.description,
        ...row.properties
      }
    }));

    const geoJson = {
      type: 'FeatureCollection',
      features: features
    };

    console.log('返回的 GeoJSON:', geoJson);  // 添加日志
    res.json(geoJson);
  } catch (error) {
    console.error('获取 GeoJSON 数据失败:', error);
    res.status(500).json({ 
      error: '获取数据失败',
      details: error.message  // 添加详细错误信息
    });
  }
});

module.exports = router;