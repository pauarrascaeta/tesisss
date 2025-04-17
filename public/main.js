//contiene la logica principal del cliente para la app
//utilizar web RTC para la comunicacion P2P y Socket.IO para la señalizacion y el chat en tiempo real. 


const socket = io();

//se obtienen los elementos de la interfaz
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const mensajeInput = document.getElementById('mensajeInput');
const enviarBtn = document.getElementById('enviarBtn');
const mensajesDiv = document.getElementById('mensajes');
const hablarBtn = document.getElementById('hablarBtn');
const toggleCameraBtn = document.getElementById('toggleCamera');
const toggleMicBtn = document.getElementById('toggleMic');

//se declaran las variables globales para el flujo de video y audio
let localStream;
let peerConnection;

//configuracion de los servidores ICE
//se utilizan servidores STUN y TURN para la conectividad NAT
//STUN: ayuda a los navegadores a descubrir su dirección IP pública del cliente
//TURN: permite la retransmisión de medios a través de un servidor intermedio si la conexion falla
//esto es útil cuando los navegadores están detrás de NATs restrictivos
//en este caso se utilizan servidores públicos de Google y OpenRelay
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// Capturar video y audio local
navigator.mediaDevices.getUserMedia({ video: true, audio: true }) //getUserMedia: solicita acceso a la camara y el microfono del usuario
    .then(stream => {
        localVideo.srcObject = stream; //muestra el video local en la interfaz
        localStream = stream; //almacena el flujo local para usarlo en la llamada

        iniciarLlamada();
    });

// Iniciar llamada
function iniciarLlamada() {
    peerConnection = new RTCPeerConnection(config); //crea la conexion P2P
    // Agregar tracks locales
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream); //addTrack agrega los tracks (pistas) de audio y video al peerConnection
    });

    // Manejar llegada de stream remoto
    peerConnection.ontrack = event => { //onTrack recibe y muestra el flujo remoto en el video remoto
        remoteVideo.srcObject = event.streams[0];
    };

    // ICE Candidates
    peerConnection.onicecandidate = event => { //onicecandidate se encarga de enviar los candidatos ICE al servidor para la señalizacion
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };
}

// Recibir offer → responder --recibe una oferta de conexion de otro cliente, y configura la descripcion remota y envia una respuesta 
socket.on('offer', async offer => {
    if (!peerConnection) iniciarLlamada();

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

// Recibir answer → conectar --configura la descripcion remota con la respuesta del otro cliente    
socket.on('answer', async answer => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Recibir candidato ICE → agregar --recibe un candidato ICE de otro cliente y lo agrega a la conexion P2P
socket.on('ice-candidate', async candidate => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.error('Error al agregar ICE candidate', err);
    }
});

// Iniciar la conexión (ofrecer) --crea y envia una oferta inicial despues de un segundo
setTimeout(async () => {
    if (!peerConnection) return;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
}, 1000);

//----------------------------------
// CHAT

//envia mensaje al servidor y lo muestra en la interfaz
enviarBtn.addEventListener('click', () => {
    const mensaje = mensajeInput.value;
    if (mensaje.trim() !== '') {
        socket.emit('mensaje', mensaje);
        agregarMensaje(`Yo: ${mensaje}`);
        mensajeInput.value = '';
    }
});

function agregarMensaje(texto) {
    const p = document.createElement('p');
    p.textContent = texto;
    mensajesDiv.appendChild(p);
}

//TTS
socket.on('mensaje', mensaje => { //recibe el mensaje del servidor y lo muestra en la interfaz y lo reproduce con texto a voz (TTS)
    agregarMensaje(`Otro: ${mensaje}`);
    reproducirMensaje(mensaje);
});

function reproducirMensaje(texto) { //reproduce el mensaje recibido con TTS --convierte el texto recibido en audio utilizando la API de sintesis de voz del navegador
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    synth.speak(utterance);
}

//STT --reconocimiento de voz
//usa la API de reconocimiento de voz del navegador para convertir el habla en texto y enviarlo como mensaje
hablarBtn.addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Tu navegador no soporta reconocimiento de voz');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onstart = () => {
        console.log("🎤 Escuchando...");
        hablarBtn.disabled = true;
        hablarBtn.textContent = "Escuchando...";
    };

    recognition.onresult = (event) => {
        const textoReconocido = event.results[0][0].transcript;
        console.log("✅ Texto reconocido:", textoReconocido);
        socket.emit('mensaje', textoReconocido);
        agregarMensaje(`Yo (voz): ${textoReconocido}`);
    };

    recognition.onerror = (event) => {
        console.error("❌ Error en reconocimiento:", event.error);
    };

    recognition.onend = () => {
        hablarBtn.disabled = false;
        hablarBtn.textContent = "🎙️ Hablar";
    };
});

// 🎥 Activar/desactivar cámara local
let cameraOn = true;
toggleCameraBtn.addEventListener('click', () => {
    if (!localStream) return;
    cameraOn = !cameraOn;
    localStream.getVideoTracks().forEach(track => track.enabled = cameraOn);
    toggleCameraBtn.textContent = cameraOn ? '🎥 Cámara' : '🚫 Cámara';
});

// 🎙️ Activar/desactivar micrófono local
let micOn = true;
toggleMicBtn.addEventListener('click', () => {
    if (!localStream) return;
    micOn = !micOn;
    localStream.getAudioTracks().forEach(track => track.enabled = micOn);
    toggleMicBtn.textContent = micOn ? '🎙️ Micrófono' : '🔇 Micrófono';
});
