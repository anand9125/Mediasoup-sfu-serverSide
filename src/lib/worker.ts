import * as mediasoup from "mediasoup";
import { Worker } from 'mediasoup/node/lib/WorkerTypes';
import { config } from './config';
import { Router,  } from 'mediasoup/node/lib/RouterTypes';

const worker:Array<{
    worker:Worker
    router:Router
}> = [];

let nextMediasoupWorkerIdx = 0;

export const createWorker = async () => {
    const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    worker.on('died', () => {
        console.error('mediasoup worker died exiting in 2 second ...[pid:&id]',worker.pid);
        setTimeout(() => process.exit(1), 2000);
    });

    const mediaCodecs = config.mediasoup.router.mediaCodes;
    const mediasoupRouter = await worker.createRouter({ mediaCodecs });
    return mediasoupRouter;
}   


//about worker 
//A Worker is a separate process responsible for handling media at a low level using C++ bindings. 
// Think of it as a dedicated CPU unit that manages actual audio/video packets.

// Use:
// Manages performance (you can create multiple workers to use multiple CPU cores).

// All media traffic (RTP, DTLS, ICE, etc.) goes through this.