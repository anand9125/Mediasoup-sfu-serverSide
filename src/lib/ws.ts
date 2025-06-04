import ws from 'ws';
import { createWorker } from "./worker"


let mediasoupRouter;

export const WebSocketConnection = async(wss:ws.Server)=>{
   try{
      mediasoupRouter= await createWorker();
   }
   catch(err){
     console.log(err)    
    }
    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            console.log(message);
        });
        ws.send('Hello World!');
    });

}
