'''
@zyh 2024-11-14
将GeoJSON文件导入到PostgreSQL数据库中
'''
import psycopg2
import json
import os

def connect_to_db():
    """连接到PostgreSQL数据库"""
    try:
        conn = psycopg2.connect(
            dbname="webgis",
            user="postgres",
            password="123",
            host="localhost",
            port="5432"
        )
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None

def import_geojson(file_path, name):
    """导入单个GeoJSON文件到数据库"""
    conn = connect_to_db()
    if not conn:
        return False

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        cur = conn.cursor()
        
        # 检查是否已存在相同名称的数据
        cur.execute("SELECT COUNT(*) FROM public.geojson_data WHERE name = %s", (name,))
        if cur.fetchone()[0] > 0:
            print(f"数据库中已存在名称为 {name} 的数据，跳过导入")
            return False

        # 处理FeatureCollection
        if geojson_data['type'] == 'FeatureCollection':
            for feature in geojson_data['features']:
                # 获取每个区域的属性
                properties = feature.get('properties', {})
                district_name = properties.get('name', '')  # 获取区名
                description = properties.get('describe', '')  # 获取描述
                
                sql = """
                INSERT INTO public.geojson_data (name, description, geom, properties)
                VALUES (%s, %s, ST_GeomFromGeoJSON(%s), %s::jsonb)
                """
                
                cur.execute(sql, (
                    district_name,
                    description,
                    json.dumps(feature['geometry']),
                    json.dumps(properties)
                ))
        
        conn.commit()
        print(f"成功导入 {name} 的GeoJSON数据")
        return True
    
    except Exception as e:
        print(f"导入失败: {e}")
        conn.rollback()
        return False
    
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def main():
    """主函数：导入多个GeoJSON文件"""
    # GeoJSON文件信息：(文件路径, 名称)
    geojson_files = [
        ("data/nanjing.geojson", "南京市"),
        ("data/suzhou.geojson", "苏州市"),
    ]
    
    # 确保数据表存在
    conn = connect_to_db()
    if conn:
        try:
            cur = conn.cursor()
            # 创建扩展和数据表（如果不存在）
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.geojson_data (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255),
                    description TEXT,
                    geom geometry(Geometry,4326),
                    properties JSONB
                );
            """)
            conn.commit()
            print("数据表检查/创建成功")
        except Exception as e:
            print(f"创建表失败: {e}")
            return
        finally:
            cur.close()
            conn.close()
    
    # 导入所有GeoJSON文件
    for file_path, name in geojson_files:
        if os.path.exists(file_path):
            success = import_geojson(file_path, name)  # 移除description参数
            if success:
                print(f"成功导入 {name}")
            else:
                print(f"导入 {name} 失败")
        else:
            print(f"文件不存在: {file_path}")

if __name__ == "__main__":
    main()
