import * as React from "react";
export function Switch({ id, defaultChecked }:{ id?:string; defaultChecked?:boolean }){
  const [on, setOn] = React.useState(!!defaultChecked);
  return (
    <button id={id} onClick={()=>setOn(v=>!v)} className={`h-6 w-11 rounded-full transition ${on? "bg-primary":"bg-muted"} relative`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${on? "left-6":"left-1"}`}/>
    </button>
  );
}
