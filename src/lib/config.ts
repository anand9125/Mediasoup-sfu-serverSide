import { RtpCapabilities, RtpCodecCapability, TransportListenInfo,  TransportListenIp,  WorkerLogTag } from 'mediasoup/node/lib/types';
import os from 'os';

export const config = {
    listenIp:"0.0.0.0",
    listenPort: 3016,

    mediasoup:{
        newWorker: Object.keys(os.cpus()).length,  //You are creating one Mediasoup Worker for each CPU core on your machine.
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            //The range of UDP ports Mediasoup will use for media
            logLevel: 'warn',  //Log only warnings and errors.
            logTags: [   //Extra categories of logs to include (for debugging ICE, DTLS, etc.)
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp'
            ] as WorkerLogTag[],
        },
        router:{
            mediaCodes:[   //This defines the media formats your server supports:
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',  //Most common audio format in WebRTC.
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',  //Common and widely supported WebRTC video codec.
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000   //Helps browsers start sending at 1000 kbps.
                    }
                }
            ]as RtpCodecCapability[]
         },
         // WebRtcTransport settings
            webRtcTransport: {
            listenIps: [
                {
                ip: "0.0.0.0",  //The internal IP Mediasoup will bind to.
                announcedIp: "127.0.0.1", // The public IP clients will see (used in ICE candidates).
                // Replace with your public IP address
                },
            ] as TransportListenInfo[],
            maxIncomingBitrate: 1500000, //Max bitrate for incoming media.
            initialAvailableOutgoingBitrate: 1000000, //Initial available bitrate for outgoing media.
        }

    }
    
}as const;


//about router
//The Router handles the logic of what media codecs are used and how media flows between Producers and Consumers.
//Use:
// Acts like a “room”. Each router is used per room/session.

// Has to know the supported codecs (mediaCodecs) of all clients in the room.

//  Constraints/Assumptions:
// All participants in a room must support at least one common codec (like VP8 or Opus).

// You cannot change codecs once a router is created.

//about WebRTC Transport
//A Transport is the connection (DTLS + ICE + SRTP) between client and server.
// Use:
// Handles negotiation, encryption, NAT traversal.

// One transport per direction per client is typical (send & receive).

//  Constraints/Assumptions:
// You must specify the server's public IP (listenIps) correctly.

// You may need announcedIp if you're behind NAT or using Docker.

//about Negotiate Capabilities
// This is the SDP exchange between client and server. It ensures both support the same codecs and formats.

//  Use:
// Client gets the router's RTP capabilities.

// Client sends its own capabilities and gets matched for streaming.

//  Constraints/Assumptions:
// Client must send its capabilities before producing or consuming media.

// Must match at least one codec to succeed.