import { Router } from "mediasoup/node/lib/RouterTypes";
import  {config} from "./config";

export const createWebRtpTranport = async (mediasoupRouter:Router)=>{
    const {
        maxIncomingBitrate,
        initialAvailableOutgoingBitrate,
       } = config.mediasoup.webRtcTransport;

    

    const transport = await mediasoupRouter.createWebRtcTransport({
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate,    //Initial available bitrate for outgoing media.
       
    })
    if(maxIncomingBitrate){
        try{
            await transport.setMaxIncomingBitrate(maxIncomingBitrate);
        }
        catch(err){
            console.log(err)
        }
    }
    return {
        transport,
        params:{
            id:transport.id,
            iceParameters:transport.iceParameters,
            iceCandidates:transport.iceCandidates,
            dtlsParameters:transport.dtlsParameters,

        }
    }
}

//  function (createWebRtpTranport ) Its creates a WebRTC transport on the Mediasoup router (mediasoupRouter).
// Returns:
// transport: a WebRtcTransport object created by Mediasoup.
// params: an object with the required transport info (ICE, DTLS, etc.) needed by the client.

