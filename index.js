const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');

const index = express();
index.use(cors());
index.use(bodyParser.json());

// Configuración de la conexión a SQL Server
const dbConfig = {
    user: 'usr_DesaWeb',
    password: 'GuasTa360#',
    server: 'svr-sql-ctezo.southcentralus.cloudapp.azure.com',
    database: 'db_banco',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Conecta a SQL Server y reutiliza la conexión
sql.connect(dbConfig).then((pool) => {
    console.log('Conectado a SQL Server');

    // Ruta de prueba
    index.get('/', (req, res) => {
        res.send('¡Servidor funcionando correctamente con SQL Server!');
    });

    // Crear una nueva factura
    index.post('/facturas', async (req, res) => {
        const { Fecha, Total, Cliente } = req.body; // Incluye Cliente en los datos del cuerpo de la solicitud
        try {
            const result = await pool.request()
                .input('Fecha', sql.Date, Fecha)
                .input('Total', sql.Decimal(18, 2), Total)
                .input('Cliente', sql.VarChar(100), Cliente) // Agrega el parámetro Cliente con un tipo de dato adecuado
                .query('INSERT INTO Facturas_Kv (Fecha, Total, Cliente) OUTPUT INSERTED.IdFactura VALUES (@Fecha, @Total, @Cliente)');
            
            res.status(201).json({ id: result.recordset[0].IdFactura, Fecha, Total, Cliente });
        } catch (err) {
            console.error('Error al crear la factura:', err);
            res.status(500).json({ message: 'Error al crear la factura', error: err.message });
        }
    });


    // Obtener todas las facturas
    index.get('/facturas', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT * FROM Facturas_Kv');
            res.json(result.recordset);
        } catch (err) {
            console.error('Error al obtener las facturas:', err);
            res.status(500).send('Error al obtener las facturas');
        }
    });

    // Actualizar una factura
    index.put('/facturas/:id', async (req, res) => {
        const { id } = req.params;
        const { Fecha, Total, Cliente } = req.body;  // Añadir el campo Cliente

        try {
            const result = await pool.request()
                .input('IdFactura', sql.Int, id)
                .input('Fecha', sql.Date, Fecha)
                .input('Total', sql.Decimal(18, 2), Total)
                .input('Cliente', sql.VarChar(100), Cliente)  // Añadir Cliente al request
                .query('UPDATE Facturas_Kv SET Fecha = @Fecha, Total = @Total, Cliente = @Cliente WHERE IdFactura = @IdFactura');
            res.sendStatus(204);
        } catch (err) {
            console.error('Error al actualizar la factura:', err);
            res.status(500).send('Error al actualizar la factura');
        }
    });
    
    // Eliminar una factura
    index.delete('/facturas/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.request()
                .input('IdFactura', sql.Int, id)
                .query('DELETE FROM Facturas_Kv WHERE IdFactura = @IdFactura');

            // Verificar si se eliminó alguna fila
            if (result.rowsAffected[0] > 0) {
                res.status(200).json({ message: 'Factura eliminada correctamente' });
            } else {
                res.status(404).json({ message: 'Factura no encontrada o ya eliminada' });
            }
        } catch (err) {
            console.error('Error al eliminar la factura:', err);
            res.status(500).json({ message: 'Error al eliminar la factura' });
        }
    });


    // Crear un nuevo servicio facturado
    index.post('/servicios', async (req, res) => {
        const { idFactura, descripcion, cantidad, PrecioUnitario, idTipoServicio } = req.body;
        try {
            const result = await pool.request()
                .input('idFactura', sql.Int, idFactura)
                .input('descripcion', sql.VarChar, descripcion)
                .input('cantidad', sql.Int, cantidad)
                .input('PrecioUnitario', sql.Decimal(18, 2), PrecioUnitario)
                .input('idTipoServicio', sql.Int, idTipoServicio)
                .query(`INSERT INTO ServiciosFacturados_Kv (idFactura, descripcion, cantidad, PrecioUnitario, idTipoServicio) 
                        OUTPUT INSERTED.idServicioFacturado 
                        VALUES (@idFactura, @descripcion, @cantidad, @PrecioUnitario, @idTipoServicio)`);
            res.status(201).json({ 
                idServicioFacturado: result.recordset[0].idServicioFacturado,
                idFactura, 
                descripcion, 
                cantidad, 
                PrecioUnitario, 
                idTipoServicio 
            });
        } catch (err) {
            console.error('Error al crear el servicio facturado:', err);
            res.status(500).json({ message: 'Error al crear el servicio facturado', error: err.message });
        }
    });

    // Obtener todos los servicios facturados
    index.get('/servicios', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT * FROM ServiciosFacturados_Kv');
            res.json(result.recordset);
        } catch (err) {
            console.error('Error al obtener los servicios facturados:', err);
            res.status(500).send('Error al obtener los servicios facturados');
        }
    });

    // Actualizar un servicio facturado
    index.put('/servicios/:id', async (req, res) => {
        const { id } = req.params;
        const { idFactura, descripcion, cantidad, PrecioUnitario, idTipoServicio } = req.body;
        try {
            const result = await pool.request()
                .input('idServicioFacturado', sql.Int, id)
                .input('idFactura', sql.Int, idFactura)
                .input('descripcion', sql.VarChar, descripcion)
                .input('cantidad', sql.Int, cantidad)
                .input('PrecioUnitario', sql.Decimal(18, 2), PrecioUnitario)
                .input('idTipoServicio', sql.Int, idTipoServicio)
                .query(`UPDATE ServiciosFacturados_Kv 
                        SET idFactura = @idFactura, descripcion = @descripcion, cantidad = @cantidad, PrecioUnitario = @PrecioUnitario, idTipoServicio = @idTipoServicio 
                        WHERE idServicioFacturado = @idServicioFacturado`);
            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ message: 'Servicio facturado no encontrado' });
            }
            res.status(200).json({ message: 'Servicio facturado actualizado correctamente' });
        } catch (err) {
            console.error('Error al actualizar el servicio facturado:', err);
            res.status(500).json({ message: 'Error al actualizar el servicio facturado', error: err.message });
        }
    });

    // Eliminar un servicio facturado
    index.delete('/servicios/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await pool.request()
                .input('idServicioFacturado', sql.Int, id)
                .query('DELETE FROM ServiciosFacturados_Kv WHERE idServicioFacturado = @idServicioFacturado');
            res.sendStatus(204);
        } catch (err) {
            console.error('Error al eliminar el servicio facturado:', err);
            res.status(500).send('Error al eliminar el servicio facturado');
        }
    });


    // Crear un nuevo tipo de servicio
    index.post('/tipos-servicios', async (req, res) => {
        const { Nombre } = req.body;

        console.log('Nombre:', Nombre);
        try {
            const result = await pool.request()
                .input('Nombre', sql.VarChar, Nombre)
                .query('INSERT INTO TiposServicios_Kv (nombreTipoServicio) OUTPUT INSERTED.idTipoServicio VALUES (@Nombre)');
            res.status(201).json({ id: result.recordset[0].Id, Nombre });
        } catch (err) {
            console.error('Error al crear el tipo de servicio:', err);
            res.status(500).send('Error al crear el tipo de servicio');
        }
    });

    // Obtener todos los tipos de servicios
    index.get('/tipos-servicios', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT * FROM TiposServicios_Kv');
            res.json(result.recordset);
        } catch (err) {
            console.error('Error al obtener los tipos de servicios:', err);
            res.status(500).send('Error al obtener los tipos de servicios');
        }
    });

    // Actualizar un tipo de servicio
    index.put('/tipos-servicios/:id', async (req, res) => {
        const { id } = req.params;
        const { Nombre } = req.body;

        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('Nombre', sql.VarChar, Nombre)
                .query('UPDATE TiposServicios_Kv SET nombreTipoServicio = @Nombre WHERE idTipoServicio = @id');

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
            }

            res.json({ message: 'Tipo de servicio actualizado exitosamente', id, Nombre });
        } catch (err) {
            console.error('Error al actualizar el tipo de servicio:', err);
            res.status(500).send('Error al actualizar el tipo de servicio');
        }
    });

    // Eliminar un tipo de servicio
    index.delete('/tipos-servicios/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM TiposServicios_Kv WHERE idTipoServicio = @id');
            res.sendStatus(204);
        } catch (err) {
            console.error('Error al eliminar el tipo de servicio:', err);
            res.status(500).send('Error al eliminar el tipo de servicio');
        }
    });


    // Configura el servidor para escuchar en un puerto específico
    const PORT = process.env.PORT || 3001;
    index.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Error al conectar a SQL Server:', err);
});