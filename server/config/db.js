const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'bicycle',
    password: '123',
    port: 5432,
});

const createTables = async () => {
    const createRegionTable = `
        CREATE TABLE IF NOT EXISTS region (
            uuid UUID PRIMARY KEY,
            name VARCHAR(255),
            capacity INTEGER,
            exist INTEGER,
            geometry GEOMETRY
        );
    `;

    const createBicycleTable = `
        CREATE TABLE IF NOT EXISTS bicycle (
            uuid UUID,
            geometry GEOMETRY,
            FOREIGN KEY (uuid) REFERENCES region (uuid)
        );
    `;

    try {
        await pool.query(createRegionTable);
        console.log('Table "region" created or already exists.');

        await pool.query(createBicycleTable);
        console.log('Table "bicycle" created or already exists.');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
};

(async () => {
    await createTables();
})();

module.exports = pool;
