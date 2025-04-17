const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const mensajeInput = document.getElementById('mensajeInput');
const enviarBtn = document.getElementById('enviarBtn');
const mensajesDiv = document.getElementById('mensajes');
const hablarBtn = document.getElementById('hablarBtn');
const toggleCameraBtn = document.getElementById('toggleCamera');
const toggleMicBtn = document.getElementById('toggleMic');

let localStream;
let peerConnection;

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

// Capturar video local
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;

        iniciarLlamada();
    });

function iniciarLlamada() {
    peerConnection = new RTCPeerConnection(config);

    // Agregar tracks locales
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Manejar llegada de stream remoto
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    // ICE Candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };
}

// Recibir offer → responder
socket.on('offer', async offer => {
    if (!peerConnection) iniciarLlamada();

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

// Recibir answer → conectar
socket.on('answer', async answer => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Recibir ICE
socket.on('ice-candidate', async candidate => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.error('Error al agregar ICE candidate', err);
    }
});

// Iniciar la conexión (ofrecer)
setTimeout(async () => {
    if (!peerConnection) return;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
}, 1000);

// CHAT
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
socket.on('mensaje', mensaje => {
    agregarMensaje(`Otro: ${mensaje}`);
    reproducirMensaje(mensaje);
});

function reproducirMensaje(texto) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    synth.speak(utterance);
}

//STT
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

// 🎥 Activar/desactivar cámara
let cameraOn = true;
toggleCameraBtn.addEventListener('click', () => {
    if (!localStream) return;
    cameraOn = !cameraOn;
    localStream.getVideoTracks().forEach(track => track.enabled = cameraOn);
    toggleCameraBtn.textContent = cameraOn ? '🎥 Cámara' : '🚫 Cámara';
});

// 🎙️ Activar/desactivar micrófono
let micOn = true;
toggleMicBtn.addEventListener('click', () => {
    if (!localStream) return;
    micOn = !micOn;
    localStream.getAudioTracks().forEach(track => track.enabled = micOn);
    toggleMicBtn.textContent = micOn ? '🎙️ Micrófono' : '🔇 Micrófono';
});
