const fetch = require('node-fetch'); // importar fetch para Node.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname + '/public'));

io.on('connection', socket => {
    console.log('Nuevo usuario conectado');

    socket.on('offer', offer => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', answer => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', candidate => {
        socket.broadcast.emit('ice-candidate', candidate);
    });

    socket.on('mensaje', mensaje => {
        console.log('Mensaje recibido:', mensaje);
        socket.broadcast.emit('mensaje', mensaje);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
