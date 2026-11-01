import { useState, type ComponentProps } from 'react';
import VideoWorkshop from './VideoWorkshop';
import LoopWorkshop from './LoopWorkshop';
export default function MotionWorkshop(props:ComponentProps<typeof VideoWorkshop>){
 const [mode,setMode]=useState<'loop'|'theatre'>('loop');
 const [switching,setSwitching]=useState(false);
 async function change(next:typeof mode){if(switching||next===mode)return;setSwitching(true);try{await props.saveBeforeLeave.current?.();setMode(next);}catch(e){props.notify((e as Error).message,'error');}finally{setSwitching(false);}}
 return <><div className="segmented motion-mode" aria-label="动态制作方式"><button className={mode==='loop'?'active':''} disabled={switching} onClick={()=>void change('loop')}>循环 GIF</button><button className={mode==='theatre'?'active':''} disabled={switching} onClick={()=>void change('theatre')}>剧情小剧场</button></div>{mode==='loop'?<LoopWorkshop {...props}/>:<VideoWorkshop {...props}/>}</>;
}
