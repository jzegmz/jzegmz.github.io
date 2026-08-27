"use strict";

// Chat P2P cifrado de extremo a extremo mediante WebRTC (DataChannel sobre DTLS).
// No hay servidor: la señalización se intercambia manualmente copiando/pegando códigos.

const ICE_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

let pc = null;
let channel = null;

// --- Referencias DOM ---
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const setup = $("setup");
const chat = $("chat");
const flowA = $("flowA");
const flowB = $("flowB");
const messagesEl = $("messages");

// --- Utilidades ---
function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.className = "status status--" + state;
}

function encode(obj) {
    return btoa(JSON.stringify(obj));
}

function decode(str) {
    return JSON.parse(atob(str.trim()));
}

// Espera a que termine la recolección de candidatos ICE para incluirlos en el SDP.
function waitForIceGathering(peer) {
    return new Promise((resolve) => {
        if (peer.iceGatheringState === "complete") {
            resolve();
            return;
        }
        const check = () => {
            if (peer.iceGatheringState === "complete") {
                peer.removeEventListener("icegatheringstatechange", check);
                resolve();
            }
        };
        peer.addEventListener("icegatheringstatechange", check);
        // Salvaguarda por si algún candidato tarda demasiado.
        setTimeout(resolve, 4000);
    });
}

function createPeer() {
    pc = new RTCPeerConnection(ICE_CONFIG);
    pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === "connected" || s === "completed") {
            setStatus("Conectado", "on");
        } else if (s === "disconnected" || s === "failed" || s === "closed") {
            setStatus("Desconectado", "off");
            addSystemMessage("La conexión se ha cerrado.");
        }
    };
}

function setupChannel(dc) {
    channel = dc;
    channel.onopen = () => {
        setStatus("Conectado", "on");
        showChat();
        addSystemMessage("Conexión establecida. La conversación está cifrada.");
    };
    channel.onclose = () => {
        setStatus("Desconectado", "off");
        addSystemMessage("La otra persona se ha desconectado.");
    };
    channel.onmessage = (e) => {
        addMessage(e.data, "you");
    };
}

// --- Mensajes UI ---
function addMessage(text, who) {
    const bubble = document.createElement("div");
    bubble.className = "bubble bubble--" + who;
    bubble.textContent = text; // textContent evita inyección de HTML.
    const time = document.createElement("span");
    time.className = "bubble__time";
    time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    bubble.appendChild(time);
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMessage(text) {
    const el = document.createElement("div");
    el.className = "bubble bubble--sys";
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showChat() {
    setup.classList.add("hidden");
    chat.classList.remove("hidden");
}

// --- Flujo Persona A (crea la invitación) ---
$("btnCreate").addEventListener("click", async () => {
    flowA.classList.remove("hidden");
    flowB.classList.add("hidden");
    setStatus("Generando invitación...", "wait");

    createPeer();
    const dc = pc.createDataChannel("chat");
    setupChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    $("offerOut").value = encode(pc.localDescription);
    setStatus("Esperando respuesta...", "wait");
});

$("btnAcceptAnswer").addEventListener("click", async () => {
    try {
        const answer = decode($("answerIn").value);
        await pc.setRemoteDescription(answer);
        setStatus("Conectando...", "wait");
    } catch (err) {
        alert("El código de respuesta no es válido. Revísalo e inténtalo de nuevo.");
    }
});

// --- Flujo Persona B (se une a la invitación) ---
$("btnJoin").addEventListener("click", () => {
    flowB.classList.remove("hidden");
    flowA.classList.add("hidden");
});

$("btnGenAnswer").addEventListener("click", async () => {
    try {
        setStatus("Generando respuesta...", "wait");
        createPeer();
        pc.ondatachannel = (e) => setupChannel(e.channel);

        const offer = decode($("offerIn").value);
        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGathering(pc);

        $("answerOut").value = encode(pc.localDescription);
        setStatus("Respuesta lista", "wait");
    } catch (err) {
        setStatus("Desconectado", "off");
        alert("El código de invitación no es válido. Revísalo e inténtalo de nuevo.");
    }
});

// --- Copiar códigos ---
async function copyFrom(id, btn) {
    const value = $(id).value;
    if (!value) return;
    try {
        await navigator.clipboard.writeText(value);
        const original = btn.textContent;
        btn.textContent = "¡Copiado!";
        setTimeout(() => (btn.textContent = original), 1500);
    } catch {
        $(id).select();
        document.execCommand("copy");
    }
}

$("btnCopyOffer").addEventListener("click", (e) => copyFrom("offerOut", e.target));
$("btnCopyAnswer").addEventListener("click", (e) => copyFrom("answerOut", e.target));

// --- Envío de mensajes ---
$("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("msgInput");
    const text = input.value.trim();
    if (!text || !channel || channel.readyState !== "open") return;
    channel.send(text);
    addMessage(text, "me");
    input.value = "";
    input.focus();
});

// --- Borrar conversación ---
$("btnClear").addEventListener("click", () => {
    if (messagesEl.children.length === 0) return;
    if (confirm("¿Seguro que quieres borrar toda la conversación?")) {
        messagesEl.innerHTML = "";
        addSystemMessage("Conversación borrada.");
    }
});
