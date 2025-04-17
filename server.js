//importacion de modulos
const fetch = require('node-fetch'); // importar fetch para Node.js
const express = require('express'); //framework para crear aplicaciones web y APIs
const http = require('http'); //modulo http nativo de node para crear un servidor http
const socketIO = require('socket.io'); //biblioteca para manejar comunicacion en tiempo real mediante WebSockets

//configuracion del servidor
const app = express(); //instancia de express para manejar rutas y middleware
const server = http.createServer(app); //creacion del servidor http creado con el modulo http y vinculado con express
const io = socketIO(server); //instancia de socket.io que se conecta al servidor http para manejar web sockets

//configuracion de la ruta para el cliente
//configura express --> la ruta para servir archivos estaticos desde la carpeta public
app.use(express.static(__dirname + '/public'));

//manejo de conexiones web socket
io.on('connection', socket => { //detecta nueva conexion al servidor
    console.log('Usuario conectado:', socket.id);
    console.log('Nuevo usuario conectado');

    socket.on('offer', offer => { //escucha el evento 'offer' enviado por el cliente
        console.log('Oferta recibida:', offer);
        socket.broadcast.emit('offer', offer); //envia la oferta a todos los demas clientes conectados
    });

    socket.on('answer', answer => { //escucha el evento 'answer' enviado por el cliente
        console.log('Oferta recibida:', answer);
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', candidate => { //ice candidate: posible DIRECCION DE RED para conectar dos dispotivios 
        console.log('ICE Candidate recibido:', candidate);
        socket.broadcast.emit('ice-candidate', candidate); //envia el candidato a todos los demas clientes conectados
    });

    socket.on('mensaje', mensaje => { //escucha el evento 'mensaje' enviado por el cliente
        console.log('Mensaje recibido:', mensaje);
        socket.broadcast.emit('mensaje', mensaje); //reenvia el mensaje a todos los demas clientes conectados
    });
});

const PORT = process.env.PORT || 3000; //puerto en el que se ejecutara el servidor, si no se especifica, por defecto sera 3000
server.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`)); //inicia el servidor y muestra un mensaje en la consola indicando que el servidor esta corriendo
