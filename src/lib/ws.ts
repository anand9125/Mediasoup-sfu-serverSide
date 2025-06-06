// server.js
import ws from 'ws';
import { createWorker } from './worker';
import { createWebRtpTranport } from './createWebRtpTranport';

import { Producer, Router, Transport } from 'mediasoup/node/lib/types';

let mediasoupRouter: Router;
let producerTransport: Transport;
let producer: Producer;

export const WebSocketConnection = async (wss: ws.Server) => {
  try {
    mediasoupRouter = await createWorker();
  } catch (err) {
    console.error('Worker creation failed:', err);
  }

  wss.on('connection', (ws) => {
    ws.on('message', async (message: string) => {
      if (!isJsonString(message)) return console.log('Invalid JSON');
      const event = JSON.parse(message);

      switch (event.type) {
        case 'getRouterRtpCapabilities':
          return send(ws, 'routerCapablities', mediasoupRouter.rtpCapabilities);
        case 'getProducerRtpCapabilities':
          return await handleCreateProducerTransport(ws);
        case 'connectProducerTransport':
          return await handleConnectProducerTransport(ws, event.data);
        case 'produce':
          return await handleProduce(ws, wss, event.data);
        default:
          console.log('Unknown message type:', event.type);
      }
    });

    ws.send('Connected to Mediasoup Server');
  });
};

function isJsonString(str: string) {
  try {
    JSON.parse(str);
    return true;
  } catch (err) {
    return false;
  }
}

function send(ws: ws, type: string, data: any) {
  const message = JSON.stringify({ type, data });
  ws.send(message);
}

function broadcast(wss: ws.Server, type: string, data: any) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === ws.OPEN) {
      client.send(message);
    }
  });
}

async function handleCreateProducerTransport(ws: ws) {
  try {
    const { transport, params } = await createWebRtpTranport(mediasoupRouter);
    producerTransport = transport;
    send(ws, 'createProducerTransport', params);
  } catch (err: any) {
    console.error('Transport creation failed:', err);
    send(ws, 'error', err.message);
  }
}

async function handleConnectProducerTransport(ws: ws, data: any) {
  try {
    await producerTransport.connect({ dtlsParameters: data.dtlsParameters });
    send(ws, 'connectProducerTransport', 'connected');
  } catch (err:any) {
    console.error('Producer transport connect failed:', err);
    send(ws, 'error', err.message);
  }
}

async function handleProduce(ws: ws, wss: ws.Server, data: any) {
  try {
    const { kind, rtpParameters } = data;
    producer = await producerTransport.produce({ kind, rtpParameters });
    send(ws, 'produce', producer.id);
    broadcast(wss, 'newProducer', { id: producer.id });
  } catch (err: any) {
    console.error('Produce failed:', err);
    send(ws, 'error', err.message);
  }
}
