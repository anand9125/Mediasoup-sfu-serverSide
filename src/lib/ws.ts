// server.js
import ws from 'ws';
import { createWorker } from './worker';
import { createWebRtpTranport } from './createWebRtpTranport';

import {  Consumer, Producer, Router, RtpCapabilities, Transport } from 'mediasoup/node/lib/types';
import { assert } from 'console';
type AppData = Record<string, any>;

let mediasoupRouter: Router;
let producerTransport: Transport;
let producer: Producer;
let consumerTransport: Transport;
let consumer: Consumer<AppData> | undefined;

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
          return await handleCreateProducerTransport(ws);  //function creates a WebRTC send transport (for a producer) and sends the necessary parameters back to the client over WebSocket.
          //concept :In Mediasoup, to send media (camera, screen, etc.), the client must have a WebRTC transport.
          //This transport is created on the server, and then parameters are sent to the client, which uses them to connect (via ICE/DTLS).
        case 'connectProducerTransport':
          return await handleConnectProducerTransport(ws, event.data);
        case 'produce':
          return await handleProduce(ws, wss, event.data);
        case "createConsumerTransport":
          return await handleCreateConsumerTransport(ws, event.data);
        case "connectConsumerTransport":
          return await handleConnectConsumerTransport(ws, event.data);
        case "resume":
          if(consumer){
            return await handleResume(ws, event.data, consumer);
          }
        case "consume":
          return await handleConsume(ws, event);
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

async function handleCreateProducerTransport(ws: ws) {  //This function is triggered when the client requests to create a producer transport.
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
    send(ws, 'producerConnected', 'producer transport connected');
  } catch (err:any) {
    console.error('Producer transport connect failed:', err);
    send(ws, 'error', err.message);
  }
}

async function handleProduce(ws: ws, wss: ws.Server, data: any) {
  try {
    const { kind, rtpParameters } = data;
    producer = await producerTransport.produce({ kind, rtpParameters });  //Create a producer using the given rtpParameters and media type.
    //after this line Media starts flowing from the client to the server through this producer
    send(ws, 'produced', producer.id);  //Return the new producer ID to the client.
    broadcast(wss, 'newProducer', { id: producer.id });  //Sends a message to all other connected clients to notify that a new producer is available.
  } catch (err: any) {
    console.error('Produce failed:', err);
    send(ws, 'error', err.message);
  }
}

async function handleCreateConsumerTransport(ws: ws, data: any) {
  try {
    const { transport, params } = await createWebRtpTranport(mediasoupRouter);
    consumerTransport = transport;
    send(ws, 'createConsumerTransport', params);
  } catch (err: any) {
    console.error('Consumer transport creation failed:', err);
    send(ws, 'error', err.message);
  }
}
async function handleConnectConsumerTransport(ws: ws, data: any) {
  try {
    await consumerTransport.connect({ dtlsParameters: data.dtlsParameters });
    send(ws, 'consumerConnected', 'consumer transport connected');
  } catch (err: any) {
    console.error('Consumer transport connect failed:', err);
    send(ws, 'error', err.message);
  }
}
async function handleResume(ws: ws, data: any, consumer: Consumer) {
  try {
    await consumer.resume();
    send(ws, 'resumed', 'consumer transport resumed');
  } catch (err: any) {
    console.error('Consumer transport resume failed:', err);
    send(ws, 'error', err.message);
  }
}

async function handleConsume(ws: ws, data: any) {
  const { rtpCapabilities } = data;
     if (!producer) {
    send(ws, 'error', 'Producer not available');
    return;
  }
  if (!rtpCapabilities) {
    send(ws, 'error', 'Missing rtpCapabilities');
    return;
  }

  const res = await createConsumer(producer, rtpCapabilities);

  if (res) {
    send(ws, 'subscribed', res);
  }
}

const createConsumer = async (producer:Producer,rtpCapabilities:RtpCapabilities) => {
     if(!mediasoupRouter.canConsume(
        {
          producerId: producer.id,
          rtpCapabilities,
        })
     ){
      console.log('cant consume')
      return
     }
     try{
      consumer = await consumerTransport.consume({
         producerId: producer.id,
          rtpCapabilities ,
          paused:producer.kind === 'video'
      });
     }catch(err){
      console.log("consumer failed",err)
      return;
     }
       return {
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
       }
     }
  
 

//ws: the specific WebSocket connection of the client who sent the produce message.
//wss: the WebSocket server — allows broadcasting to all clients.